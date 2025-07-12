#!/usr/bin/env tsx

import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Rate limiter implementation (same as ImageService)
class RateLimiter {
  private requestTimestamps: number[] = []
  private queue: Array<{
    task: () => Promise<any>
    resolve: (value: any) => void
    reject: (reason: any) => void
  }> = []
  private isProcessingQueue = false
  private readonly maxRequestsPerMinute: number
  private readonly windowMs: number = 60000 // 1 minute in milliseconds

  constructor(maxRequestsPerMinute: number) {
    this.maxRequestsPerMinute = maxRequestsPerMinute
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    // Clean up old timestamps
    const now = Date.now()
    this.requestTimestamps = this.requestTimestamps.filter((timestamp) => now - timestamp < this.windowMs)

    // Check if we're under the rate limit
    if (this.requestTimestamps.length < this.maxRequestsPerMinute) {
      // We can execute immediately
      this.requestTimestamps.push(now)
      return task()
    } else {
      // We need to queue the request
      return new Promise<T>((resolve, reject) => {
        this.queue.push({
          task: task as () => Promise<any>,
          resolve,
          reject,
        })

        // Start processing the queue if not already doing so
        if (!this.isProcessingQueue) {
          this.processQueue()
        }
      })
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessingQueue = false
      return
    }

    this.isProcessingQueue = true

    // Calculate time until next slot is available
    const now = Date.now()
    const oldestTimestamp = this.requestTimestamps[0]
    const timeUntilNextSlot = Math.max(0, this.windowMs - (now - oldestTimestamp))

    // Wait until we can process the next request
    await new Promise((resolve) => setTimeout(resolve, timeUntilNextSlot))

    // Process the next request
    const nextRequest = this.queue.shift()
    if (nextRequest) {
      this.requestTimestamps.push(Date.now())
      this.requestTimestamps.sort((a, b) => a - b) // Keep timestamps sorted

      try {
        const result = await nextRequest.task()
        nextRequest.resolve(result)
      } catch (error) {
        nextRequest.reject(error)
      }
    }

    // Continue processing the queue
    this.processQueue()
  }

  // Get current queue length for monitoring
  getQueueLength(): number {
    return this.queue.length
  }

  // Get current rate (requests in the last minute)
  getCurrentRate(): number {
    const now = Date.now()
    return this.requestTimestamps.filter((timestamp) => now - timestamp < this.windowMs).length
  }

  // Get status for monitoring
  getStatus() {
    return {
      currentRate: this.getCurrentRate(),
      queueLength: this.getQueueLength(),
      maxRate: this.maxRequestsPerMinute,
    }
  }
}

// Create a rate limiter instance with 29 requests per minute (same as ImageService)
const geminiRateLimiter = new RateLimiter(29)

interface ProductToProcess {
  id: string
  name: string
  description: string
  tags: string[]
  categoryId: string
  categoryName: string
}

interface CollectionSuggestion {
  productId: string
  currentInfo: {
    name: string
    description: string
    tags: string[]
    category: string
  }
  suggestedCollection: {
    name: string
    id: string
    confidence: 'high' | 'medium' | 'low'
    reasoning: string
  }
  categoryChange?: {
    from: string
    to: string
    reason: string
  }
}

interface UncategorizedProduct {
  id: string
  name: string
  description: string
  tags: string[]
  category: string
  reason: 'no_collections_available' | 'ai_suggested_none' | 'ai_suggested_invalid' | 'processing_error'
  details?: string
  timestamp: string
}

interface ProcessingResult {
  totalProducts: number
  processedProducts: number
  suggestions: CollectionSuggestion[]
  errors: string[]
  uncategorized: UncategorizedProduct[]
}

class ProductCollectionAssigner {
  private prisma: PrismaClient
  private dryRun: boolean
  private genAI: GoogleGenerativeAI

  constructor(dryRun: boolean = true) {
    this.prisma = new PrismaClient()
    this.dryRun = dryRun
    
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY or GOOGLE_API_KEY environment variable is required')
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }

  // Get rate limiter status for monitoring
  getRateLimitStatus() {
    return geminiRateLimiter.getStatus()
  }

  private async saveUncategorizedProducts(uncategorized: UncategorizedProduct[]): Promise<void> {
    if (uncategorized.length === 0) {
      console.log('📝 No uncategorized products to save')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `uncategorized-products-${timestamp}.json`
    const filePath = path.join('scripts', filename)

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalUncategorized: uncategorized.length,
        summary: {
          no_collections_available: uncategorized.filter(p => p.reason === 'no_collections_available').length,
          ai_suggested_none: uncategorized.filter(p => p.reason === 'ai_suggested_none').length,
          ai_suggested_invalid: uncategorized.filter(p => p.reason === 'ai_suggested_invalid').length,
          processing_error: uncategorized.filter(p => p.reason === 'processing_error').length
        },
        categoriesWithIssues: [...new Set(uncategorized.map(p => p.category))].sort()
      },
      uncategorized: uncategorized.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    }

    try {
      await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8')
      console.log(`📝 Saved ${uncategorized.length} uncategorized products to: ${filename}`)
      console.log(`📊 Breakdown:`)
      console.log(`   - No collections available: ${report.metadata.summary.no_collections_available}`)
      console.log(`   - AI suggested none: ${report.metadata.summary.ai_suggested_none}`)
      console.log(`   - AI suggested invalid: ${report.metadata.summary.ai_suggested_invalid}`)
      console.log(`   - Processing errors: ${report.metadata.summary.processing_error}`)
    } catch (error) {
      console.error(`❌ Error saving uncategorized products:`, error)
    }
  }

  async getProductsWithoutCollections(): Promise<ProductToProcess[]> {
    console.log('🔍 Fetching products without collections...')
    
    // Limit to 10 products for dry run testing
    const limit = this.dryRun ? 10 : undefined
    
    const products = await this.prisma.product.findMany({
      where: {
        collectionId: null
      },
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        categoryId: true,
        Category: {
          select: {
            name: true
          }
        }
      },
      take: limit,
      orderBy: {
        createdAt: 'desc' // Get most recent products for testing
      }
    })

    if (this.dryRun && products.length > 0) {
      console.log(`🧪 DRY RUN: Limited to ${products.length} products for testing`)
    }

    return products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tags: p.tags,
      categoryId: p.categoryId,
      categoryName: p.Category.name
    }))
  }

  async getAvailableCollections(): Promise<Record<string, Array<{id: string, name: string}>>> {
    console.log('📚 Fetching available collections...')
    
    const collections = await this.prisma.collection.findMany({
      select: {
        id: true,
        name: true,
        Category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const collectionsByCategory: Record<string, Array<{id: string, name: string}>> = {}
    
    collections.forEach(collection => {
      const categoryName = collection.Category.name
      if (!collectionsByCategory[categoryName]) {
        collectionsByCategory[categoryName] = []
      }
      collectionsByCategory[categoryName].push({
        id: collection.id,
        name: collection.name
      })
    })

    return collectionsByCategory
  }

  async getAllCollectionsFlat(): Promise<Array<{id: string, name: string, category: string, categoryId: string}>> {
    const collections = await this.prisma.collection.findMany({
      select: {
        id: true,
        name: true,
        Category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      category: collection.Category.name,
      categoryId: collection.Category.id
    }))
  }

  private async suggestCollectionForProduct(
    product: ProductToProcess,
    availableCollections: Record<string, Array<{id: string, name: string}>>,
    uncategorized: UncategorizedProduct[]
  ): Promise<CollectionSuggestion | null> {
    
    const categoryCollections = availableCollections[product.categoryName] || []
    const allCollections = await this.getAllCollectionsFlat()
    
    if (categoryCollections.length === 0) {
      console.log(`⚠️  No collections available for category: ${product.categoryName}`)
      uncategorized.push({
        id: product.id,
        name: product.name,
        description: product.description,
        tags: product.tags,
        category: product.categoryName,
        reason: 'no_collections_available',
        details: `Category "${product.categoryName}" has no collections`,
        timestamp: new Date().toISOString()
      })
      return null
    }

    const collectionsText = categoryCollections.map(c => c.name).join(', ')
    const allCollectionsByCategory = allCollections.reduce((acc, col) => {
      if (!acc[col.category]) acc[col.category] = []
      acc[col.category].push(col.name)
      return acc
    }, {} as Record<string, string[]>)
    
    const prompt = `Analiza el siguiente producto y sugiere la colección más apropiada:

PRODUCTO A ANALIZAR:
- Nombre: ${product.name}
- Descripción: ${product.description}
- Tags: ${product.tags.join(', ')}
- Categoría actual: ${product.categoryName}

COLECCIONES DISPONIBLES EN LA CATEGORÍA ACTUAL (${product.categoryName}):
${collectionsText}

TODAS LAS COLECCIONES DISPONIBLES POR CATEGORÍA:
${Object.entries(allCollectionsByCategory).map(([cat, cols]) => `${cat}: [${cols.join(', ')}]`).join('\n')}

Por favor, responde SOLO con un objeto JSON que contenga:
{
  "coleccion": "nombre_de_la_coleccion_sugerida",
  "categoria": "categoria_donde_está_la_colección", 
  "confianza": "high|medium|low",
  "razonamiento": "breve explicación de por qué esta colección es apropiada",
  "cambio_categoria": true/false
}

INSTRUCCIONES: 
1. Primero revisa si alguna colección de la categoría actual es apropiada
2. Si no, busca en TODAS las categorías la colección más apropiada
3. Si encuentras una mejor colección en otra categoría, marca "cambio_categoria": true
4. Si realmente no hay ninguna apropiada, sugiere "ninguna" como colección y "cambio_categoria": false`

    // Use the rate limiter to control API calls to Gemini (same as ImageService)
    return geminiRateLimiter.execute(async () => {
      try {
        console.log(`🤖 Analyzing product: ${product.name} (${product.categoryName})`)
        const rateLimitStatus = this.getRateLimitStatus()
        console.log(`   📊 Rate limiter status: ${rateLimitStatus.currentRate}/${rateLimitStatus.maxRate} requests, queue: ${rateLimitStatus.queueLength}`)
        
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })
        const result = await model.generateContent([prompt])
        const response = await result.response
        const responseText = response.text()

        // Clean the response
        let jsonString = responseText.trim()
        
        // Remove markdown code blocks if present
        if (jsonString.includes('```')) {
          const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
          if (match && match[1]) {
            jsonString = match[1].trim()
          } else {
            jsonString = jsonString.replace(/```json|```/g, '').trim()
          }
        }

        const aiResponse = JSON.parse(jsonString)
        
        // Handle "ninguna" response
        if (aiResponse.coleccion === 'ninguna') {
          console.log(`⚠️  AI couldn't find appropriate collection for ${product.name}`)
          uncategorized.push({
            id: product.id,
            name: product.name,
            description: product.description,
            tags: product.tags,
            category: product.categoryName,
            reason: 'ai_suggested_none',
            details: `AI couldn't find appropriate collection in any category. AI reasoning: ${aiResponse.razonamiento || 'No reasoning provided'}`,
            timestamp: new Date().toISOString()
          })
          return null
        }

        // Find the collection (could be in current category or another category)
        let suggestedCollection
        let targetCategory = product.categoryName
        
        if (aiResponse.cambio_categoria && aiResponse.categoria) {
          // Look for collection in the suggested category
          targetCategory = aiResponse.categoria
          const targetCategoryCollections = availableCollections[targetCategory] || []
          suggestedCollection = targetCategoryCollections.find(c => 
            c.name.toLowerCase() === aiResponse.coleccion.toLowerCase()
          )
        } else {
          // Look in current category first
          suggestedCollection = categoryCollections.find(c => 
            c.name.toLowerCase() === aiResponse.coleccion.toLowerCase()
          )
        }

        // If not found in expected category, search in all collections
        if (!suggestedCollection) {
          const foundCollection = allCollections.find(c => 
            c.name.toLowerCase() === aiResponse.coleccion.toLowerCase()
          )
          if (foundCollection) {
            suggestedCollection = { id: foundCollection.id, name: foundCollection.name }
            targetCategory = foundCollection.category
            aiResponse.cambio_categoria = true
          }
        }

        if (!suggestedCollection) {
          console.log(`⚠️  AI suggested "${aiResponse.coleccion}" but it's not found in any category`)
          uncategorized.push({
            id: product.id,
            name: product.name,
            description: product.description,
            tags: product.tags,
            category: product.categoryName,
            reason: 'ai_suggested_invalid',
            details: `AI suggested "${aiResponse.coleccion}" in category "${aiResponse.categoria || 'unknown'}" but collection not found`,
            timestamp: new Date().toISOString()
          })
          return null
        }

        const categoryChange = aiResponse.cambio_categoria ? {
          from: product.categoryName,
          to: targetCategory,
          reason: `AI determined product belongs in "${targetCategory}" category for collection "${aiResponse.coleccion}"`
        } : undefined

        if (categoryChange) {
          console.log(`🔄 Category change suggested: "${product.name}" ${categoryChange.from} → ${categoryChange.to}`)
        }

        return {
          productId: product.id,
          currentInfo: {
            name: product.name,
            description: product.description,
            tags: product.tags,
            category: product.categoryName
          },
          suggestedCollection: {
            name: suggestedCollection.name,
            id: suggestedCollection.id,
            confidence: aiResponse.confianza,
            reasoning: aiResponse.razonamiento
          },
          categoryChange
        }

      } catch (error) {
        console.error(`❌ Error processing product ${product.name}:`, error)
        uncategorized.push({
          id: product.id,
          name: product.name,
          description: product.description,
          tags: product.tags,
          category: product.categoryName,
          reason: 'processing_error',
          details: `Error during processing: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString()
        })
        return null
      }
    })
  }

  async processProducts(): Promise<ProcessingResult> {
    console.log('🚀 Starting product collection assignment...\n')

    const products = await this.getProductsWithoutCollections()
    const availableCollections = await this.getAvailableCollections()

    console.log(`📊 Found ${products.length} products without collections`)
    console.log(`📚 Available collections across ${Object.keys(availableCollections).length} categories\n`)

    const suggestions: CollectionSuggestion[] = []
    const errors: string[] = []
    const uncategorized: UncategorizedProduct[] = []
    let processedCount = 0

    for (const product of products) {
      try {
        const suggestion = await this.suggestCollectionForProduct(product, availableCollections, uncategorized)
        
        if (suggestion) {
          suggestions.push(suggestion)
          processedCount++
        } else {
          errors.push(`Could not suggest collection for product: ${product.name}`)
        }
        
      } catch (error) {
        const errorMsg = `Error processing product ${product.name}: ${error}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
        uncategorized.push({
          id: product.id,
          name: product.name,
          description: product.description,
          tags: product.tags,
          category: product.categoryName,
          reason: 'processing_error',
          details: `Unexpected error in processProducts: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString()
        })
      }
    }

    return {
      totalProducts: products.length,
      processedProducts: processedCount,
      suggestions,
      errors,
      uncategorized
    }
  }

  private printResults(result: ProcessingResult) {
    console.log('\n' + '='.repeat(60))
    console.log(`📊 COLLECTION ASSIGNMENT SUMMARY (${this.dryRun ? 'DRY RUN' : 'APPLIED'})`)
    console.log('='.repeat(60))
    
    console.log(`Total products without collections: ${result.totalProducts}`)
    console.log(`Successfully processed: ${result.processedProducts}`)
    console.log(`Uncategorized: ${result.uncategorized.length}`)
    console.log(`Errors: ${result.errors.length}\n`)

    if (result.suggestions.length > 0) {
      console.log('📋 SUGGESTED ASSIGNMENTS:')
      console.log('-'.repeat(40))
      
      // Group by category for better readability
      const suggestionsByCategory: Record<string, CollectionSuggestion[]> = {}
      
      result.suggestions.forEach(suggestion => {
        const category = suggestion.currentInfo.category
        if (!suggestionsByCategory[category]) {
          suggestionsByCategory[category] = []
        }
        suggestionsByCategory[category].push(suggestion)
      })

      Object.entries(suggestionsByCategory).forEach(([category, suggestions]) => {
        console.log(`\n📁 ${category}:`)
        suggestions.forEach(suggestion => {
          const confidence = suggestion.suggestedCollection.confidence
          const confidenceIcon = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴'
          
          console.log(`  ${confidenceIcon} ${suggestion.currentInfo.name}`)
          console.log(`    → ${suggestion.suggestedCollection.name}`)
          console.log(`    Confidence: ${confidence}`)
          console.log(`    Reasoning: ${suggestion.suggestedCollection.reasoning}`)
          if (suggestion.categoryChange) {
            console.log(`    🔄 Category Change: ${suggestion.categoryChange.from} → ${suggestion.categoryChange.to}`)
            console.log(`    📝 Change Reason: ${suggestion.categoryChange.reason}`)
          }
          console.log(`    Tags: [${suggestion.currentInfo.tags.join(', ')}]`)
          console.log()
        })
      })
    }

    if (result.uncategorized.length > 0) {
      console.log('⚠️  UNCATEGORIZED PRODUCTS:')
      console.log('-'.repeat(40))
      const uncategorizedByReason = result.uncategorized.reduce((acc, product) => {
        if (!acc[product.reason]) acc[product.reason] = []
        acc[product.reason].push(product)
        return acc
      }, {} as Record<string, UncategorizedProduct[]>)

      Object.entries(uncategorizedByReason).forEach(([reason, products]) => {
        const reasonEmoji = {
          'no_collections_available': '📂',
          'ai_suggested_none': '🤖',
          'ai_suggested_invalid': '❓',
          'processing_error': '❌'
        }[reason] || '⚠️'
        
        const reasonLabel = {
          'no_collections_available': 'No collections available',
          'ai_suggested_none': 'AI suggested none',
          'ai_suggested_invalid': 'AI suggested invalid collection',
          'processing_error': 'Processing error'
        }[reason] || reason

        console.log(`\n${reasonEmoji} ${reasonLabel}: ${products.length} products`)
        
        // Show first few examples
        products.slice(0, 5).forEach(product => {
          console.log(`  • "${product.name}" (${product.category})`)
        })
        if (products.length > 5) {
          console.log(`  ... and ${products.length - 5} more`)
        }
      })
      console.log()
    }

    if (result.errors.length > 0) {
      console.log('❌ ERRORS:')
      console.log('-'.repeat(40))
      result.errors.forEach(error => {
        console.log(`  • ${error}`)
      })
      console.log()
    }

    console.log('='.repeat(60))
    
    if (this.dryRun) {
      console.log('💡 This was a DRY RUN. To apply these changes, run with --apply flag.')
    } else {
      console.log('✅ Collection assignments have been applied to the database.')
    }
  }

  async applyAssignments(suggestions: CollectionSuggestion[]): Promise<void> {
    if (this.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No assignments will be applied.')
      return
    }

    console.log('\n🔧 Applying collection assignments to database...')
    
    try {
      let appliedCount = 0
      let categoryChanges = 0
      
      for (const suggestion of suggestions) {
        if (suggestion.categoryChange) {
          console.log(`  🔄 "${suggestion.currentInfo.name}": ${suggestion.categoryChange.from} → ${suggestion.categoryChange.to}`)
          
          // Get the target category ID
          const targetCategory = await this.prisma.category.findFirst({
            where: { name: suggestion.categoryChange.to }
          })
          
          if (!targetCategory) {
            console.error(`❌ Target category "${suggestion.categoryChange.to}" not found`)
            continue
          }
          
          // Update both category and collection
          await this.prisma.product.update({
            where: { id: suggestion.productId },
            data: { 
              categoryId: targetCategory.id,
              collectionId: suggestion.suggestedCollection.id 
            }
          })
          
          categoryChanges++
        } else {
          console.log(`  📄 Assigning "${suggestion.currentInfo.name}" → ${suggestion.suggestedCollection.name}`)
          
          // Update only collection
          await this.prisma.product.update({
            where: { id: suggestion.productId },
            data: { collectionId: suggestion.suggestedCollection.id }
          })
        }
        
        appliedCount++
      }

      console.log(`\n✅ Successfully applied ${appliedCount} assignments!`)
      if (categoryChanges > 0) {
        console.log(`🔄 Category changes: ${categoryChanges}`)
      }
      
    } catch (error) {
      console.error('\n❌ Error applying assignments:', error)
      throw error
    }
  }

  async run(): Promise<void> {
    try {
      console.log('🔄 Initial rate limiter status:', this.getRateLimitStatus())
      
      const result = await this.processProducts()
      
      console.log('🔄 Final rate limiter status:', this.getRateLimitStatus())
      
      // Save uncategorized products to JSON file
      await this.saveUncategorizedProducts(result.uncategorized)
      
      this.printResults(result)
      
      if (result.suggestions.length === 0) {
        console.log('\n🎉 No products need collection assignment!')
        return
      }

      await this.applyAssignments(result.suggestions)
      
    } catch (error) {
      console.error('❌ Error during collection assignment:', error)
      throw error
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = !args.includes('--apply')
  
  console.log(`🚀 Starting product collection assignment...`)
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : '🔧 APPLY CHANGES'}\n`)
  
  const assigner = new ProductCollectionAssigner(isDryRun)
  
  try {
    await assigner.run()
    
    if (isDryRun) {
      console.log('\n💡 To apply these assignments, run: npm run assign-collections -- --apply')
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  } finally {
    await assigner.disconnect()
  }
}

if (require.main === module) {
  main()
} 
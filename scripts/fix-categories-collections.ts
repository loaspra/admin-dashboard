#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

interface ObservacionItem {
  "Categoría": string
  "Subcategoría": string
  "Cantidad de Diseños": number
  "Observaciones": string
}

interface NameChange {
  id: string
  currentName: string
  expectedName: string
  type: 'category' | 'collection'
  categoryName?: string // For collections, to show which category they belong to
}

interface FixResult {
  categoryChanges: NameChange[]
  collectionChanges: NameChange[]
  totalChanges: number
}

class DatabaseFixer {
  private prisma: PrismaClient
  private dryRun: boolean
  
  constructor(dryRun: boolean = true) {
    this.prisma = new PrismaClient()
    this.dryRun = dryRun
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }

  private normalizeForComparison(str: string): string {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .trim()
  }

  private findBestMatch(currentName: string, expectedNames: string[]): string | null {
    const normalizedCurrent = this.normalizeForComparison(currentName)
    
    // Try exact match first (after normalization)
    for (const expected of expectedNames) {
      if (this.normalizeForComparison(expected) === normalizedCurrent) {
        return expected
      }
    }

    // Try partial matches
    for (const expected of expectedNames) {
      const normalizedExpected = this.normalizeForComparison(expected)
      if (normalizedCurrent.includes(normalizedExpected) || normalizedExpected.includes(normalizedCurrent)) {
        return expected
      }
    }

    return null
  }

  async analyzeCategoriesAndCollections(): Promise<FixResult> {
    console.log('🔍 Analyzing categories and collections for fixes...\n')
    
    // Read observaciones file
    const observacionesPath = path.join(process.cwd(), 'observaciones_09-06-2025.tsv')
    const observacionesContent = fs.readFileSync(observacionesPath, 'utf-8')
    const observaciones: ObservacionItem[] = JSON.parse(observacionesContent)
    
    // Extract expected names
    const expectedCategories = new Set<string>()
    const expectedCollections = new Map<string, Set<string>>()
    
    observaciones.forEach(item => {
      const category = item["Categoría"]
      const collection = item["Subcategoría"]
      
      expectedCategories.add(category)
      
      if (!expectedCollections.has(category)) {
        expectedCollections.set(category, new Set())
      }
      expectedCollections.get(category)!.add(collection)
    })

    // Fetch current database data
    const dbCategories = await this.prisma.category.findMany({
      select: { id: true, name: true }
    })
    
    const dbCollections = await this.prisma.collection.findMany({
      select: { 
        id: true,
        name: true,
        Category: {
          select: { name: true }
        }
      }
    })

    const categoryChanges: NameChange[] = []
    const collectionChanges: NameChange[] = []

    // Analyze categories
    console.log('📁 Analyzing categories...')
    const expectedCategoriesArray = Array.from(expectedCategories)
    
    for (const dbCategory of dbCategories) {
      const bestMatch = this.findBestMatch(dbCategory.name, expectedCategoriesArray)
      
      if (bestMatch && bestMatch !== dbCategory.name) {
        categoryChanges.push({
          id: dbCategory.id,
          currentName: dbCategory.name,
          expectedName: bestMatch,
          type: 'category'
        })
      }
    }

    // Analyze collections
    console.log('📄 Analyzing collections...')
    
    for (const dbCollection of dbCollections) {
      const categoryName = dbCollection.Category.name
      
      // First, try to find what the category should be called
      const expectedCategoryName = this.findBestMatch(categoryName, expectedCategoriesArray)
      
      if (expectedCategoryName) {
        const expectedCollectionsForCategory = expectedCollections.get(expectedCategoryName)
        
        if (expectedCollectionsForCategory) {
          const expectedCollectionsArray = Array.from(expectedCollectionsForCategory)
          const bestMatch = this.findBestMatch(dbCollection.name, expectedCollectionsArray)
          
          if (bestMatch && bestMatch !== dbCollection.name) {
            collectionChanges.push({
              id: dbCollection.id,
              currentName: dbCollection.name,
              expectedName: bestMatch,
              type: 'collection',
              categoryName: expectedCategoryName
            })
          }
        }
      }
    }

    return {
      categoryChanges,
      collectionChanges,
      totalChanges: categoryChanges.length + collectionChanges.length
    }
  }

  private printChanges(result: FixResult) {
    console.log('\n' + '='.repeat(60))
    console.log(`📊 CHANGES SUMMARY (${this.dryRun ? 'DRY RUN' : 'APPLYING CHANGES'})`)
    console.log('='.repeat(60))
    
    console.log(`Total changes to apply: ${result.totalChanges}`)
    console.log(`  • Categories: ${result.categoryChanges.length}`)
    console.log(`  • Collections: ${result.collectionChanges.length}\n`)

    if (result.categoryChanges.length > 0) {
      console.log('📁 CATEGORY CHANGES:')
      console.log('-'.repeat(40))
      
      result.categoryChanges.forEach(change => {
        console.log(`  ${change.id}`)
        console.log(`  - ${change.currentName}`)
        console.log(`  + ${change.expectedName}`)
        console.log()
      })
    }

    if (result.collectionChanges.length > 0) {
      console.log('📄 COLLECTION CHANGES:')
      console.log('-'.repeat(40))
      
      const groupedByCategory = result.collectionChanges.reduce((acc, change) => {
        const key = change.categoryName || 'Unknown'
        if (!acc[key]) acc[key] = []
        acc[key].push(change)
        return acc
      }, {} as Record<string, NameChange[]>)

      Object.entries(groupedByCategory).forEach(([categoryName, changes]) => {
        console.log(`\n  📁 ${categoryName}:`)
        changes.forEach(change => {
          console.log(`    ${change.id}`)
          console.log(`    - ${change.currentName}`)
          console.log(`    + ${change.expectedName}`)
          console.log()
        })
      })
    }

    console.log('='.repeat(60))
    
    if (this.dryRun) {
      console.log('💡 This was a DRY RUN. To apply these changes, run with --apply flag.')
    } else {
      console.log('✅ Changes have been applied to the database.')
    }
  }

  async applyChanges(result: FixResult): Promise<void> {
    if (this.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be applied.')
      return
    }

    console.log('\n🔧 Applying changes to database...')
    
    try {
      // Apply changes with a longer timeout and in smaller batches
      await this.prisma.$transaction(async (tx) => {
        // Apply category changes
        for (const change of result.categoryChanges) {
          console.log(`  📁 Updating category: ${change.currentName} → ${change.expectedName}`)
          
          await tx.category.update({
            where: { id: change.id },
            data: { name: change.expectedName }
          })
        }

        // Apply collection changes
        for (const change of result.collectionChanges) {
          console.log(`  📄 Updating collection: ${change.currentName} → ${change.expectedName}`)
          
          await tx.collection.update({
            where: { id: change.id },
            data: { name: change.expectedName }
          })
        }
      }, {
        maxWait: 20000, // 20 seconds
        timeout: 60000  // 60 seconds
      })

      console.log('\n✅ All changes applied successfully!')
      
    } catch (error) {
      console.error('\n❌ Error applying changes:', error)
      throw error
    }
  }

  async run(): Promise<void> {
    try {
      const result = await this.analyzeCategoriesAndCollections()
      
      this.printChanges(result)
      
      if (result.totalChanges === 0) {
        console.log('\n🎉 No changes needed! Everything is already correct.')
        return
      }

      await this.applyChanges(result)
      
    } catch (error) {
      console.error('❌ Error during database fixing:', error)
      throw error
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = !args.includes('--apply')
  
  console.log(`🚀 Starting database fix process...`)
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : '🔧 APPLY CHANGES'}\n`)
  
  const fixer = new DatabaseFixer(isDryRun)
  
  try {
    await fixer.run()
    
    if (isDryRun) {
      console.log('\n💡 To apply these changes, run: npm run fix-db --apply')
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  } finally {
    await fixer.disconnect()
  }
}

if (require.main === module) {
  main()
} 
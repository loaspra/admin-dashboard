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

interface StructuralChange {
  type: 'rename_category' | 'rename_collection' | 'create_category' | 'create_collection' | 'delete_item'
  entityType: 'category' | 'collection'
  id?: string
  currentName?: string
  newName?: string
  categoryId?: string
  categoryName?: string
  description?: string
}

interface StructuralFixResult {
  changes: StructuralChange[]
  totalChanges: number
}

class StructuralFixer {
  private prisma: PrismaClient
  private dryRun: boolean
  private nextCategoryId: number = 1
  private nextCollectionId: number = 1
  
  constructor(dryRun: boolean = true) {
    this.prisma = new PrismaClient()
    this.dryRun = dryRun
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }

  private async initializeIdCounters() {
    // Get all existing category IDs and find the highest number
    const categories = await this.prisma.category.findMany({
      select: { id: true }
    })
    
    const collections = await this.prisma.collection.findMany({
      select: { id: true }
    })

    // Extract numbers from category IDs (cat_XXX format)
    const categoryNumbers = categories
      .map(c => {
        const match = c.id.match(/^cat_(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(num => !isNaN(num))

    // Extract numbers from collection IDs (col_XXX format)
    const collectionNumbers = collections
      .map(c => {
        const match = c.id.match(/^col_(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(num => !isNaN(num))

    // Set next IDs to be one higher than the current maximum
    this.nextCategoryId = categoryNumbers.length > 0 ? Math.max(...categoryNumbers) + 1 : 1
    this.nextCollectionId = collectionNumbers.length > 0 ? Math.max(...collectionNumbers) + 1 : 1

    console.log(`📊 ID Counters initialized:`)
    console.log(`   📁 Next category ID: cat_${this.nextCategoryId.toString().padStart(3, '0')}`)
    console.log(`   📄 Next collection ID: col_${this.nextCollectionId.toString().padStart(3, '0')}`)
  }

  private generateCategoryId(): string {
    const id = `cat_${this.nextCategoryId.toString().padStart(3, '0')}`
    this.nextCategoryId++
    return id
  }

  private generateCollectionId(): string {
    const id = `col_${this.nextCollectionId.toString().padStart(3, '0')}`
    this.nextCollectionId++
    return id
  }

  async analyzeStructuralChanges(): Promise<StructuralFixResult> {
    console.log('🔍 Analyzing structural discrepancies...\n')
    
    // Initialize ID counters
    await this.initializeIdCounters()
    console.log()
    
    // Read observaciones file
    const observacionesPath = path.join(process.cwd(), 'observaciones_09-06-2025.tsv')
    const observacionesContent = fs.readFileSync(observacionesPath, 'utf-8')
    const observaciones: ObservacionItem[] = JSON.parse(observacionesContent)
    
    // Extract expected data
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
        categoryId: true,
        Category: {
          select: { id: true, name: true }
        }
      }
    })

    const changes: StructuralChange[] = []

    // Define manual mappings for problematic renames
    const categoryRenames = new Map([
      ['dias festivos', 'Fechas festivas'],
      ['bestias prehistoricas', 'Criatuas prehistoricas']
    ])

    const collectionRenames = new Map([
      ['piscis', 'Picis'],
      ['house of dragon', 'House Of The Dragon'],
      ['estatuas', 'Esculturas'],
      ['security', 'Ciberseguridad'],
      ['capibara', 'Capybara'],
      ['stitch', 'Stich'],
      ['mamá', 'Dia de la Madre'],
      ['dinosarios', 'Dinosarios'] // This will move from bestias to criatuas
    ])

    // 1. Handle category renames
    for (const dbCategory of dbCategories) {
      if (categoryRenames.has(dbCategory.name)) {
        const newName = categoryRenames.get(dbCategory.name)!
        changes.push({
          type: 'rename_category',
          entityType: 'category',
          id: dbCategory.id,
          currentName: dbCategory.name,
          newName: newName
        })
      }
    }

    // 2. Create missing categories
    const dbCategoryNames = new Set(dbCategories.map(c => c.name))
    for (const expectedCategory of expectedCategories) {
      if (!dbCategoryNames.has(expectedCategory)) {
        // Check if it will be created by a rename
        const willBeCreatedByRename = Array.from(categoryRenames.values()).includes(expectedCategory)
        if (!willBeCreatedByRename) {
          changes.push({
            type: 'create_category',
            entityType: 'category',
            newName: expectedCategory,
            description: `Category for ${expectedCategory} designs`
          })
        }
      }
    }

    // 3. Handle collection renames
    for (const dbCollection of dbCollections) {
      if (collectionRenames.has(dbCollection.name)) {
        const newName = collectionRenames.get(dbCollection.name)!
        changes.push({
          type: 'rename_collection',
          entityType: 'collection',
          id: dbCollection.id,
          currentName: dbCollection.name,
          newName: newName,
          categoryName: dbCollection.Category.name
        })
      }
    }

    // 4. Handle collection moves (dinosarios from bestias prehistoricas to criatuas prehistoricas)
    const dinosariosCollection = dbCollections.find(c => c.name === 'dinosarios')
    if (dinosariosCollection) {
      changes.push({
        type: 'rename_collection',
        entityType: 'collection',
        id: dinosariosCollection.id,
        currentName: 'dinosarios (in bestias prehistoricas)',
        newName: 'Dinosarios (moved to Criatuas prehistoricas)',
        categoryName: 'will be moved after category rename'
      })
    }

    // 5. Create missing collections
    // We'll do this after renames to ensure we have the right category structure
    const missingCollections = [
      { category: 'Arte', collection: 'Esculturas' },
      { category: 'Automovilismo', collection: 'Formula 1' },
      { category: 'Caricaturas', collection: 'Capybara' },
      { category: 'Caricaturas', collection: 'Stich' },
      { category: 'Halloween', collection: 'Tatto' },
      { category: 'Memes', collection: 'Dogis' },
      { category: 'Mentalidad', collection: 'Dinero' },
      { category: 'Profesiones', collection: 'Ciberseguridad' },
      { category: 'Series TV', collection: 'Breaking Bad' },
      { category: 'Series TV', collection: 'House Of The Dragon' },
      { category: 'Zodiaco', collection: 'Picis' },
      { category: 'Naturaleza', collection: 'Mar' },
      { category: 'Fechas festivas', collection: 'Dia de la Madre' }
    ]

    for (const { category, collection } of missingCollections) {
      // Skip if this collection will be created by a rename
      if (!Array.from(collectionRenames.values()).includes(collection)) {
        changes.push({
          type: 'create_collection',
          entityType: 'collection',
          newName: collection,
          categoryName: category,
          description: `${collection} collection in ${category}`
        })
      }
    }

    // 6. Mark items for deletion (optional - we might want to keep extra items)
    // Note: template-sticker category is kept as it's a wildcard used for purchases
    const itemsToDelete = [
      { type: 'collection', name: 'todos', category: 'Zodiaco' },
      { type: 'collection', name: 'perros', category: 'Memes' }
    ]

    for (const item of itemsToDelete) {
      if (item.type === 'category') {
        const category = dbCategories.find(c => c.name === item.name)
        if (category) {
          changes.push({
            type: 'delete_item',
            entityType: 'category',
            id: category.id,
            currentName: item.name,
            newName: `DELETE: ${item.name}`
          })
        }
      } else {
        const collection = dbCollections.find(c => c.name === item.name && c.Category.name === item.category)
        if (collection) {
          changes.push({
            type: 'delete_item',
            entityType: 'collection',
            id: collection.id,
            currentName: item.name,
            newName: `DELETE: ${item.name}`,
            categoryName: item.category
          })
        }
      }
    }

    return {
      changes,
      totalChanges: changes.length
    }
  }

  private printChanges(result: StructuralFixResult) {
    console.log('\n' + '='.repeat(60))
    console.log(`📊 STRUCTURAL CHANGES SUMMARY (${this.dryRun ? 'DRY RUN' : 'APPLYING CHANGES'})`)
    console.log('='.repeat(60))
    
    console.log(`Total structural changes: ${result.totalChanges}\n`)

    const changesByType = result.changes.reduce((acc, change) => {
      if (!acc[change.type]) acc[change.type] = []
      acc[change.type].push(change)
      return acc
    }, {} as Record<string, StructuralChange[]>)

    Object.entries(changesByType).forEach(([type, changes]) => {
      console.log(`📋 ${type.toUpperCase().replace('_', ' ')}:`)
      console.log('-'.repeat(40))
      
      changes.forEach(change => {
        switch (change.type) {
          case 'rename_category':
            console.log(`  📁 ${change.id}`)
            console.log(`  - ${change.currentName}`)
            console.log(`  + ${change.newName}`)
            break
          case 'rename_collection':
            console.log(`  📄 ${change.id} (${change.categoryName})`)
            console.log(`  - ${change.currentName}`)
            console.log(`  + ${change.newName}`)
            break
          case 'create_category':
            console.log(`  📁 CREATE: ${change.newName}`)
            break
          case 'create_collection':
            console.log(`  📄 CREATE: ${change.newName} → ${change.categoryName}`)
            break
          case 'delete_item':
            console.log(`  🗑️  DELETE: ${change.currentName} (${change.entityType})`)
            break
        }
        console.log()
      })
    })

    console.log('='.repeat(60))
    
    if (this.dryRun) {
      console.log('💡 This was a DRY RUN. To apply these changes, run with --apply flag.')
    } else {
      console.log('✅ Structural changes have been applied to the database.')
    }
  }

  async applyChanges(result: StructuralFixResult): Promise<void> {
    if (this.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be applied.')
      return
    }

    console.log('\n🔧 Applying structural changes to database...')
    
    try {
      // Process changes in order: renames first, then creates, then deletes
      const orderedChanges = [
        ...result.changes.filter(c => c.type === 'rename_category'),
        ...result.changes.filter(c => c.type === 'rename_collection'),
        ...result.changes.filter(c => c.type === 'create_category'),
        ...result.changes.filter(c => c.type === 'create_collection'),
        ...result.changes.filter(c => c.type === 'delete_item')
      ]

      for (const change of orderedChanges) {
        await this.applyChange(change)
      }

      console.log('\n✅ All structural changes applied successfully!')
      
    } catch (error) {
      console.error('\n❌ Error applying structural changes:', error)
      throw error
    }
  }

  private async applyChange(change: StructuralChange): Promise<void> {
    switch (change.type) {
      case 'rename_category':
        console.log(`  📁 Renaming category: ${change.currentName} → ${change.newName}`)
        await this.prisma.category.update({
          where: { id: change.id },
          data: { name: change.newName }
        })
        break

      case 'rename_collection':
        console.log(`  📄 Renaming collection: ${change.currentName} → ${change.newName}`)
        await this.prisma.collection.update({
          where: { id: change.id },
          data: { name: change.newName }
        })
        break

      case 'create_category':
        const categoryId = this.generateCategoryId()
        console.log(`  📁 Creating category: ${change.newName} (${categoryId})`)
        await this.prisma.category.create({
          data: {
            id: categoryId,
            name: change.newName!,
            description: change.description
          }
        })
        break

      case 'create_collection':
        const collectionId = this.generateCollectionId()
        console.log(`  📄 Creating collection: ${change.newName} → ${change.categoryName} (${collectionId})`)
        
        // Find the category (might have been renamed)
        const category = await this.prisma.category.findFirst({
          where: { name: change.categoryName }
        })
        
        if (!category) {
          throw new Error(`Category "${change.categoryName}" not found for collection "${change.newName}"`)
        }
        
        await this.prisma.collection.create({
          data: {
            id: collectionId,
            name: change.newName!,
            categoryId: category.id,
            description: change.description
          }
        })
        break

      case 'delete_item':
        console.log(`  🗑️  Deleting ${change.entityType}: ${change.currentName}`)
        if (change.entityType === 'category') {
          await this.prisma.category.delete({
            where: { id: change.id }
          })
        } else {
          await this.prisma.collection.delete({
            where: { id: change.id }
          })
        }
        break
    }
  }

  async run(): Promise<void> {
    try {
      const result = await this.analyzeStructuralChanges()
      
      this.printChanges(result)
      
      if (result.totalChanges === 0) {
        console.log('\n🎉 No structural changes needed! Everything is already correct.')
        return
      }

      await this.applyChanges(result)
      
    } catch (error) {
      console.error('❌ Error during structural fixing:', error)
      throw error
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = !args.includes('--apply')
  
  console.log(`🚀 Starting structural discrepancy fix...`)
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : '🔧 APPLY CHANGES'}\n`)
  
  const fixer = new StructuralFixer(isDryRun)
  
  try {
    await fixer.run()
    
    if (isDryRun) {
      console.log('\n💡 To apply these changes, run: npm run fix-structure -- --apply')
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
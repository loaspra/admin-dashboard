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

interface ValidationResult {
  missingCategories: string[]
  missingCollections: { category: string, collection: string }[]
  extraCategories: string[]
  extraCollections: { category: string, collection: string }[]
  summary: {
    totalExpectedCategories: number
    totalExpectedCollections: number
    totalDbCategories: number
    totalDbCollections: number
    categoriesMatch: boolean
    collectionsMatch: boolean
  }
}

async function validateCategoriesAndCollections(): Promise<ValidationResult> {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Starting validation of categories and collections...\n')
    
    // Read and parse the observaciones file
    const observacionesPath = path.join(process.cwd(), 'observaciones_09-06-2025.tsv')
    const observacionesContent = fs.readFileSync(observacionesPath, 'utf-8')
    const observaciones: ObservacionItem[] = JSON.parse(observacionesContent)
    
    console.log(`📄 Loaded ${observaciones.length} entries from observaciones file`)
    
    // Extract expected categories and collections from observaciones
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
    
    console.log(`📊 Expected: ${expectedCategories.size} categories, ${Array.from(expectedCollections.values()).reduce((sum, set) => sum + set.size, 0)} collections`)
    
    // Fetch current database data
    const dbCategories = await prisma.category.findMany({
      select: { name: true }
    })
    
    const dbCollections = await prisma.collection.findMany({
      select: { 
        name: true,
        Category: {
          select: { name: true }
        }
      }
    })
    
    console.log(`🗄️  Database: ${dbCategories.length} categories, ${dbCollections.length} collections\n`)
    
    // Create sets for comparison
    const dbCategoryNames = new Set(dbCategories.map(c => c.name))
    const dbCollectionMap = new Map<string, Set<string>>()
    
    dbCollections.forEach(collection => {
      const categoryName = collection.Category.name
      if (!dbCollectionMap.has(categoryName)) {
        dbCollectionMap.set(categoryName, new Set())
      }
      dbCollectionMap.get(categoryName)!.add(collection.name)
    })
    
    // Find missing categories
    const missingCategories = Array.from(expectedCategories).filter(cat => !dbCategoryNames.has(cat))
    
    // Find extra categories
    const extraCategories = Array.from(dbCategoryNames).filter(cat => !expectedCategories.has(cat))
    
    // Find missing collections
    const missingCollections: { category: string, collection: string }[] = []
    expectedCollections.forEach((collections, category) => {
      const dbCollectionsForCategory = dbCollectionMap.get(category) || new Set()
      collections.forEach(collection => {
        if (!dbCollectionsForCategory.has(collection)) {
          missingCollections.push({ category, collection })
        }
      })
    })
    
    // Find extra collections
    const extraCollections: { category: string, collection: string }[] = []
    dbCollectionMap.forEach((collections, category) => {
      const expectedCollectionsForCategory = expectedCollections.get(category) || new Set()
      collections.forEach(collection => {
        if (!expectedCollectionsForCategory.has(collection)) {
          extraCollections.push({ category, collection })
        }
      })
    })
    
    const result: ValidationResult = {
      missingCategories,
      missingCollections,
      extraCategories,
      extraCollections,
      summary: {
        totalExpectedCategories: expectedCategories.size,
        totalExpectedCollections: Array.from(expectedCollections.values()).reduce((sum, set) => sum + set.size, 0),
        totalDbCategories: dbCategories.length,
        totalDbCollections: dbCollections.length,
        categoriesMatch: missingCategories.length === 0 && extraCategories.length === 0,
        collectionsMatch: missingCollections.length === 0 && extraCollections.length === 0
      }
    }
    
    return result
    
  } finally {
    await prisma.$disconnect()
  }
}

function printResults(result: ValidationResult) {
  console.log('=' .repeat(60))
  console.log('📋 VALIDATION SUMMARY')
  console.log('=' .repeat(60))
  
  const { summary } = result
  
  console.log(`Expected Categories: ${summary.totalExpectedCategories}`)
  console.log(`Database Categories: ${summary.totalDbCategories}`)
  console.log(`Categories Match: ${summary.categoriesMatch ? '✅' : '❌'}\n`)
  
  console.log(`Expected Collections: ${summary.totalExpectedCollections}`)
  console.log(`Database Collections: ${summary.totalDbCollections}`)
  console.log(`Collections Match: ${summary.collectionsMatch ? '✅' : '❌'}\n`)
  
  if (result.missingCategories.length > 0) {
    console.log('❌ MISSING CATEGORIES:')
    result.missingCategories.forEach(category => {
      console.log(`   • ${category}`)
    })
    console.log()
  }
  
  if (result.extraCategories.length > 0) {
    console.log('➕ EXTRA CATEGORIES (in DB but not in observaciones):')
    result.extraCategories.forEach(category => {
      console.log(`   • ${category}`)
    })
    console.log()
  }
  
  if (result.missingCollections.length > 0) {
    console.log('❌ MISSING COLLECTIONS:')
    const grouped = result.missingCollections.reduce((acc, { category, collection }) => {
      if (!acc[category]) acc[category] = []
      acc[category].push(collection)
      return acc
    }, {} as Record<string, string[]>)
    
    Object.entries(grouped).forEach(([category, collections]) => {
      console.log(`   📁 ${category}:`)
      collections.forEach(collection => {
        console.log(`      • ${collection}`)
      })
    })
    console.log()
  }
  
  if (result.extraCollections.length > 0) {
    console.log('➕ EXTRA COLLECTIONS (in DB but not in observaciones):')
    const grouped = result.extraCollections.reduce((acc, { category, collection }) => {
      if (!acc[category]) acc[category] = []
      acc[category].push(collection)
      return acc
    }, {} as Record<string, string[]>)
    
    Object.entries(grouped).forEach(([category, collections]) => {
      console.log(`   📁 ${category}:`)
      collections.forEach(collection => {
        console.log(`      • ${collection}`)
      })
    })
    console.log()
  }
  
  console.log('=' .repeat(60))
  
  if (summary.categoriesMatch && summary.collectionsMatch) {
    console.log('🎉 ALL GOOD! Database matches the observaciones file perfectly.')
  } else {
    console.log('⚠️  DISCREPANCIES FOUND! Please review the differences above.')
    
    if (result.missingCategories.length > 0 || result.missingCollections.length > 0) {
      console.log('\n💡 Consider running data migration scripts to add missing items.')
    }
  }
}

async function main() {
  try {
    const result = await validateCategoriesAndCollections()
    printResults(result)
    
    // Exit with error code if there are discrepancies
    if (!result.summary.categoriesMatch || !result.summary.collectionsMatch) {
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error during validation:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 
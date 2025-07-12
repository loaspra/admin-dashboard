#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Spanish zodiac signs mapping to their standardized names
const ZODIAC_SIGNS: Record<string, string> = {
  // Standard Spanish names (without accents)
  'aries': 'aries',
  'tauro': 'tauro',
  'geminis': 'geminis',
  'cancer': 'cancer',
  'leo': 'leo',
  'virgo': 'virgo',
  'libra': 'libra',
  'escorpio': 'escorpio',
  'sagitario': 'sagitario',
  'capricornio': 'capricornio',
  'acuario': 'acuario',
  'piscis': 'piscis',
  
  // Spanish names with accents/tildes
  'géminis': 'geminis', // With accent on é
  'cáncer': 'cancer', // With accent on á
  'león': 'leo', // With accent on ó
  
  // English variations
  'scorpio': 'escorpio',
  'gemini': 'geminis',
  'taurus': 'tauro',
  'aquarius': 'acuario',
  'capricorn': 'capricornio',
  'scorpius': 'escorpio',
  'sagittarius': 'sagitario',
  
  // Common variations and typos
  'escorpion': 'escorpio',
  'aquario': 'acuario', // Possible typo
};

// Function to normalize accents and special characters
function normalizeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase();
}

// Collection descriptions for each zodiac sign
const ZODIAC_DESCRIPTIONS: Record<string, string> = {
  'aries': 'Diseños inspirados en el signo zodiacal Aries (21 marzo - 19 abril)',
  'tauro': 'Diseños inspirados en el signo zodiacal Tauro (20 abril - 20 mayo)',
  'geminis': 'Diseños inspirados en el signo zodiacal Géminis (21 mayo - 20 junio)',
  'cancer': 'Diseños inspirados en el signo zodiacal Cáncer (21 junio - 22 julio)',
  'leo': 'Diseños inspirados en el signo zodiacal Leo (23 julio - 22 agosto)',
  'virgo': 'Diseños inspirados en el signo zodiacal Virgo (23 agosto - 22 septiembre)',
  'libra': 'Diseños inspirados en el signo zodiacal Libra (23 septiembre - 22 octubre)',
  'escorpio': 'Diseños inspirados en el signo zodiacal Escorpio (23 octubre - 21 noviembre)',
  'sagitario': 'Diseños inspirados en el signo zodiacal Sagitario (22 noviembre - 21 diciembre)',
  'capricornio': 'Diseños inspirados en el signo zodiacal Capricornio (22 diciembre - 19 enero)',
  'acuario': 'Diseños inspirados en el signo zodiacal Acuario (20 enero - 18 febrero)',
  'piscis': 'Diseños inspirados en el signo zodiacal Piscis (19 febrero - 20 marzo)',
};

interface ZodiacProduct {
  id: string;
  name: string;
  tags: string[];
  collectionId: string | null;
  detectedSign: string | null;
}

function detectZodiacSign(productName: string, tags: string[]): string | null {
  const searchText = `${productName} ${tags.join(' ')}`;
  const normalizedSearchText = normalizeAccents(searchText);
  
  // Look for zodiac signs in the text (both original and normalized)
  for (const [variant, standardName] of Object.entries(ZODIAC_SIGNS)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${variant}\\b`, 'i');
    
    // Check both original and normalized text
    if (regex.test(searchText) || regex.test(normalizedSearchText)) {
      return standardName;
    }
    
    // Also check normalized variant against normalized text
    const normalizedVariant = normalizeAccents(variant);
    const normalizedRegex = new RegExp(`\\b${normalizedVariant}\\b`, 'i');
    if (normalizedRegex.test(normalizedSearchText)) {
      return standardName;
    }
  }
  
  return null;
}

async function getZodiacCategory() {
  const category = await prisma.category.findFirst({
    where: {
      name: {
        equals: 'zodiaco',
        mode: 'insensitive'
      }
    }
  });
  
  if (!category) {
    throw new Error('Zodiac category not found. Please ensure a category named "zodiaco" exists.');
  }
  
  return category;
}

async function getExistingCollections(categoryId: string) {
  const collections = await prisma.collection.findMany({
    where: { categoryId }
  });
  
  return new Map(collections.map(col => [col.name.toLowerCase(), col]));
}

async function getZodiacProducts(categoryId: string): Promise<ZodiacProduct[]> {
  const products = await prisma.product.findMany({
    where: { categoryId },
    select: {
      id: true,
      name: true,
      tags: true,
      collectionId: true
    }
  });
  
  return products.map(product => ({
    ...product,
    detectedSign: detectZodiacSign(product.name, product.tags)
  }));
}

async function getNextCollectionId(): Promise<number> {
  // Get the highest existing collection ID number
  const lastCollection = await prisma.collection.findFirst({
    where: {
      id: {
        startsWith: 'col_'
      }
    },
    orderBy: {
      id: 'desc'
    }
  });
  
  if (!lastCollection) {
    return 52; // Start from 052 if no collections exist
  }
  
  // Extract number from ID like "col_051" -> 051 -> 51
  const match = lastCollection.id.match(/col_(\d+)/);
  if (match) {
    return parseInt(match[1], 10) + 1;
  }
  
  return 52; // Fallback to 052
}

function generateCreateCollectionSQL(collectionId: string, name: string, description: string, categoryId: string): string {
  return `INSERT INTO "Collection" ("id", "name", "description", "image", "createdAt", "categoryId") 
VALUES ('${collectionId}', '${name}', '${description.replace(/'/g, "''")}', NULL, NOW(), '${categoryId}');`;
}

function generateUpdateProductSQL(productId: string, collectionId: string): string {
  return `UPDATE "Product" SET "collectionId" = '${collectionId}' WHERE "id" = '${productId}';`;
}

async function main() {
  try {
    console.log('🔍 PREVIEW MODE: Zodiac Collections Analysis\n');
    console.log('This script will show you what changes will be made WITHOUT executing them.\n');
    
    // Step 1: Get zodiac category
    console.log('📋 Step 1: Finding zodiac category...');
    const zodiacCategory = await getZodiacCategory();
    console.log(`✅ Found zodiac category: ${zodiacCategory.name} (ID: ${zodiacCategory.id})\n`);
    
    // Step 2: Get existing collections
    console.log('📋 Step 2: Getting existing collections...');
    const existingCollections = await getExistingCollections(zodiacCategory.id);
    console.log(`✅ Found ${existingCollections.size} existing collections:`);
    for (const [name, collection] of existingCollections) {
      console.log(`   - ${name} (ID: ${collection.id})`);
    }
    console.log();
    
    // Step 3: Get and analyze zodiac products
    console.log('📋 Step 3: Analyzing zodiac products...');
    const zodiacProducts = await getZodiacProducts(zodiacCategory.id);
    console.log(`✅ Found ${zodiacProducts.length} products in zodiac category\n`);
    
    // Analyze detected signs
    const detectedSigns = new Set<string>();
    const missingSigns = new Set<string>();
    const productsBySign = new Map<string, ZodiacProduct[]>();
    const undetectedProducts: ZodiacProduct[] = [];
    const needsReassignment: ZodiacProduct[] = [];
    
    for (const product of zodiacProducts) {
      if (product.detectedSign) {
        detectedSigns.add(product.detectedSign);
        
        // Group products by detected sign
        if (!productsBySign.has(product.detectedSign)) {
          productsBySign.set(product.detectedSign, []);
        }
        productsBySign.get(product.detectedSign)!.push(product);
        
        // Check if collection exists for this sign
        if (!existingCollections.has(product.detectedSign.toLowerCase())) {
          missingSigns.add(product.detectedSign);
        }
        
        // Check if product needs reassignment
        const existingCollection = existingCollections.get(product.detectedSign.toLowerCase());
        if (existingCollection && product.collectionId !== existingCollection.id) {
          needsReassignment.push(product);
        }
      } else {
        undetectedProducts.push(product);
      }
    }
    
    console.log(`🔍 ANALYSIS RESULTS:`);
    console.log(`════════════════════════════════════════════════════════════════`);
    console.log(`📊 Summary:`);
    console.log(`   - Total products in zodiac category: ${zodiacProducts.length}`);
    console.log(`   - Products with detected zodiac signs: ${zodiacProducts.length - undetectedProducts.length}`);
    console.log(`   - Products without detected signs: ${undetectedProducts.length}`);
    console.log(`   - Unique zodiac signs detected: ${detectedSigns.size}`);
    console.log(`   - Missing collections needed: ${missingSigns.size}`);
    console.log(`   - Products needing reassignment: ${needsReassignment.length}`);
    console.log();
    
    if (detectedSigns.size > 0) {
      console.log(`🎯 DETECTED ZODIAC SIGNS:`);
      for (const sign of Array.from(detectedSigns).sort()) {
        const products = productsBySign.get(sign) || [];
        const hasCollection = existingCollections.has(sign.toLowerCase());
        const status = hasCollection ? '✅ Has collection' : '❌ Missing collection';
        console.log(`   - ${sign}: ${products.length} products ${status}`);
      }
      console.log();
    }
    
    if (missingSigns.size > 0) {
      console.log(`🆕 COLLECTIONS TO BE CREATED:`);
      let nextId = await getNextCollectionId();
      
      for (const sign of Array.from(missingSigns).sort()) {
        const products = productsBySign.get(sign) || [];
        const collectionId = `col_${nextId.toString().padStart(3, '0')}`;
        console.log(`   - Collection "${sign}" (ID: ${collectionId})`);
        console.log(`     Description: ${ZODIAC_DESCRIPTIONS[sign] || `Diseños del signo zodiacal ${sign}`}`);
        console.log(`     Will contain ${products.length} products`);
        console.log();
        nextId++;
      }
    }
    
    if (needsReassignment.length > 0) {
      console.log(`🔄 PRODUCTS TO BE REASSIGNED:`);
      for (const product of needsReassignment) {
        const targetCollection = existingCollections.get(product.detectedSign!.toLowerCase());
        console.log(`   - Product: ${product.name}`);
        console.log(`     Detected sign: ${product.detectedSign}`);
        console.log(`     Current collection: ${product.collectionId || 'None'}`);
        console.log(`     Target collection: ${targetCollection?.id || 'New collection'}`);
        console.log();
      }
    }
    
    if (undetectedProducts.length > 0) {
      console.log(`⚠️  PRODUCTS WITHOUT DETECTED ZODIAC SIGNS:`);
      console.log(`These products will remain unchanged:`);
      for (const product of undetectedProducts.slice(0, 10)) { // Show first 10
        console.log(`   - ${product.name}`);
        console.log(`     Tags: ${product.tags.join(', ')}`);
        console.log();
      }
      if (undetectedProducts.length > 10) {
        console.log(`   ... and ${undetectedProducts.length - 10} more products`);
        console.log();
      }
    }
    
    // Generate SQL queries for preview
    if (missingSigns.size > 0 || needsReassignment.length > 0) {
      console.log(`💻 SQL QUERIES TO BE EXECUTED:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      if (missingSigns.size > 0) {
        console.log(`-- CREATE COLLECTION QUERIES:`);
        let nextId = await getNextCollectionId();
        
        for (const sign of Array.from(missingSigns).sort()) {
          const collectionId = `col_${nextId.toString().padStart(3, '0')}`;
          const description = ZODIAC_DESCRIPTIONS[sign] || `Diseños del signo zodiacal ${sign}`;
          const sql = generateCreateCollectionSQL(collectionId, sign, description, zodiacCategory.id);
          console.log(`${sql}\n`);
          nextId++;
        }
      }
      
      if (needsReassignment.length > 0) {
        console.log(`-- UPDATE PRODUCT QUERIES:`);
        for (const product of needsReassignment) {
          const targetCollection = existingCollections.get(product.detectedSign!.toLowerCase());
          if (targetCollection) {
            const sql = generateUpdateProductSQL(product.id, targetCollection.id);
            console.log(`${sql} -- Product: ${product.name} -> ${product.detectedSign}`);
          }
        }
        console.log();
      }
      
      // Generate update queries for products that will be assigned to new collections
      const productsForNewCollections: Array<{ productId: string; productName: string; sign: string; collectionId: string }> = [];
      if (missingSigns.size > 0) {
        let nextId = await getNextCollectionId();
        
        for (const sign of Array.from(missingSigns).sort()) {
          const collectionId = `col_${nextId.toString().padStart(3, '0')}`;
          const products = productsBySign.get(sign) || [];
          
          for (const product of products) {
            if (!product.collectionId || product.collectionId !== collectionId) {
              productsForNewCollections.push({
                productId: product.id,
                productName: product.name,
                sign: sign,
                collectionId: collectionId
              });
            }
          }
          nextId++;
        }
      }
      
      if (productsForNewCollections.length > 0) {
        console.log(`-- UPDATE PRODUCTS TO NEW COLLECTIONS:`);
        for (const item of productsForNewCollections) {
          const sql = generateUpdateProductSQL(item.productId, item.collectionId);
          console.log(`${sql} -- Product: ${item.productName} -> ${item.sign}`);
        }
        console.log();
      }
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
    
    console.log(`🎯 EXECUTION PLAN:`);
    console.log(`1. Create ${missingSigns.size} new collections for missing zodiac signs`);
    console.log(`2. Update ${needsReassignment.length + (missingSigns.size > 0 ? Array.from(missingSigns).reduce((total, sign) => total + (productsBySign.get(sign) || []).length, 0) : 0)} products to correct collections`);
    console.log(`3. Keep ${undetectedProducts.length} products unchanged (no zodiac sign detected)`);
    console.log();
    console.log(`To execute these changes, run: npm run fix-zodiac`);
    console.log(`To backup database first, run: npm run backup-db`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
} 
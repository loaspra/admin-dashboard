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

async function createMissingCollections(categoryId: string, missingSignsSet: Set<string>) {
  const missingSigns = Array.from(missingSignsSet);
  const createdCollections = new Map<string, string>();
  
  let nextId = await getNextCollectionId();
  
  for (const sign of missingSigns) {
    const collectionId = `col_${nextId.toString().padStart(3, '0')}`;
    console.log(`Creating collection for zodiac sign: ${sign} with ID: ${collectionId}`);
    
    const collection = await prisma.collection.create({
      data: {
        id: collectionId,
        name: sign,
        description: ZODIAC_DESCRIPTIONS[sign] || `Diseños del signo zodiacal ${sign}`,
        categoryId: categoryId,
        image: null // You can set default images later if needed
      }
    });
    
    createdCollections.set(sign, collection.id);
    console.log(`✅ Created collection "${sign}" with ID: ${collection.id}`);
    nextId++;
  }
  
  return createdCollections;
}

async function updateProductCollections(
  products: ZodiacProduct[], 
  existingCollections: Map<string, any>,
  newCollections: Map<string, string>
) {
  const updates: Array<{ productId: string; collectionId: string; sign: string }> = [];
  
  for (const product of products) {
    if (!product.detectedSign) {
      console.log(`⚠️  No zodiac sign detected for product: ${product.name}`);
      continue;
    }
    
    let targetCollectionId: string | null = null;
    
    // Check existing collections first
    const existingCollection = existingCollections.get(product.detectedSign.toLowerCase());
    if (existingCollection) {
      targetCollectionId = existingCollection.id;
    } else {
      // Check newly created collections
      targetCollectionId = newCollections.get(product.detectedSign) || null;
    }
    
    if (!targetCollectionId) {
      console.log(`❌ No collection found for zodiac sign: ${product.detectedSign}`);
      continue;
    }
    
    // Skip if already correctly assigned
    if (product.collectionId === targetCollectionId) {
      console.log(`✅ Product "${product.name}" already correctly assigned to ${product.detectedSign}`);
      continue;
    }
    
    updates.push({
      productId: product.id,
      collectionId: targetCollectionId,
      sign: product.detectedSign
    });
  }
  
  // Perform batch updates
  for (const update of updates) {
    await prisma.product.update({
      where: { id: update.productId },
      data: { collectionId: update.collectionId }
    });
    
    console.log(`✅ Updated product ${update.productId} to collection ${update.sign}`);
  }
  
  return updates.length;
}

async function main() {
  try {
    console.log('🚀 Starting zodiac collections fix...\n');
    
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
    
    for (const product of zodiacProducts) {
      if (product.detectedSign) {
        detectedSigns.add(product.detectedSign);
        
        // Check if collection exists for this sign
        if (!existingCollections.has(product.detectedSign.toLowerCase())) {
          missingSigns.add(product.detectedSign);
        }
      }
    }
    
    console.log(`🔍 Analysis results:`);
    console.log(`   - Detected zodiac signs: ${Array.from(detectedSigns).join(', ')}`);
    console.log(`   - Missing collections for: ${Array.from(missingSigns).join(', ')}`);
    console.log();
    
    // Step 4: Create missing collections
    let newCollections = new Map<string, string>();
    if (missingSigns.size > 0) {
      console.log('📋 Step 4: Creating missing collections...');
      newCollections = await createMissingCollections(zodiacCategory.id, missingSigns);
      console.log();
    } else {
      console.log('📋 Step 4: No missing collections to create ✅\n');
    }
    
    // Step 5: Update product assignments
    console.log('📋 Step 5: Updating product collection assignments...');
    const updatedCount = await updateProductCollections(zodiacProducts, existingCollections, newCollections);
    console.log();
    
    // Final summary
    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Products analyzed: ${zodiacProducts.length}`);
    console.log(`   - Collections created: ${newCollections.size}`);
    console.log(`   - Products updated: ${updatedCount}`);
    console.log(`   - Zodiac signs detected: ${detectedSigns.size}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
} 
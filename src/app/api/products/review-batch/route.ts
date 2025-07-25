import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/app/lib/prisma';

interface ProductReviewData {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  category: string;
  collection: string;
  color: string;
  style: string;
  orientation: string;
  premium: boolean;
  stock: number;
  imageUrl: string;
  productType: string;
  metadata: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productsData } = body;

    console.log('Received batch products data:', productsData?.length, 'products');

    if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
      return NextResponse.json({ error: 'Products data array is required' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each product
    for (let i = 0; i < productsData.length; i++) {
      const productData = productsData[i];
      
      try {
        // Validate required fields
        if (!productData.id || !productData.name || !productData.productType) {
          errors.push({
            index: i,
            error: 'Missing required fields: id, name, or productType'
          });
          continue;
        }

        console.log(`Creating product ${i + 1}/${productsData.length} with ID:`, productData.id);

        // Save the product to the database
        const product = await prisma.product.create({
          data: {
            id: productData.id,
            name: productData.name,
            description: productData.description || '',
            price: productData.price || 0,
            images: [productData.imageUrl],
            stock: productData.stock || 1,
            tags: productData.tags || [],
            productType: productData.productType,
            createdAt: new Date(),
            updatedAt: new Date(),
            featured: productData.premium || false,
            isCustomizable: true,
            categoryId: await getOrCreateCategoryId(productData.category || 'general'),
            collectionId: await getOrCreateCollectionId(productData.category || 'general', productData.collection),
          },
        });

        // Create the product type specific details
        await createProductTypeDetails(product.id, productData);

        results.push({
          index: i,
          productId: product.id,
          success: true
        });

        console.log(`Product ${i + 1}/${productsData.length} created successfully:`, product.id);

      } catch (error) {
        console.error(`Error saving product ${i + 1}:`, error);
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    return NextResponse.json({
      success: true,
      message: `Batch save completed: ${successCount} successful, ${errorCount} failed`,
      results,
      errors,
      summary: {
        total: productsData.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error('Error in batch save:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to save products batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions (copied from single review route)
async function getOrCreateCategoryId(categoryName: string): Promise<string> {
  let category = await prisma.category.findFirst({
    where: { name: categoryName.toLowerCase() }
  });

  if (!category) {
    // Use UUID to avoid conflicts
    const newCategoryId = `cat_${uuidv4().substring(0, 8)}`;
    
    try {
      category = await prisma.category.create({
        data: {
          id: newCategoryId,
          name: categoryName.toLowerCase(),
          description: `${categoryName} category`,
          createdAt: new Date()
        }
      });
    } catch (error) {
      // If creation fails due to duplicate, try to find it again
      category = await prisma.category.findFirst({
        where: { name: categoryName.toLowerCase() }
      });
      
      if (!category) {
        throw error; // Re-throw if it's not a duplicate issue
      }
    }
  }

  return category.id;
}

async function getOrCreateCollectionId(categoryName: string, collectionName: string): Promise<string | null> {
  if (!collectionName) return null;

  const categoryId = await getOrCreateCategoryId(categoryName);
  
  let collection = await prisma.collection.findFirst({
    where: {
      name: collectionName.toLowerCase(),
      categoryId: categoryId
    }
  });

  if (!collection) {
    // Use UUID to avoid conflicts
    const newCollectionId = `col_${uuidv4().substring(0, 8)}`;
    
    try {
      collection = await prisma.collection.create({
        data: {
          id: newCollectionId,
          name: collectionName.toLowerCase(),
          description: `${collectionName} collection`,
          categoryId: categoryId,
          createdAt: new Date()
        }
      });
    } catch (error) {
      // If creation fails due to duplicate, try to find it again
      collection = await prisma.collection.findFirst({
        where: {
          name: collectionName.toLowerCase(),
          categoryId: categoryId
        }
      });
      
      if (!collection) {
        throw error; // Re-throw if it's not a duplicate issue
      }
    }
  }

  return collection.id;
}

async function createProductTypeDetails(productId: string, productData: ProductReviewData) {
  const metadata = productData.metadata || {};
  
  switch (productData.productType) {
    case 'gorra':
    case 'cap':
      await prisma.capDetails.create({
        data: {
          id: uuidv4(),
          sizes: ['Adult Unisex'],
          colors: [productData.color || 'various'],
          material: 'Cotton Blend',
          adjustable: true,
          style: productData.style,
          customizationArea: { front: true, back: false, side: false },
          productId: productId,
        }
      });
      break;
      
    case 'polo':
    case 'poloShirt':
      await prisma.poloShirtDetails.create({
        data: {
          id: uuidv4(),
          sizes: ['S', 'M', 'L', 'XL'],
          colors: [productData.color || 'various'],
          material: 'Pique Cotton',
          sleeveType: 'Short',
          customizationAreas: { front_chest: true, back: true, sleeve: false },
          collar: true,
          fit: 'Regular',
          productId: productId,
        }
      });
      break;
      
    case 'sticker':
      await prisma.stickerDetails.create({
        data: {
          id: uuidv4(),
          dimensions: { width: metadata.width || 100, height: metadata.height || 100 },
          adhesiveType: 'Standard',
          material: 'Vinyl',
          waterproof: true,
          customShape: true,
          shape: 'Custom',
          finishType: 'Glossy',
          productId: productId
        }
      });
      break;
      
    case 'stickerSheet':
      await prisma.stickerSheetDetails.create({
        data: {
          id: uuidv4(),
          sheetDimensions: { width: metadata.width || 210, height: metadata.height || 297 },
          stickerCount: productData.tags?.length || 5,
          adhesiveType: 'Standard',
          material: 'Vinyl',
          waterproof: true,
          productId: productId,
        }
      });
      break;
      
    case 'polera':
    case 'sweatshirt':
      await prisma.sweatshirtDetails.create({
        data: {
          id: uuidv4(),
          sizes: ['S', 'M', 'L', 'XL'],
          colors: [productData.color || 'various'],
          material: 'Fleece Blend',
          hasHood: true,
          pockets: true,
          customizationAreas: { front: true, back: true, sleeve: true },
          thickness: 'Medium',
          productId: productId,
        }
      });
      break;
      
    case 'termo':
    case 'thermos':
      await prisma.thermosDetails.create({
        data: {
          id: uuidv4(),
          capacity: 500,
          colors: [productData.color || 'various'],
          material: 'Stainless Steel',
          insulated: true,
          customizationArea: { wrap: true },
          lidType: 'Screw-on',
          productId: productId,
        }
      });
      break;
      
    default:
      console.log(`No specific details handler for product type: ${productData.productType}`);
      // Don't throw error, just continue without creating type-specific details
      break;
  }
}
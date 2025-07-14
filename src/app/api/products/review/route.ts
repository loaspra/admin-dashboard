import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/app/lib/image-service';
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
    const { productData } = body;

    if (!productData) {
      return NextResponse.json({ error: 'Product data is required' }, { status: 400 });
    }

    // Save the product to the database
    const product = await prisma.product.create({
      data: {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        images: [productData.imageUrl],
        stock: productData.stock,
        tags: productData.tags,
        productType: productData.productType,
        createdAt: new Date(),
        updatedAt: new Date(),
        featured: productData.premium,
        isCustomizable: true,
        categoryId: await getOrCreateCategoryId(productData.category),
        collectionId: await getOrCreateCollectionId(productData.category, productData.collection),
      },
    });

    // Create the product type specific details
    await createProductTypeDetails(product.id, productData);

    return NextResponse.json({ 
      success: true, 
      message: 'Product saved successfully',
      productId: product.id 
    });

  } catch (error) {
    console.error('Error saving reviewed product:', error);
    return NextResponse.json(
      { error: 'Failed to save product' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getOrCreateCategoryId(categoryName: string): Promise<string> {
  let category = await prisma.category.findFirst({
    where: { name: categoryName.toLowerCase() }
  });

  if (!category) {
    const categoriesCount = await prisma.category.count();
    const newCategoryId = `cat_${(categoriesCount + 1).toString().padStart(3, '0')}`;
    
    category = await prisma.category.create({
      data: {
        id: newCategoryId,
        name: categoryName.toLowerCase(),
        description: `${categoryName} category`,
        createdAt: new Date()
      }
    });
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
    const collectionsCount = await prisma.collection.count();
    const newCollectionId = `col_${(collectionsCount + 1).toString().padStart(3, '0')}`;
    
    collection = await prisma.collection.create({
      data: {
        id: newCollectionId,
        name: collectionName.toLowerCase(),
        description: `${collectionName} collection`,
        categoryId: categoryId,
        createdAt: new Date()
      }
    });
  }

  return collection.id;
}

async function createProductTypeDetails(productId: string, productData: ProductReviewData) {
  const metadata = productData.metadata || {};
  
  switch (productData.productType) {
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
  }
}

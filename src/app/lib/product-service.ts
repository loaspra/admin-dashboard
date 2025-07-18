import { prisma } from './prisma';

// Use the correct model field names as they appear in the Prisma client
type PrismaModelName = keyof typeof prisma

// New function to fetch product data based on type with pagination
export async function getProductData(type: string, page = 0, pageSize = 10) {
  let detailTable: string = '';  // Initialize with empty string to fix linter error

  console.log(`getProductData called with type: ${type}, page: ${page}, pageSize: ${pageSize}`);
  try {
    // Determine the detail table name based on the product type
    switch (type) {
      case 'cap':
        detailTable = 'CapDetails';
        break;
      case 'sweatshirt':
        detailTable = 'SweatshirtDetails';
        break;
      case 'poloShirt':
        detailTable = 'PoloShirtDetails';
        break;
      case 'thermos':
        detailTable = 'ThermosDetails';
        break;
      case 'sticker':
        detailTable = 'StickerDetails';
        break;
      case 'stickerSheet':
        detailTable = 'StickerSheetDetails';
        break;
      default:
        console.error(`Invalid product type: ${type}`);
        throw new Error(`Invalid product type: ${type}`);
    }

    console.log(`Using detail table: ${detailTable} for product type: ${type}`);
    
    // Get total count for pagination info
    const totalCount = await prisma.product.count({
      where: { productType: type }
    });
    
    // Fetch paginated data
    const data = await prisma.product.findMany({
      where: { productType: type },
      include: { [detailTable]: true },
      skip: page * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' } // Sort by creation date, newest first
    });

    console.log(`Found ${data.length} products of type: ${type} (page ${page}, total: ${totalCount})`);
    return { 
      data, 
      pagination: {
        total: totalCount,
        page,
        pageSize,
        pageCount: Math.ceil(totalCount / pageSize)
      } 
    };
  } catch (error) {
    console.error(`Error in getProductData for type ${type}:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      type: type,
      detailTable: detailTable
    });
    throw error; // Re-throw to be handled by the API route
  }
}

// New function to create a product and its details
export async function createRowProduct(productData: any, detailData: any) {
  await prisma.product.create({ data: productData });
  const detailModelName = getDetailModelName(productData.productType);
  await (prisma[detailModelName as PrismaModelName] as any).create({ data: detailData });
  return true;
}

// Helper function to get the correct detail table name
function getDetailModelName(productType: string): string {
  switch (productType) {
    case 'cap':
      return 'CapDetails';
    case 'sweatshirt':
      return 'SweatshirtDetails';
    case 'poloShirt':
      return 'PoloShirtDetails';
    case 'thermos':
      return 'ThermosDetails';
    case 'sticker':
      return 'StickerDetails';
    case 'stickerSheet':
      return 'StickerSheetDetails';
    default:
      throw new Error(`Invalid product type: ${productType}`);
  }
}

// New function to update a product and its details
export async function updateRowProduct(productId: string, productData: any, detailData: any) {
  // Update the product first
  await prisma.product.update({
    where: { id: productId },
    data: productData
  });

  if (detailData) {
    const detailsModelName = getDetailModelName(productData.productType);
    
    await (prisma[detailsModelName as PrismaModelName] as any).update({
      where: { productId: productId },
      data: detailData
    });
  }
  return true;
}

// Helper function to delete a row
export async function deleteRow(tableName: PrismaModelName, id: string) {
  await (prisma[tableName] as any).delete({ where: { id } });
  return true;
}

// Helper function to update a row
export async function updateRow(tableName: PrismaModelName, id: string, data: any) {
  await (prisma[tableName] as any).update({ where: { id }, data });
  return true;
}

// Helper function to create a row
export async function createRow(tableName: PrismaModelName, data: any) {
  await (prisma[tableName] as any).create({ data });
  return true;
}

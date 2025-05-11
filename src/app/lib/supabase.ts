import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

type PrismaModelName = Uncapitalize<Prisma.ModelName>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Export the base client for unauthenticated operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Only create the admin client when on the server side
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY as string)
  : null; // Return null when on the client side

// Create an admin function that uses the authenticated session
export async function getAdminClient() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error('No authenticated session');
  }
  
  // Use the session directly with more explicit options
  return createClient(
    supabaseUrl, 
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`
        }
      }
    }
  );
}

// Update your table functions to use Prisma client
export async function getTableNames() {
  // Use Prisma to get table names instead of Supabase RPC
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  return (tables as { table_name: string }[]).map((table) => table.table_name);
}

// Helper function to get table data
export async function getTableData(tableName: string) {
  if (!(tableName in prisma)) {
    throw new Error(`Table ${tableName} does not exist in Prisma schema`);
  }
  const data = await (prisma as any)[tableName].findMany();
  return data || [];
}

// New function to fetch product data based on type
export async function getProductData(type: string) {
  let detailTable = '';

  // Determine the detail table name based on the product type
  switch (type) {
    case 'Gorra':
      detailTable = 'CapDetails';
      break;
    case 'Polera':
      detailTable = 'SweatshirtDetails';
      break;
    case 'Polo':
      detailTable = 'PoloShirtDetails';
      break;
    case 'Termo':
      detailTable = 'ThermosDetails';
      break;
    default:
      throw new Error('Invalid product type');
  }

  const data = await prisma.product.findMany({
    where: { productType: type.toLowerCase() },
    include: { [detailTable]: true }
  });

  return data || [];
}

// New function to create a product and its details
export async function createRowProduct(productData: any, detailData: any) {
  await prisma.product.create({ data: productData });
  await (prisma[detailData.productType] as any).create({ data: detailData });
  return true;
}

// New function to update a product and its details
export async function updateRowProduct(productId: string, productData: any, detailData: any) {
  await prisma.product.update({
    where: { id: productId },
    data: productData
  });
  
  const productType = productData.productType.toLowerCase();
  let detailsModelName: PrismaModelName;
  
  switch (productType) {
    case 'gorra':
      detailsModelName = 'capDetails';
      break;
    case 'polera':
      detailsModelName = 'sweatshirtDetails';
      break;
    case 'polo':
      detailsModelName = 'poloShirtDetails';
      break;
    case 'termo':
      detailsModelName = 'thermosDetails';
      break;
    default:
      throw new Error('Invalid product type');
  }
  
  await (prisma[detailsModelName] as any).update({
    where: { productId: productId },
    data: detailData
  });
  
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

// Storage helper functions - make this server-only
export async function initializeStorage() {
  // This function should only be called from server components or API routes
  if (typeof window !== 'undefined' || !supabaseAdmin) {
    console.error('initializeStorage should only be called from server-side code');
    return false;
  }

  try {
    // Check if 'images' bucket exists using admin client
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    console.log('Buckets:', buckets);

    const imagesBucket = buckets?.find(b => b.name === 'images');

    if (!imagesBucket) {
      // Create the bucket if it doesn't exist
      const { data, error } = await supabaseAdmin.storage.createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (error) throw error;

      console.log('Created images bucket:', data);
    }

    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
}
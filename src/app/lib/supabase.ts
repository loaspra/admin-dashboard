import { createClient } from '@supabase/supabase-js';

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

// Update your table functions to use the admin client
export async function getTableNames() {
  const adminClient = await getAdminClient();
  
  // Use a PostgreSQL function to get tables instead of directly querying information_schema
  const { data, error } = await adminClient.rpc('get_user_tables');
  
  if (error) throw error;
  return data;
}

// Helper function to get table data
export async function getTableData(tableName: string) {
  const adminClient = await getAdminClient();
  const { data, error } = await adminClient
    .from(tableName)
    .select('*');
  
  if (error) throw error;
  return data;
}

// Helper function to delete a row
export async function deleteRow(tableName: string, id: string) {
  const adminClient = await getAdminClient();
  const { error } = await adminClient
    .from(tableName)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Helper function to update a row
export async function updateRow(tableName: string, id: string, data: any) {
  const adminClient = await getAdminClient();
  const { error } = await adminClient
    .from(tableName)
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Helper function to create a row
export async function createRow(tableName: string, data: any) {
  const adminClient = await getAdminClient();
  const { error } = await adminClient
    .from(tableName)
    .insert(data);
  
  if (error) throw error;
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

// Only initialize storage when on the server side
if (typeof window === 'undefined' && supabaseAdmin) {
  initializeStorage().catch(console.error);
}

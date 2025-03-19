import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Export the base client for unauthenticated operations
export const supabase = createClient(supabaseUrl, supabaseKey);

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

// Storage helper functions
export async function initializeStorage() {
  const adminClient = await getAdminClient();
  
  try {
    // Check if 'images' bucket exists
    const { data: buckets } = await adminClient.storage.listBuckets();
    console.log('Buckets:', buckets);
    const imagesBucket = buckets?.find(b => b.name === 'images');
    
    if (!imagesBucket) {
      // Create the bucket if it doesn't exist
      const { data, error } = await adminClient.storage.createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) throw error;
      
      // Set up public bucket policy
      const { error: policyError } = await adminClient.storage.from('images')
        .createSignedUrl('dummy.txt', 1); // This creates default policies
      
      if (policyError && !policyError.message.includes('does not exist')) {
        throw policyError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
}

// Initialize storage on module load
initializeStorage().catch(console.error);

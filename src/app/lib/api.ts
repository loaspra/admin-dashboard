import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to get the authenticated client with access token
async function getAdminClient() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error('No authenticated session');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`
      }
    }
  });
}

// Get table names using RPC
export async function getTableNames() {
  const adminClient = await getAdminClient();
  const { data, error } = await adminClient.rpc('get_user_tables');
  
  if (error) {
    console.error('Error getting tables:', error);
    throw error;
  }
  
  return data || [];
}

// Get table data
export async function getTableData(tableName: string) {
  const adminClient = await getAdminClient();
  const { data, error } = await adminClient.rpc('get_table_data', { 
    table_name: tableName  // Changed from p_table_name to table_name
  });
  
  if (error) {
    console.error('Error getting data:', error);
    throw error;
  }
  
  return data || [];
}

// Create row using RPC - needs p_ prefix
export async function createRow(tableName: string, data: any) {
  const adminClient = await getAdminClient();
  
  console.log('Creating row with:', { tableName, data });
  
  const { data: result, error } = await adminClient.rpc('create_any_row', {
    p_table_name: tableName,  // CHANGED: Added p_ prefix to match SQL function
    p_row_data: data          // CHANGED: Added p_ prefix to match SQL function
  });
  
  if (error) {
    console.error('Error creating row:', error);
    throw error;
  }
  
  return result;
}

// Update row using RPC - needs p_ prefix
export async function updateRow(tableName: string, id: string, data: any) {
  const adminClient = await getAdminClient();
  const { id: _, ...dataWithoutId } = data;
  
  console.log('Updating row with:', { tableName, id, data: dataWithoutId });
  
  const { data: result, error } = await adminClient.rpc('update_any_row', {
    p_table_name: tableName,      // CHANGED: Added p_ prefix
    p_row_id: id,                 // CHANGED: Added p_ prefix
    p_updated_data: dataWithoutId // CHANGED: Added p_ prefix
  });
  
  if (error) {
    console.error('Error updating row:', error);
    throw error;
  }
  
  return result;
}

// Delete row using RPC - uses table_name and row_id (no prefix)
export async function deleteRow(tableName: string, id: string) {
  const adminClient = await getAdminClient();
  
  // Keep as is - matches SQL function
  const { data: result, error } = await adminClient.rpc('delete_any_row', {
    table_name: tableName, // Correct - no prefix
    row_id: id            // Correct - no prefix
  });
  
  if (error) {
    console.error('Error deleting row:', error);
    throw error;
  }
  
  return result;
}
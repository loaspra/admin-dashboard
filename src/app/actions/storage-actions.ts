'use server'

import { supabaseAdmin } from '../lib/supabase';

export async function uploadImage(imageBuffer: Buffer, fileName: string, path: string) {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available');
  }
  
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('images')
      .upload(path, imageBuffer, {
        contentType: `image/${fileName.split('.').pop()}`,
        cacheControl: '3600'
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
}

// Add other storage operations as needed 
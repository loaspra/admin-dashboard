'use server'

import { supabaseAdmin } from '../lib/supabase';

export async function uploadImage(imageBuffer: Buffer, fileName: string, path: string) {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available');
  }
  
  try {
    // Ensure the path is in the products/sticker subdirectory
    const storagePath = path.startsWith('products/sticker') 
      ? path 
      : `products/sticker/${path.split('/').pop() || path}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('images')
      .upload(storagePath, imageBuffer, {
        contentType: `image/${fileName.split('.').pop()}`,
        cacheControl: '3600'
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
}
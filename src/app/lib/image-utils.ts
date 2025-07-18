// Client-side image utilities - NO server-side dependencies
export class ImageUtils {
  // Utility function to convert storage path to full Supabase public URL
  static getPublicUrlFromStoragePath(storagePath: string): string {
    // Check if it's already a full URL
    if (storagePath.startsWith('http')) {
      return storagePath;
    }
    
    // If it starts with /storage/, remove the leading /storage/ to get the actual path
    const actualPath = storagePath.startsWith('/storage/') 
      ? storagePath.substring('/storage/'.length) 
      : storagePath;
    
    // Construct the full Supabase public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/images/${actualPath}`;
  }
}
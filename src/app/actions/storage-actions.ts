"use server";

import { supabaseAdmin } from "../lib/supabase";

export async function uploadImage(
  imageBuffer: Buffer,
  fileName: string,
  path: string,
  productType: string,
) {
  if (!supabaseAdmin) {
    throw new Error("Admin client not available");
  }

  try {
    // Ensure the path is in the products/<productType> subdirectory
    const storagePath = path.startsWith(`products/${productType}`)
      ? path
      : `products/${productType}/${path.split("/").pop() || path}`;

    const { error } = await supabaseAdmin.storage
      .from("images")
      .upload(storagePath, imageBuffer, {
        contentType: `image/${fileName.split(".").pop()}`,
        cacheControl: "3600",
      });

    if (error) throw error;

    // Generate custom format: /storage/products/productType/filename.ext
    // Instead of full Supabase URL
    const customUrl = `/storage/${storagePath}`;
    
    return customUrl;
  } catch (error) {
    console.error("Error uploading to Supabase:", error);
    throw error;
  }
}

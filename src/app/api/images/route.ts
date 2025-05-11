import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/app/lib/image-service';

interface ImageInput {
  imageSrc: string;
  category: string;
  name: string;
  subcategory: string;
}

interface UploadedFile {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    console.log('Received form data keys:', Array.from(formData.keys()));

    // Get upload mode and product type
    const uploadMode = formData.get('uploadMode') as 'json' | 'image' | null;
    const productType = formData.get('productType') as string | null;

    console.log(`Upload Mode: ${uploadMode}, Product Type: ${productType}`);

    if (!uploadMode) {
      return NextResponse.json({ error: 'Missing uploadMode in form data' }, { status: 400 });
    }

    // --- JSON Upload Handling --- 
    if (uploadMode === 'json') {
        const jsonFileBlob = formData.get('file') as Blob | null;

        if (!jsonFileBlob || !(jsonFileBlob instanceof Blob)) {
            return NextResponse.json({ error: 'No JSON file found in the \'file\' field for JSON upload mode.' }, { status: 400 });
        }

        console.log(`Processing JSON file: ${jsonFileBlob.name || 'uploaded.json'}, Size: ${jsonFileBlob.size}`);

        try {
            const text = await jsonFileBlob.text();
            let jsonData;
            try {
                jsonData = JSON.parse(text);
            } catch (parseError: any) {
                console.error(`Error parsing JSON from file:`, parseError);
                return NextResponse.json({ error: 'Invalid JSON format in the uploaded file.' }, { status: 400 });
            }

            // Convert single object to array if needed
            if (!Array.isArray(jsonData) && typeof jsonData === 'object' && jsonData !== null) {
                jsonData = [jsonData];
            }

            if (!Array.isArray(jsonData)) {
                console.error(`Invalid JSON structure: not an array or object`);
                return NextResponse.json({ error: 'Invalid JSON structure: must be an object or an array of objects.' }, { status: 400 });
            }

            if (jsonData.length === 0) {
                console.warn(`Empty JSON array received.`);
                return NextResponse.json({ success: true, message: "Received empty JSON array.", urls: [] });
            }

            // Validate each item and filter for required fields (assuming ImageInput structure)
            const allImageData: ImageInput[] = jsonData.filter((item: any): item is ImageInput => {
                 if (!item || typeof item !== 'object') return false;
                 const missingFields = ['imageSrc', 'category', 'name', 'subcategory'].filter(field => !item[field]);
                 if (missingFields.length > 0) {
                     console.error(`Item missing required fields: ${missingFields.join(', ')}`, item);
                     return false;
                 }
                 return true;
             });

            if (allImageData.length === 0) {
                console.error('No items in JSON matched the required structure (imageSrc, category, name, subcategory).');
                return NextResponse.json({ error: 'No valid image data found in the JSON file. Ensure items have imageSrc, category, name, subcategory.' }, { status: 400 });
            }

            console.log(`Found ${allImageData.length} valid image entries in JSON.`);

            // Helper function for batch processing and fetching images
            const processBatch = async (items: ImageInput[], batchSize: number): Promise<any[]> => {
                const results = [];
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize);
                    console.log(`Fetching batch ${i/batchSize + 1}: ${batch.length} images`);
                    try {
                        const batchResults = await Promise.all(
                            batch.map(async (image: ImageInput) => {
                                try {
                                    // Fetch image with timeout and retry
                                    let retries = 3;
                                    while (retries > 0) {
                                         try {
                                             const controller = new AbortController();
                                             const timeoutId = setTimeout(() => controller.abort('timeout'), 15000); // 15 sec timeout
                                             const response = await fetch(image.imageSrc, { signal: controller.signal });
                                             clearTimeout(timeoutId);
                                             if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                                             const contentType = response.headers.get('content-type');
                                             if (!contentType?.startsWith('image/')) throw new Error(`Invalid content type: ${contentType}`);
                                             const arrayBuffer = await response.arrayBuffer();
                                             const buffer = Buffer.from(arrayBuffer);
                                             const fileName = image.name || image.imageSrc.split('/').pop() || 'image.jpg';
                                             const fileExt = image.imageSrc.split('.').pop()?.toLowerCase() || 'jpg';
                                             
                                             // Return structure expected by processJsonImages
                                             return {
                                                 buffer,
                                                 originalname: `${fileName}.${fileExt}`,
                                                 mimetype: contentType,
                                                 categoria: image.category,
                                                 coleccion: image.subcategory, // Map subcategory to coleccion
                                                 size: buffer.length
                                             };
                                         } catch (error: any) {
                                            if (error.name === 'AbortError' && error.message === 'timeout') {
                                                 console.error(`Timeout fetching ${image.imageSrc}`);
                                             } else {
                                                 console.error(`Fetch error for ${image.imageSrc}:`, error.message);
                                             }
                                             retries--;
                                             if (retries > 0) {
                                                 const delay = 1000 * Math.pow(2, 3 - retries);
                                                 console.log(`Retrying fetch for ${image.imageSrc} in ${delay}ms...`);
                                                 await new Promise(resolve => setTimeout(resolve, delay));
                                             } else {
                                                 throw error; // Final attempt failed
                                             }
                                         }
                                     }
                                 } catch (error) {
                                     console.error(`Failed to process image entry ${image.imageSrc} after retries:`, error);
                                     return null; // Failed item
                                 }
                             })
                         );
                         results.push(...batchResults.filter(Boolean));
                     } catch (batchError) {
                         console.error(`Error processing fetch batch:`, batchError);
                     }
                 }
                 return results;
             };

            // Process images in batches
            const batchSize = 10; // Adjust batch size as needed
            const processableImages = await processBatch(allImageData, batchSize);

            if (processableImages.length === 0) {
                return NextResponse.json({ error: 'Failed to fetch or process any images specified in the JSON file.' }, { status: 400 });
            }

            console.log(`Successfully fetched ${processableImages.length} images from JSON sources.`);

            // Process fetched images using the ImageService (this assumes processJsonImages handles the JsonImage structure)
            const results = await ImageService.processJsonImages(processableImages);
            // --- End: Existing JSON Processing Logic --- 
            
            return NextResponse.json({ success: true, message: `Processed ${results.length} images from JSON.`, urls: results });

        } catch (error) {
            console.error('Error processing JSON file content:', error);
            return NextResponse.json(
                { error: `Error processing JSON file: ${error instanceof Error ? error.message : 'Unknown error'}` },
                { status: 400 }
            );
        }

    // --- Image Upload Handling --- 
    } else if (uploadMode === 'image') {
        if (!productType) {
            return NextResponse.json({ error: 'Missing productType for image upload mode' }, { status: 400 });
        }

        const imageFiles = formData.getAll('files') as File[];

        if (!imageFiles || imageFiles.length === 0) {
            return NextResponse.json({ error: 'No image files found in the \'files\' field for image upload mode.' }, { status: 400 });
        }
        
        // Filter out any non-image files that might have slipped through
        const validImageFiles = imageFiles.filter(file => file.type.startsWith('image/'));
        
        if (validImageFiles.length === 0) {
             return NextResponse.json({ error: 'No valid image files provided. Only JPG and PNG are supported.' }, { status: 400 });
        }

        console.log(`Processing ${validImageFiles.length} image files for product type: ${productType}`);

        try {
            // Convert Files to the UploadedFile format expected by ImageService
            const processableImages: UploadedFile[] = await Promise.all(
                validImageFiles.map(async (file) => ({
                    buffer: Buffer.from(await file.arrayBuffer()),
                    originalname: file.name,
                    mimetype: file.type,
                    size: file.size
                }))
            );

            // Use the new service method for batch processing with product type
            const results = await ImageService.processBatchImagesWithType(processableImages, productType);

            return NextResponse.json({ success: true, message: `Processed ${results.length} images for type ${productType}.`, urls: results });
        } catch (error) {
             console.error(`Error processing batch images for type ${productType}:`, error);
             return NextResponse.json(
                 { error: `Server error while processing batch images: ${error instanceof Error ? error.message : 'Unknown error'}` },
                 { status: 500 }
             );
        }

    } else {
        // Should not happen if uploadMode is validated earlier
        return NextResponse.json({ error: 'Invalid uploadMode specified' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in image processing route:', error);
    return NextResponse.json(
      { error: 'Server error while processing request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Optional: Add rate limit status endpoint?
  // const status = ImageService.getRateLimitStatus();
  // return NextResponse.json({ message: 'Image upload API endpoint', rateLimit: status });
  return NextResponse.json({ message: 'Image upload API endpoint' });
}

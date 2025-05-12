import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/app/lib/image-service';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/app/lib/prisma';

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
  relativePath?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    console.log('Received form data keys:', Array.from(formData.keys()));

    // Get upload mode and product type
    const uploadMode = formData.get('uploadMode') as 'json' | 'image' | 'folder' | null;
    const productType = formData.get('productType') as string | null;
    const isFolder = formData.get('isFolder') === 'true';

    // Get category and collection information
    const useAiInference = formData.get('useAiInference') === 'true';
    const categoryId = formData.get('categoryId') as string | null;
    const collectionId = formData.get('collectionId') as string | null;
    const customCategory = formData.get('customCategory') as string | null;
    const customCollection = formData.get('customCollection') as string | null;

    console.log(`Upload Mode: ${uploadMode}, Product Type: ${productType}, Is Folder: ${isFolder}`);
    console.log(`Category: ${categoryId || customCategory || 'AI inferred'}, Collection: ${collectionId || customCollection || 'AI inferred'}`);

    if (!uploadMode) {
      return NextResponse.json({ error: 'Missing uploadMode in form data' }, { status: 400 });
    }

    // --- JSON Upload Handling --- 
    if (uploadMode === 'json') {
        const jsonFileBlob = formData.get('file') as Blob | null;

        if (!jsonFileBlob || !(jsonFileBlob instanceof Blob)) {
            return NextResponse.json({ error: 'No JSON file found in the \'file\' field for JSON upload mode.' }, { status: 400 });
        }

        // Use File object if available, otherwise use fallback
        const fileName = (jsonFileBlob instanceof File) ? jsonFileBlob.name : 'uploaded.json';
        console.log(`Processing JSON file: ${fileName}, Size: ${jsonFileBlob.size}`);

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
    } else if (uploadMode === 'image' || uploadMode === 'folder') {
        if (!productType) {
            return NextResponse.json({ error: 'Missing productType for image upload mode' }, { status: 400 });
        }

        const imageFiles = formData.getAll('files') as File[];
        const filePaths = isFolder ? formData.getAll('filePaths') as string[] : [];

        if (!imageFiles || imageFiles.length === 0) {
            return NextResponse.json({ error: 'No image files found in the \'files\' field for image upload mode.' }, { status: 400 });
        }
        
        // Filter out any non-image files that might have slipped through
        const validImageFiles = imageFiles.filter(file => file.type.startsWith('image/'));
        
        if (validImageFiles.length === 0) {
             return NextResponse.json({ error: 'No valid image files provided. Only JPG and PNG are supported.' }, { status: 400 });
        }

        console.log(`Processing ${validImageFiles.length} image files for product type: ${productType}`);
        
        // Log folder structure info if this is a folder upload
        if (isFolder) {
            console.log(`Folder upload with ${filePaths.length} paths provided`);
            
            // Group files by directories to preserve folder structure
            const directories = new Set<string>();
            filePaths.forEach(path => {
                const dirPath = path.split('/').slice(0, -1).join('/');
                if (dirPath) directories.add(dirPath);
            });
            
            console.log(`Detected ${directories.size} directories in uploaded folder`);
        }

        try {
            // Handle category and collection creation if needed
            let actualCategoryId = categoryId;
            let actualCollectionId = collectionId;

            if (customCategory) {
                // Create a new category with the cat_XXX format
                const categoriesCount = await prisma.category.count();
                const newCategoryId = `cat_${(categoriesCount + 1).toString().padStart(3, '0')}`;

                console.log(`Creating new category: ${customCategory.toLowerCase()} with ID ${newCategoryId}`);
                
                const newCategory = await prisma.category.create({
                    data: {
                        id: newCategoryId,
                        name: customCategory.toLowerCase(),
                        description: `${customCategory} category`,
                        createdAt: new Date()
                    }
                });
                
                console.log(`Created new category: ${newCategory.name} with ID ${newCategory.id}`);
                actualCategoryId = newCategory.id;
            }

            if (customCollection && actualCategoryId) {
                // Create a new collection with the col_XXX format
                const collectionsCount = await prisma.collection.count();
                const newCollectionId = `col_${(collectionsCount + 1).toString().padStart(3, '0')}`;
                
                const newCollection = await prisma.collection.create({
                    data: {
                        id: newCollectionId,
                        name: customCollection.toLowerCase(),
                        description: `${customCollection} collection`,
                        categoryId: actualCategoryId,
                        createdAt: new Date()
                    }
                });
                
                console.log(`Created new collection: ${newCollection.name} with ID ${newCollection.id}`);
                actualCollectionId = newCollection.id;
            }

            // Convert Files to the UploadedFile format expected by ImageService
            const processableImages: UploadedFile[] = await Promise.all(
                validImageFiles.map(async (file, index) => {
                    const uploadedFile: UploadedFile = {
                        buffer: Buffer.from(await file.arrayBuffer()),
                        originalname: file.name,
                        mimetype: file.type,
                        size: file.size
                    };
                    
                    // Add relative path for folder uploads
                    if (isFolder && index < filePaths.length) {
                        uploadedFile.relativePath = filePaths[index];
                    }
                    
                    return uploadedFile;
                })
            );

            // Process each file
            const results = [];
            
            for (const file of processableImages) {
                try {
                    let url;
                    
                    // If we're using AI inference, use the standard upload method
                    if (useAiInference) {
                        url = await ImageService.processAndUploadImageWithType(
                            file.buffer, 
                            file.originalname, 
                            productType
                        );
                    } else {
                        // For folder uploads, consider using the folder structure
                        if (isFolder && file.relativePath) {
                            // Extract folder name as potential subcategory/collection
                            const folderPath = file.relativePath.split('/');
                            const folderName = folderPath.length > 1 ? folderPath[0] : '';
                            
                            if (folderName && !actualCollectionId && !customCollection) {
                                // Use folder name as collection if none was specified
                                console.log(`Using folder name "${folderName}" as collection for ${file.originalname}`);
                                
                                // Check if this collection already exists for the category
                                let folderCollectionId = null;
                                
                                if (actualCategoryId) {
                                    const existingCollection = await prisma.collection.findFirst({
                                        where: {
                                            name: folderName.toLowerCase(),
                                            categoryId: actualCategoryId
                                        }
                                    });
                                    
                                    if (existingCollection) {
                                        folderCollectionId = existingCollection.id;
                                    } else {
                                        // Create new collection based on folder name
                                        const collectionsCount = await prisma.collection.count();
                                        const newCollectionId = `col_${(collectionsCount + 1).toString().padStart(3, '0')}`;
                                        
                                        const newCollection = await prisma.collection.create({
                                            data: {
                                                id: newCollectionId,
                                                name: folderName.toLowerCase(),
                                                description: `${folderName} collection (from folder upload)`,
                                                categoryId: actualCategoryId,
                                                createdAt: new Date()
                                            }
                                        });
                                        
                                        folderCollectionId = newCollection.id;
                                        console.log(`Created new collection from folder: ${newCollection.name} with ID ${newCollection.id}`);
                                    }
                                }
                                
                                url = await ImageService.processAndUploadImageWithCustomCategorization(
                                    file.buffer, 
                                    file.originalname, 
                                    productType,
                                    actualCategoryId || undefined,
                                    folderCollectionId || undefined
                                );
                            } else {
                                // Use specified category and collection
                                url = await ImageService.processAndUploadImageWithCustomCategorization(
                                    file.buffer, 
                                    file.originalname, 
                                    productType,
                                    actualCategoryId || undefined,
                                    actualCollectionId || undefined
                                );
                            }
                        } else {
                            // Use specified category and collection
                            url = await ImageService.processAndUploadImageWithCustomCategorization(
                                file.buffer, 
                                file.originalname, 
                                productType,
                                actualCategoryId || undefined,
                                actualCollectionId || undefined
                            );
                        }
                    }
                    
                    results.push(url);
                } catch (fileError) {
                    console.error(`Error processing file ${file.originalname}:`, fileError);
                    // Continue with next file even if one fails
                }
            }

            return NextResponse.json({ 
                success: true, 
                message: `Processed ${results.length} images for type ${productType}.`, 
                urls: results 
            });
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
  // Return rate limit status
  const status = ImageService.getRateLimitStatus();
  return NextResponse.json({ message: 'Image upload API endpoint', rateLimit: status });
}

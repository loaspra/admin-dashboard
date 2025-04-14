import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/app/lib/image-service';

interface ImageInput {
  imageSrc: string;
  category: string;
  name: string;
  subcategory: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    console.log('Received form data:', formData);
    
    // Get all files from the form data
    const allFiles = formData.getAll('files') as File[];
    console.log("Received: " + allFiles.length + " files");
    const jsonFile = formData.get('json') as File | null;
    
    // Find all JSON files in the form data
    const jsonFiles: File[] = [];
    
    // Check if there's a dedicated JSON file in the 'json' field
    if (jsonFile && (jsonFile.name.toLowerCase().endsWith('.json') || jsonFile.type === 'application/json')) {
      jsonFiles.push(jsonFile);
    }
    
    // Add all JSON files from the 'files' field
    allFiles.forEach(file => {
      if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
        jsonFiles.push(file);
      }
    });
    
    // If we found JSON files, process them
    if (jsonFiles.length > 0) {
      console.log(`Processing ${jsonFiles.length} JSON files`);
      
      try {
        // Array to hold all image data from all JSON files
        let allImageData: ImageInput[] = [];
        
        // Process each JSON file
        for (const jsonFileToProcess of jsonFiles) {
          console.log('Processing JSON file:', jsonFileToProcess.name, 'Type:', jsonFileToProcess.type);
          
          // Parse the JSON file
          const text = await jsonFileToProcess.text();
          console.log('JSON content:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
          
          let jsonData;
          try {
            jsonData = JSON.parse(text);
            console.log('Parsed JSON structure:', JSON.stringify(jsonData).substring(0, 200));
          } catch (parseError: any) {
            console.error(`Error parsing JSON from file ${jsonFileToProcess.name}:`, parseError);
            continue; // Skip this file and try the next one
          }
          
          // Convert single object to array if needed
          if (!Array.isArray(jsonData) && typeof jsonData === 'object' && jsonData !== null) {
            console.log('Converting single JSON object to array');
            jsonData = [jsonData];
          }
          
          // Validate JSON structure
          if (!Array.isArray(jsonData)) {
            console.error(`Invalid JSON structure in file ${jsonFileToProcess.name}: not an array or object`);
            continue;
          }
          
          if (jsonData.length === 0) {
            console.error(`Empty JSON array in file ${jsonFileToProcess.name}`);
            continue;
          }
          
          // Validate each item in the JSON data
          const validItems = jsonData.filter(item => {
            if (!item || typeof item !== 'object') return false;
            
            const missingFields = ['imageSrc', 'category', 'name', 'subcategory'].filter(
              field => !item[field]
            );
            
            if (missingFields.length > 0) {
              console.error(`Item missing required fields: ${missingFields.join(', ')}`, item);
              return false;
            }
            
            return true;
          });
          
          console.log(`Found ${validItems.length} valid images in JSON file ${jsonFileToProcess.name}`);
          allImageData = allImageData.concat(validItems);
        }
        
        // If no valid image data was found, return an error
        if (allImageData.length === 0) {
          throw new Error('No valid image data found in any of the JSON files');
        }
        
        console.log(`Total images to process: ${allImageData.length}`);
        
        // Define a helper function for batch processing
        const processBatch = async (items: ImageInput[], batchSize: number): Promise<any[]> => {
          const results = [];
          
          // Process items in batches
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(items.length/batchSize)}: ${batch.length} items`);
            
            try {
              // Process each batch sequentially but items within batch concurrently
              const batchResults = await Promise.all(
                batch.map(async (image: ImageInput) => {
                  try {
                    // Add exponential backoff retry for fetching images
                    let retries = 3;
                    let lastError;
                    
                    while (retries > 0) {
                      try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                        
                        const response = await fetch(image.imageSrc, {
                          signal: controller.signal
                        });
                        
                        clearTimeout(timeoutId); // Clear the timeout if the fetch completes
                        
                        if (!response.ok) {
                          throw new Error(`Failed to fetch image from ${image.imageSrc}: ${response.status} ${response.statusText}`);
                        }
                        
                        const contentType = response.headers.get('content-type');
                        if (!contentType?.startsWith('image/')) {
                          throw new Error(`Invalid content type for ${image.imageSrc}: ${contentType}`);
                        }
                        
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        
                        const fileName = image.name || image.imageSrc.split('/').pop() || 'image.jpg';
                        const fileExt = image.imageSrc.split('.').pop()?.toLowerCase() || 'jpg';
                        
                        return {
                          buffer,
                          originalname: `${fileName}.${fileExt}`,
                          mimetype: contentType,
                          categoria: image.category,
                          coleccion: image.subcategory,
                          size: buffer.length
                        };
                      } catch (error) {
                        lastError = error;
                        retries--;
                        
                        if (retries > 0) {
                          // Wait before retrying (exponential backoff)
                          const delay = 1000 * Math.pow(2, 3 - retries);
                          console.log(`Retrying fetch for ${image.imageSrc} after ${delay}ms, ${retries} attempts left`);
                          await new Promise(resolve => setTimeout(resolve, delay));
                        } else {
                          throw error;
                        }
                      }
                    }
                    
                    throw lastError; // This line shouldn't be reached if fetch succeeds
                    
                  } catch (error) {
                    console.error(`Error processing image ${image.imageSrc}:`, error);
                    return null; // Return null for failed items instead of throwing
                  }
                })
              );
              
              // Filter out null results (failed items) and add to results
              results.push(...batchResults.filter(Boolean));
            } catch (batchError) {
              console.error(`Error processing batch ${i/batchSize + 1}:`, batchError);
              // Continue with next batch even if one fails
            }
          }
          
          return results;
        };
        
        // Process images in batches of 10
        const batchSize = 10;
        const processableImages = await processBatch(allImageData, batchSize);
        
        if (processableImages.length === 0) {
          throw new Error('Failed to process any images from the JSON files');
        }
        
        console.log(`Successfully processed ${processableImages.length} out of ${allImageData.length} images`);
        
        // Process the images using the specialized JSON image processor
        const results = await ImageService.processJsonImages(processableImages);
        return NextResponse.json({ success: true, urls: results });
      } catch (error) {
        console.error('Error processing JSON files:', error);
        return NextResponse.json(
          { error: `Error processing JSON files: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    } else {
      // No JSON files found, process regular image files
      if (!allFiles || allFiles.length === 0) {
        return NextResponse.json(
          { error: 'No files provided. Please upload image files or a JSON file.' },
          { status: 400 }
        );
      }
      
      console.log(`Processing ${allFiles.length} image files`);
      
      // Convert Files to UploadedFile format
      const processableImages = await Promise.all(
        allFiles.map(async (file) => ({
          buffer: Buffer.from(await file.arrayBuffer()),
          originalname: file.name,
          mimetype: file.type,
          size: file.size
        }))
      );
      
      // Process images using processBatchImages
      const results = await ImageService.processBatchImages(processableImages);
      return NextResponse.json({ success: true, urls: results });
    }
  } catch (error) {
    console.error('Error in image processing route:', error);
    return NextResponse.json(
      { error: 'Server error while processing request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Image upload API endpoint' });
}

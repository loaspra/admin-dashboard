import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import sharp from "sharp"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "./prisma"
import { uploadImage } from "../actions/storage-actions"

interface UploadedFile {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

// Add ProductType definition based on schema relation fields
type ProductType = 
  | 'cap'
  | 'poloShirt'
  | 'sticker'
  | 'stickerSheet'
  | 'sweatshirt'
  | 'thermos';

// Function to map ProductType string to the actual Prisma model name
// We might not need this if we just use the string directly in the Product model
// but it's good for validation or potential future use.
function isValidProductType(type: string): type is ProductType {
  return [
    'cap', 
    'poloShirt', 
    'sticker', 
    'stickerSheet', 
    'sweatshirt', 
    'thermos'
  ].includes(type);
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseClient = createClient(supabaseUrl, supabaseKey)

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

interface ImageMetadata {
  nombre: string
  categoria: string
  tags: string[]
  color?: string
  estilo?: string
  orientacion?: string
  coleccion?: string
  autor?: string
  licencia?: string
  premium: boolean
}

interface JsonImage {
  buffer: Buffer
  originalname: string
  mimetype: string
  categoria: string
  coleccion: string
  size: number
}

// Rate limiter implementation
class RateLimiter {
  private requestTimestamps: number[] = []
  private queue: Array<{
    task: () => Promise<any>
    resolve: (value: any) => void
    reject: (reason: any) => void
  }> = []
  private isProcessingQueue = false
  private readonly maxRequestsPerMinute: number
  private readonly windowMs: number = 60000 // 1 minute in milliseconds

  constructor(maxRequestsPerMinute: number) {
    this.maxRequestsPerMinute = maxRequestsPerMinute
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    // Clean up old timestamps
    const now = Date.now()
    this.requestTimestamps = this.requestTimestamps.filter((timestamp) => now - timestamp < this.windowMs)

    // Check if we're under the rate limit
    if (this.requestTimestamps.length < this.maxRequestsPerMinute) {
      // We can execute immediately
      this.requestTimestamps.push(now)
      return task()
    } else {
      // We need to queue the request
      return new Promise<T>((resolve, reject) => {
        this.queue.push({
          task: task as () => Promise<any>,
          resolve,
          reject,
        })

        // Start processing the queue if not already doing so
        if (!this.isProcessingQueue) {
          this.processQueue()
        }
      })
    }
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessingQueue = false
      return
    }

    this.isProcessingQueue = true

    // Calculate time until next slot is available
    const now = Date.now()
    const oldestTimestamp = this.requestTimestamps[0]
    const timeUntilNextSlot = Math.max(0, this.windowMs - (now - oldestTimestamp))

    // Wait until we can process the next request
    await new Promise((resolve) => setTimeout(resolve, timeUntilNextSlot))

    // Process the next request
    const nextRequest = this.queue.shift()
    if (nextRequest) {
      this.requestTimestamps.push(Date.now())
      this.requestTimestamps.sort((a, b) => a - b) // Keep timestamps sorted

      try {
        const result = await nextRequest.task()
        nextRequest.resolve(result)
      } catch (error) {
        nextRequest.reject(error)
      }
    }

    // Continue processing the queue
    this.processQueue()
  }

  // Get current queue length for monitoring
  getQueueLength(): number {
    return this.queue.length
  }

  // Get current rate (requests in the last minute)
  getCurrentRate(): number {
    const now = Date.now()
    return this.requestTimestamps.filter((timestamp) => now - timestamp < this.windowMs).length
  }
}

// Create a rate limiter instance with 29 requests per minute
const geminiRateLimiter = new RateLimiter(29)

export class ImageService {
  private static async fetchCollections(): Promise<string[]> {
    const collections = await prisma.collection.findMany({
      select: {
        name: true,
      },
      distinct: ["name"],
    })

    return collections.map((collection) => collection.name).filter(Boolean) as string[]
  }

  private static async processImageWithGemini(imageBytes: Buffer, isFromJson: boolean): Promise<ImageMetadata> {
    // Use the rate limiter to control API calls to Gemini
    return geminiRateLimiter.execute(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })

      const categorias = {
        deportes: {
          collecion: ["boxing", "judo", "gym", "bjj", "futbol", "messi"],
        },
        musica: {
          collecion: ["harry styles", "arctick monkeys", "bad bunny"],
        },
        zodiaco: {
          collecion: ["aries", "todos", "luna"],
        },
        "series tv": {
          collecion: ["house of dragon", "the office", "rick and morty", "CHAINSAW MAN"],
        },
        mentalidad: {
          collecion: ["estoicismo", "psico"],
        },
        parejas: {
          collecion: ["duos"],
        },
        halloween: {
          collecion: [],
        },
        tattos: {
          collecion: ["tattos", "negro"],
        },
        animes: {
          collecion: ["kimetsu no yaiba"],
        },
        arte: {
          collecion: ["psicodelicos", "art", "obras de arte", "estatuas"],
        },
        cosmos: {
          collecion: ["astronomia"],
        },
        profesiones: {
          collecion: ["med", "programadores", "data", "security"],
        },
        caricaturas: {
          collecion: [
            "snoopy",
            "capibara",
            "lord nermal",
            "pepe the frog",
            "hamsters",
            "michis",
            "perros",
            "rana René",
          ],
        },
        memes: {
          collecion: ["rage comics"],
        },
        travel: {
          collecion: ["boletos"],
        },
        peliculas: {
          collecion: ["rocky"],
        },
      }
      const prompt = `Analiza esta imagen y proporciona la siguiente información en formato JSON:
  - nombre: un nombre descriptivo para la imagen
  - tags: arreglo de palabras clave relevantes (máximo 5), debes incluir los colores predominantes de la imagen
  - color: color dominante o esquema de colores
  - estilo: uno de [cartoon, realista, minimalista, abstracto]
  - orientacion: uno de [horizontal, vertical, cuadrada]
  - premium: booleano que indica si esta debe ser una imagen premium
  ${isFromJson ? "" : `
  - categoria: una de la categoria, debe de estar en el JSON de abajo
  - coleccion: una colección de la categoria a la que pertenece la imagen

  A continuación, se muestran las categorías disponibles, cada una tiene una lista de colecciones asociadas:
  ${JSON.stringify(Object.keys(categorias))}
  `}
  Por favor, responde solo con el objeto JSON, sin texto adicional.
  
  Mas contexto: las imagenes son planchas de stickers, pueden tener diferentes tematicas y colores. `
      const base64Image = imageBytes.toString("base64")

      try {
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ])

        const response = await result.response
        const responseText = response.text()

        console.log("Gemini response:", responseText)

        // Clean the response to handle markdown formatting
        let jsonString = responseText

        // Remove markdown code blocks if present
        if (jsonString.includes("```")) {
          // Extract content between triple backticks
          const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
          if (match && match[1]) {
            jsonString = match[1].trim()
          } else {
            // If we can't extract properly, try to remove backticks
            jsonString = jsonString.replace(/```json|```/g, "").trim()
          }
        }

        try {
          const jsonResponse = JSON.parse(jsonString)
          return jsonResponse as ImageMetadata
        } catch (jsonError) {
          console.error("Error parsing JSON from Gemini response:", jsonError)

          // Fallback to default values if parsing fails
          return {
            nombre: "Unknown Image",
            categoria: "objetos",
            tags: ["unknown"],
            color: "unknown",
            estilo: "realista",
            orientacion: "horizontal",
            premium: false,
          }
        }
      } catch (error) {
        console.error("Error processing image with Gemini:", error)

        // Return default values if Gemini processing fails
        return {
          nombre: "Unprocessed Image",
          categoria: "objetos",
          tags: ["unprocessed"],
          color: "unknown",
          estilo: "realista",
          orientacion: "horizontal",
          premium: false,
        }
      }
    })
  }

  private static async uploadImageToSupabase(imageBuffer: Buffer, fileName: string): Promise<string> {
    // Don't create nested folder structures, use flat structure with unique filename
    const fileExt = fileName.split(".").pop()
    const uniqueFileName = `${uuidv4()}.${fileExt}`
    // Use a flat structure with a descriptive prefix instead of nested folders
    const filePath = `products/sticker/${uniqueFileName}`

    try {
      // Call server action
      return await uploadImage(imageBuffer, fileName, filePath)
    } catch (error) {
      console.error("Error uploading to Supabase:", error)
      throw error
    }
  }

  private static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer)
      console.log("Image keys: ", Object.keys(image));
      const metadata = await image.metadata()
      
      // Get the original format (default to jpeg if not detected)
      const format = metadata.format || 'jpeg';
      console.log(`Processing image with original format: ${format}`);

      // Resize if image is too large while maintaining aspect ratio
      if (metadata.width && metadata.width > 2000) {
        if (format === 'png') {
          return await image.resize(2000, undefined, { fit: "inside" }).png({ quality: 80 }).toBuffer()
        } else {
          return await image.resize(2000, undefined, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer()
        }
      }

      // Preserve original format
      if (format === 'png') {
        return await image.png({ quality: 80 }).toBuffer()
      } else {
        return await image.jpeg({ quality: 80 }).toBuffer()
      }
    } catch (error) {
      console.error("Error optimizing image:", error)
      throw error
    }
  }

  static async processAndUploadImageWithType(
    imageBuffer: Buffer, 
    fileName: string, 
    productType: string // Now accepts productType string
  ): Promise<string> {
    if (!isValidProductType(productType)) {
        throw new Error(`Invalid product type provided: ${productType}`);
    }

    try {
      // Optimize image
      const optimizedBuffer = await this.optimizeImage(imageBuffer)

      // Process with Gemini and upload to Supabase in parallel
      const [metadata, publicUrl] = await Promise.all([
        this.processImageWithGemini(optimizedBuffer, false), // false because it's not from JSON
        this.uploadImageToSupabase(optimizedBuffer, fileName), // Still uploads to a generic path, maybe refine later?
      ])

      console.log("Metadata: " + JSON.stringify(metadata, null, 2))

      // Get image dimensions
      const dimensions = await sharp(optimizedBuffer).metadata()
      
      // Generate ID for product
      const productId = uuidv4();
      
      // Convert full URL to storage path for DB consistency
      const urlObj = new URL(publicUrl);
      let storagePath = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1));
      console.log("Storage path: " + storagePath)
      storagePath = storagePath.replace('/v1/object/public/images', '');
      console.log("Storage path: " + storagePath)

      // Create product entry with ID and the correct productType
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: metadata.nombre || 'Untitled Image',
          description: metadata.tags?.join(', ') || 'No description',
          price: metadata.premium ? 9.99 : 4.99, // Default pricing, adjust as needed
          images: [storagePath], // Store relative path
          stock: 999, // Default stock
          tags: metadata.tags || [],
          productType: productType, // Use the provided productType
          createdAt: new Date(),
          updatedAt: new Date(),
          featured: metadata.premium,
          isCustomizable: true, // Default, adjust as needed per product type
          categoryId: await this.getOrCreateCategoryId(metadata.categoria), // Category from Gemini
          // Collection might also come from Gemini or be null
          collectionId: metadata.coleccion ? await this.getOrCreateCollectionId(metadata.categoria, metadata.coleccion) : null, 
        },
      })

      // Create the corresponding details entry based on productType
      // Note: Default values are used here. You might want to infer these from Gemini too,
      // or provide UI options for them during upload.
      switch (productType) {
        case 'cap':
          await prisma.capDetails.create({
            data: {
              id: uuidv4(),
              sizes: ['Adult Unisex'], colors: [metadata.color || 'various'], material: 'Cotton Blend', adjustable: true, style: metadata.estilo,
              customizationArea: { front: true, back: false, side: false }, // Example JSON
              productId: product.id,
            }
          });
          break;
        case 'poloShirt':
          await prisma.poloShirtDetails.create({
            data: {
              id: uuidv4(),
              sizes: ['S', 'M', 'L', 'XL'], colors: [metadata.color || 'various'], material: 'Pique Cotton', sleeveType: 'Short',
              customizationAreas: { front_chest: true, back: true, sleeve: false }, collar: true, fit: 'Regular',
              productId: product.id,
            }
          });
          break;
        case 'sticker':
           await prisma.stickerDetails.create({
            data: {
              id: uuidv4(),
              dimensions: { width: dimensions.width || 100, height: dimensions.height || 100 }, // Use dimensions from image
              adhesiveType: 'Standard', material: 'Vinyl', waterproof: true, customShape: true, shape: 'Custom', finishType: 'Glossy',
              productId: product.id
            }
           });
           break;
        case 'stickerSheet':
           await prisma.stickerSheetDetails.create({
             data: {
               id: uuidv4(),
               sheetDimensions: { width: dimensions.width || 210, height: dimensions.height || 297 }, // A4-ish default?
               stickerCount: metadata.tags?.length || 5, // Guess based on tags? Needs better logic
               // individualSizes: [{w:50, h:50}, ...], // Needs inference or input
               adhesiveType: 'Standard', material: 'Vinyl', waterproof: true,
               productId: product.id,
             }
           });
           break;
        case 'sweatshirt':
           await prisma.sweatshirtDetails.create({
            data: {
              id: uuidv4(),
              sizes: ['S', 'M', 'L', 'XL'], colors: [metadata.color || 'various'], material: 'Fleece Blend', hasHood: true, pockets: true,
              customizationAreas: { front: true, back: true, sleeve: true }, thickness: 'Medium',
              productId: product.id,
            }
           });
           break;
        case 'thermos':
           await prisma.thermosDetails.create({
            data: {
              id: uuidv4(),
              capacity: 500, colors: [metadata.color || 'various'], material: 'Stainless Steel', insulated: true,
              customizationArea: { wrap: true }, lidType: 'Screw-on',
              productId: product.id,
            }
           });
           break;
        default:
          // Optionally handle unknown type, though validation should prevent this
          console.warn(`Product details not created for unknown type: ${productType}`);
      }


      return publicUrl // Return the public URL for potential frontend use
    } catch (error) {
      console.error(`Error in processAndUploadImageWithType for ${fileName}:`, error)
      throw error // Re-throw the error to be caught by the batch processor
    }
  }

  // New method to process images with custom category and collection
  static async processAndUploadImageWithCustomCategorization(
    imageBuffer: Buffer, 
    fileName: string, 
    productType: string,
    categoryId?: string,
    collectionId?: string
  ): Promise<string> {
    if (!isValidProductType(productType)) {
        throw new Error(`Invalid product type provided: ${productType}`);
    }

    try {
      // Optimize image
      const optimizedBuffer = await this.optimizeImage(imageBuffer)

      // Process with Gemini for product attributes, but not for categorization
      // Use the same method but we'll ignore the category/collection it returns
      const [metadata, publicUrl] = await Promise.all([
        this.processImageWithGemini(optimizedBuffer, true), // true to skip category/collection inference
        this.uploadImageToSupabase(optimizedBuffer, fileName),
      ])

      console.log("Metadata with custom categorization: " + JSON.stringify(metadata, null, 2))

      // Get image dimensions
      const dimensions = await sharp(optimizedBuffer).metadata()
      
      // Generate ID for product
      const productId = uuidv4();
      
      // Convert full URL to storage path for DB consistency
      const urlObj = new URL(publicUrl);
      const pathParts = urlObj.pathname.split('/');
      let storagePath = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1));
      // replace the string `/v1/object/public/images` with `/storage`
      storagePath = storagePath.replace('/v1/object/public/images', '/storage');
      console.log("Storage path: " + storagePath)

      // Create product entry with ID and the custom category/collection
      const product = await prisma.product.create({
        data: {
          id: productId,
          name: metadata.nombre || 'Untitled Image',
          description: metadata.tags?.join(', ') || 'No description',
          price: metadata.premium ? 9.99 : 4.99,
          images: [storagePath],
          stock: 999,
          tags: metadata.tags || [],
          productType: productType,
          createdAt: new Date(),
          updatedAt: new Date(),
          featured: metadata.premium,
          isCustomizable: true,
          // Use provided category/collection or default to 'misc'
          categoryId: categoryId || await this.getOrCreateCategoryId('misc'),
          collectionId: collectionId || null,
        },
      })

      // Create the corresponding details entry based on productType
      // Same as in processAndUploadImageWithType
      switch (productType) {
        case 'cap':
          await prisma.capDetails.create({
            data: {
              id: uuidv4(),
              sizes: ['Adult Unisex'], colors: [metadata.color || 'various'], material: 'Cotton Blend', adjustable: true, style: metadata.estilo,
              customizationArea: { front: true, back: false, side: false },
              productId: product.id,
            }
          });
          break;
        case 'poloShirt':
          await prisma.poloShirtDetails.create({
            data: {
              id: uuidv4(),
              sizes: ['S', 'M', 'L', 'XL'], colors: [metadata.color || 'various'], material: 'Pique Cotton', sleeveType: 'Short',
              customizationAreas: { front_chest: true, back: true, sleeve: false }, collar: true, fit: 'Regular',
              productId: product.id,
            }
          });
          break;
        case 'sticker':
           await prisma.stickerDetails.create({
            data: {
              id: uuidv4(),
              dimensions: { width: dimensions.width || 100, height: dimensions.height || 100 },
              adhesiveType: 'Standard', material: 'Vinyl', waterproof: true, customShape: true, shape: 'Custom', finishType: 'Glossy',
              productId: product.id
            }
           });
           break;
        case 'stickerSheet':
           await prisma.stickerSheetDetails.create({
             data: {
               id: uuidv4(),
               sheetDimensions: { width: dimensions.width || 210, height: dimensions.height || 297 },
               stickerCount: metadata.tags?.length || 5,
               adhesiveType: 'Standard', material: 'Vinyl', waterproof: true,
               productId: product.id,
             }
           });
           break;
        case 'sweatshirt':
           await prisma.sweatshirtDetails.create({
            data: {
              id: uuidv4(),
              sizes: ['S', 'M', 'L', 'XL'], colors: [metadata.color || 'various'], material: 'Fleece Blend', hasHood: true, pockets: true,
              customizationAreas: { front: true, back: true, sleeve: true }, thickness: 'Medium',
              productId: product.id,
            }
           });
           break;
        case 'thermos':
           await prisma.thermosDetails.create({
            data: {
              id: uuidv4(),
              capacity: 500, colors: [metadata.color || 'various'], material: 'Stainless Steel', insulated: true,
              customizationArea: { wrap: true }, lidType: 'Screw-on',
              productId: product.id,
            }
           });
           break;
        default:
          console.warn(`Product details not created for unknown type: ${productType}`);
      }

      return publicUrl
    } catch (error) {
      console.error(`Error in processAndUploadImageWithCustomCategorization for ${fileName}:`, error)
      throw error
    }
  }

  static async processAndUploadImage(imageBuffer: Buffer, fileName: string): Promise<string> {
     console.warn("Calling deprecated processAndUploadImage. Use processAndUploadImageWithType or processJsonImages.");
     // Defaulting to 'stickerSheet' for backward compatibility or specific use cases
     return this.processAndUploadImageWithType(imageBuffer, fileName, 'stickerSheet');
  }

  private static async getOrCreateCategoryId(categoryName: string): Promise<string> {
    if (!categoryName) return 'misc'; // Default category if none provided
    
    const normalizedName = categoryName.toLowerCase().trim();
    
    // Try to find an existing category
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: normalizedName,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingCategory) {
      return existingCategory.id;
    }
    
    // Create a new category if it doesn't exist
    const newCategory = await prisma.category.create({
      data: {
        id: uuidv4(),
        name: normalizedName,
        description: `${normalizedName} category`,
        createdAt: new Date()
      }
    });
    
    return newCategory.id;
  }

  static async processBatchImagesWithType(files: UploadedFile[], productType: string): Promise<string[]> {
    if (!isValidProductType(productType)) {
        // Maybe return an error response instead of throwing?
        throw new Error(`Invalid product type provided for batch processing: ${productType}`);
    }
    const results: string[] = []

    for (const file of files) {
      try {
        // Call the type-aware processing function
        const url = await this.processAndUploadImageWithType(file.buffer, file.originalname, productType)
        results.push(url)
      } catch (error) {
        console.error(`Error processing ${file.originalname} for type ${productType}:`, error)
        // Continue with next file even if one fails
      }
    }

    return results
  }

  // Keep the old batch processor, maybe rename it or mark as deprecated?
  // It seems tied to the old direct image upload logic which defaults to StickerSheet
  static async processBatchImages(files: UploadedFile[]): Promise<string[]> {
     console.warn("Calling deprecated processBatchImages. Use processBatchImagesWithType.");
     // Defaulting to 'stickerSheet'
     return this.processBatchImagesWithType(files, 'stickerSheet');
  }

  static async processJsonImages(jsonImages: JsonImage[]): Promise<string[]> {
    const results: string[] = [];

    for (const image of jsonImages) {
      try {
        // Gemini still processes based on the image content + context
        const metadata = await this.processImageWithGemini(image.buffer, true); // true because it's from JSON

        // Optimize image
        const optimizedBuffer = await this.optimizeImage(image.buffer)

        // Upload image to Supabase
        const fullPublicUrl = await this.uploadImageToSupabase(optimizedBuffer, image.originalname)
        
        // Convert full URL to storage path
        const urlObj = new URL(fullPublicUrl);
        const pathParts = urlObj.pathname.split('/');
         let storagePath = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1));
        // replace the string `/v1/object/public/images` with `/storage`
        storagePath = storagePath.replace('/v1/object/public/images', '/storage');

        // Get image dimensions
        const dimensions = await sharp(optimizedBuffer).metadata()

        // Generate ID for product
        const productId = uuidv4();
        
        // Determine productType - JSON implies single stickers or sheets? Defaulting to 'sticker'
        // This might need refinement based on JSON structure or conventions
        const productTypeForJson: ProductType = 'sticker'; 

        // Create product entry with ID
        const product = await prisma.product.create({
          data: {
            id: productId,
            name: metadata.nombre || 'Untitled Image',
            description: metadata.tags?.join(', ') || 'No description',
            price: metadata.premium ? 9.99 : 4.99,
            images: [storagePath],
            stock: 999,
            tags: metadata.tags || [],
            productType: productTypeForJson, // Set determined type
            createdAt: new Date(),
            updatedAt: new Date(),
            featured: metadata.premium,
            isCustomizable: true,
            categoryId: await this.getOrCreateCategoryId(image.categoria), // Use category from JSON input
            collectionId: await this.getOrCreateCollectionId(image.categoria, image.coleccion), // Use collection from JSON input
          },
        });

        // Create StickerDetails (as decided above for JSON uploads)
        await prisma.stickerDetails.create({
          data: {
            id: uuidv4(),
            dimensions: {
              width: dimensions.width || 0,
              height: dimensions.height || 0
            },
            adhesiveType: 'Standard',
            material: 'Vinyl',
            waterproof: true,
            customShape: true,
            shape: 'Custom',
            finishType: 'Glossy',
            productId: product.id
          }
        });

        results.push(storagePath);
      } catch (error) {
        console.error(`Error processing image from JSON:`, error);
        // Continue with next image even if one fails
      }
    }

    return results;
  }

  private static async getOrCreateCollectionId(categoryName: string, collectionName: string): Promise<string | null> {
    if (!collectionName) return null;
    
    const normalizedCategoryName = categoryName.toLowerCase().trim();
    const normalizedCollectionName = collectionName.toLowerCase().trim();
    
    // Find category ID first
    const categoryId = await this.getOrCreateCategoryId(normalizedCategoryName);
    
    // Try to find existing collection
    const existingCollection = await prisma.collection.findFirst({
      where: {
        categoryId: categoryId,
        name: {
          contains: normalizedCollectionName,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingCollection) {
      return existingCollection.id;
    }
    
    // Create new collection
    const newCollection = await prisma.collection.create({
      data: {
        id: uuidv4(),
        name: normalizedCollectionName,
        description: `${normalizedCollectionName} collection`,
        categoryId: categoryId,
        createdAt: new Date()
      }
    });
    
    return newCollection.id;
  }

  static getRateLimitStatus() {
    return {
      currentRate: geminiRateLimiter.getCurrentRate(),
      queueLength: geminiRateLimiter.getQueueLength(),
      maxRate: 29,
    }
  }
}


import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface ImageMetadata {
  nombre: string;
  categoria: string;
  tags: string[];
  color?: string;
  estilo?: string;
  orientacion?: string;
  coleccion?: string;
  autor?: string;
  licencia?: string;
  premium: boolean;
}

export class ImageService {
  private static async processImageWithGemini(imageBytes: Buffer): Promise<ImageMetadata> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    const prompt = `Analyze this image and provide the following information in JSON format:
    - nombre: a descriptive name for the image
    - categoria: one of [animes, personajes, objetos, abstracto, paisajes]
    - tags: array of relevant keywords (max 5)
    - color: dominant color or color scheme
    - estilo: one of [cartoon, realista, minimalista, abstracto]
    - orientacion: one of [horizontal, vertical, cuadrada]
    - premium: boolean indicating if this should be a premium image
    Please respond only with the JSON object, no additional text.`;

    // Convert image to base64
    const base64Image = imageBytes.toString('base64');
    
    try {
      const result = await model.generateContent([prompt, {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }]);
      
      const response = await result.response;
      const jsonResponse = JSON.parse(response.text());
      
      return jsonResponse as ImageMetadata;
    } catch (error) {
      console.error('Error processing image with Gemini:', error);
      throw error;
    }
  }

  private static async uploadImageToSupabase(
    imageBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `personalizacion/${uniqueFileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600'
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
  }

  private static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Resize if image is too large while maintaining aspect ratio
      if (metadata.width && metadata.width > 2000) {
        return await image
          .resize(2000, undefined, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer();
      }
      
      return await image
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw error;
    }
  }

  static async processAndUploadImage(
    imageBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    try {
      // Optimize image
      const optimizedBuffer = await this.optimizeImage(imageBuffer);
      
      // Process with Gemini and upload to Supabase in parallel
      const [metadata, publicUrl] = await Promise.all([
        this.processImageWithGemini(optimizedBuffer),
        this.uploadImageToSupabase(optimizedBuffer, fileName)
      ]);

      // Get image dimensions
      const dimensions = await sharp(optimizedBuffer).metadata();

      // Create database entry
      await prisma.imagenPersonalizacion.create({
        data: {
          ...metadata,
          ruta: publicUrl,
          ancho: dimensions.width || 0,
          alto: dimensions.height || 0,
        }
      });

      return publicUrl;
    } catch (error) {
      console.error('Error in processAndUploadImage:', error);
      throw error;
    }
  }

  static async processBatchImages(files: UploadedFile[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const file of files) {
      try {
        const url = await this.processAndUploadImage(file.buffer, file.originalname);
        results.push(url);
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        // Continue with next file even if one fails
      }
    }
    
    return results;
  }
}

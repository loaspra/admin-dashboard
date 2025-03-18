import { NextRequest, NextResponse } from 'next/server';
import { ImageService } from '@/app/lib/image-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Convert Files to UploadedFile format
    const processableFiles = await Promise.all(
      files.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        originalname: file.name,
        mimetype: file.type,
        size: file.size
      }))
    );

    const results = await ImageService.processBatchImages(processableFiles);

    return NextResponse.json({ 
      success: true, 
      urls: results 
    });
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json(
      { error: 'Error processing images' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Image upload API endpoint' });
}

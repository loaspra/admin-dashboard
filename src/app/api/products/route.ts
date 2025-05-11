import { NextRequest, NextResponse } from 'next/server';
import { 
  createRowProduct, 
  updateRowProduct, 
  deleteRow, 
  getProductData 
} from '@/app/lib/product-service';

export async function POST(request: NextRequest) {
  const productData = await request.json();
  const detailData = productData.detailData;

  try {
    await createRowProduct(productData, detailData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Error creating product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { productId, productData, detailData } = await request.json();

  try {
    await updateRowProduct(productId, productData, detailData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Error updating product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { productId } = await request.json();

  try {
    await deleteRow('product', productId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const page = parseInt(url.searchParams.get('page') || '0');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

  try {
    if (!type) {
      return NextResponse.json({ error: 'Product type is required' }, { status: 400 });
    }
    console.log(`Attempting to fetch product data for type: ${type}, page: ${page}, pageSize: ${pageSize}`);
    const result = await getProductData(type, page, pageSize);
    console.log(`Successfully fetched ${result.data.length} products of type: ${type} (page ${page}/${result.pagination.pageCount})`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching product data:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      type: type
    });
    return NextResponse.json(
      { 
        error: 'Error fetching product data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

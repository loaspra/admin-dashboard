import { NextRequest, NextResponse } from 'next/server';
import { getRecentOrders, getOrderById } from '@/app/lib/order-service';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '0');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
  
  try {
    if (id) {
      // Fetch specific order by ID
      const order = await getOrderById(id);
      // console.log('order with id', order);
      return NextResponse.json(order);
    } else {
      // Fetch paginated list of recent orders
      const orders = await getRecentOrders(page, pageSize);
      // console.log('orders not id', orders);
      return NextResponse.json(orders);
    }
  } catch (error) {
    console.error('Error in orders API route:', error);
    return NextResponse.json(
      { 
        error: 'Error fetching order data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

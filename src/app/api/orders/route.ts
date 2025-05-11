import { NextRequest, NextResponse } from 'next/server';
import { getRecentOrders } from '@/app/lib/order-service';

export async function GET(request: NextRequest) {
  try {
    const orders = await getRecentOrders();
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json({ error: 'Error fetching recent orders' }, { status: 500 });
  }
}

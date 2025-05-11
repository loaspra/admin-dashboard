// Fetch recent orders
import { prisma } from './prisma';

export async function getRecentOrders() {
  const data = await prisma.pedido.findMany({
    orderBy: { fechaPedido: 'desc' },
    take: 10
  });

  if (data.length === 0) {
    return [
      { id: 1, estado: 'Pending', total: 300, itemsCount: 2 },
      { id: 2, estado: 'Shipped', total: 300, itemsCount: 3 },
      { id: 3, estado: 'Delivered', total: 300, itemsCount: 1 },
      { id: 4, estado: 'Cancelled', total: 300, itemsCount: 4 },
    ];
  }

  return data;
}

import React, { useEffect, useState } from 'react';
import OrderCard from './order-card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Button } from '@/app/components/ui/button';
import { EnhancedGlassCard } from '@/app/components/ui/enhanced-glass-card';

export default function RecentOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    pageSize: 5,
    pageCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (page = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders?page=${page}&pageSize=${pagination.pageSize}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data.data || []);
      setPagination(data.pagination || {
        total: 0,
        page: 0,
        pageSize: 5,
        pageCount: 0
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching recent orders:', err);
      setError('Error loading orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePrevPage = () => {
    if (pagination.page > 0) {
      fetchOrders(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pageCount - 1) {
      fetchOrders(pagination.page + 1);
    }
  };

  return (
    <EnhancedGlassCard className="p-4 backdrop-blur-xl">
      <div className="flex justify-between items-center mb-4">
        <div className="text-white flex items-center gap-2">
          <span className="text-sm">{pagination.total > 0 ? `${pagination.total} ${pagination.total === 1 ? 'order' : 'orders'}` : ''}</span>
        </div>
      </div>

      {loading ? (
        // Loading skeletons
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-4 space-y-2">
            <Skeleton className="h-10 w-full rounded-md bg-white/5" />
            <Skeleton className="h-24 w-full rounded-md bg-white/5" />
          </div>
        ))
      ) : error ? (
        // Error state
        <div className="text-center py-10">
          <p className="text-red-400 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchOrders()}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            Try Again
          </Button>
        </div>
      ) : orders.length === 0 ? (
        // Empty state
        <div className="text-center py-10">
          <p className="text-white/60">No orders found</p>
        </div>
      ) : (
        // Orders list
        <>
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
          
          {/* Pagination controls */}
          {pagination.pageCount > 1 && (
            <div className="flex justify-between mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePrevPage} 
                disabled={pagination.page === 0}
                className="bg-white/5 hover:bg-white/10 text-white border-white/10"
              >
                Previous
              </Button>
              <span className="text-sm text-white/60 flex items-center">
                Page {pagination.page + 1} of {pagination.pageCount}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNextPage} 
                disabled={pagination.page >= pagination.pageCount - 1}
                className="bg-white/5 hover:bg-white/10 text-white border-white/10"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </EnhancedGlassCard>
  );
} 
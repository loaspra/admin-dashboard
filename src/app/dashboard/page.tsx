'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DataTable } from './data-table';
import { ImageUpload } from './image-upload';
import { Button } from '@/app/components/ui/button';
import { Carousel, CarouselItem } from '@/app/components/ui/carousel'; // Importing Shadcn Carousel
import { Card, CardHeader, CardContent } from '@/app/components/ui/card'; // Importing Shadcn Card components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'; // Importing Shadcn Dialog components
import { Input } from '@/app/components/ui/input'; // Importing Shadcn Input component
import { toast } from 'sonner';
// import { getRecentOrders } from '@/app/lib/api'; // Updated import

export default function Dashboard() {
  const [recentOrders, setRecentOrders] = useState<any[]>([]); // State for recent orders
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'edit' | 'create' | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [productData, setProductData] = useState<any[]>([]); // State for product data
  const [pagination, setPagination] = useState({ 
    page: 0, 
    pageSize: 10, 
    total: 0, 
    pageCount: 0 
  });
  const [newProductData, setNewProductData] = useState<any>({}); // State for new product data

  // Define product types based on schema
  const productTypes = [
    'gorra',
    'polera',
    'polo',
    'termo',
    'sticker',
    'stickerSheet'
  ];

  const fetchRecentOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders'); // Fetch recent orders from the API
      if (!response.ok) {
        throw new Error('Failed to fetch recent orders');
      }
      const orders = await response.json();
      setRecentOrders(orders);
    } catch (error) {
      toast.error("Failed to load recent orders");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

const fetchProductData = async (type: string, page = 0, pageSize = 10) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?type=${type}&page=${page}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }
      const result = await response.json();
      
      setProductData(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast.error("Failed to load product data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchRecentOrders(); // Fetch recent orders on component mount
  // });


  const handleDataChange = () => {
    fetchProductData(selectedProductType, pagination.page, pagination.pageSize);
  };

  const handlePageChange = (newPage: number) => {
    fetchProductData(selectedProductType, newPage, pagination.pageSize);
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    fetchProductData(selectedProductType, 0, newPageSize);
  };

  const openModal = (type: 'edit' | 'create') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleProductTypeChange = (type: string) => {
    console.log('Selected product type:', type);
    setSelectedProductType(type);
    fetchProductData(type); // Fetch product data when type is selected
  };

  const handleCreateProduct = async () => {
    try {
      const response = await fetch(`/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProductData),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      toast.success("Product created successfully");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to create product");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-1/4 bg-white shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Management</h2>
        <Card className="mb-4">
          <CardHeader>Manage Products</CardHeader>
          <CardContent>
            <Button onClick={() => openModal('edit')}>Edit/Delete Products</Button>
            <Button onClick={() => openModal('create')} className="mt-2">Create New Product</Button>
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>View Orders</CardHeader>
          <CardContent>
            <Button onClick={() => {/* Logic to view orders */}}>View Orders</Button>
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>User Management</CardHeader>
          <CardContent>
            <Button onClick={() => {/* Logic for user management */}}>Manage Users</Button>
          </CardContent>
        </Card>
        <Card className="mb-4">
          <CardHeader>Batch Image Upload</CardHeader>
          <CardContent>
            <ImageUpload />
          </CardContent>
        </Card>
      </aside>

      {/* Center Area */}
      <main className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">          
          {/* Center Area for Main Graph */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Main Graph</h2>
            {/* Placeholder for the main graph */}
            <div className="h-64 bg-gray-200 flex items-center justify-center">
              <p>Graph will be displayed here</p>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-1/4 bg-white shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <Carousel>
          {recentOrders.map(order => (
            <CarouselItem key={order.id}>
              <Card>
                <CardHeader>{order.userName}</CardHeader>
                <CardContent>
                  <p>Status: {order.estado}</p>
                  <p>Total: {order.total}</p>
                  <p>Items: {order.itemsCount}</p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </Carousel>
      </aside>

      {/* Modal for Product Management */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle>{modalType === 'edit' ? 'Edit/Delete Product' : 'Create New Product'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 h-full">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Product Type:</label>
              {/* Dropdown for selecting product type */}
              <select 
                className="w-full p-2 border rounded"
                onChange={(e) => handleProductTypeChange(e.target.value)}
                value={selectedProductType}
              >
                <option value="">Select a type</option>
                {productTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
              </div>
            )}
            
            {/* Conditional rendering for DataTable or Form based on modalType */}
            {!isLoading && modalType === 'edit' && selectedProductType && (
              <div className="mt-4">
                <DataTable 
                  tableName={selectedProductType} 
                  data={productData} 
                  onDataChange={handleDataChange}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
            
            {!isLoading && modalType === 'create' && (
              <form onSubmit={handleCreateProduct}>
                {/* Form fields for creating a new product */}
                <Input placeholder="Product Name" required />
                <Input placeholder="Description" className="mt-2" />
                {/* Add other fields as necessary */}
                <Button type="submit" className="mt-4">Create Product</Button>
              </form>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
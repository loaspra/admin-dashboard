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
  const [newProductData, setNewProductData] = useState<any>({}); // State for new product data

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

const fetchProductData = async (type: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?type=${type}`); // Fetch data for the selected product type
      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }
      const data = await response.json(); // array of products

      setProductData(data);
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
    fetchProductData(selectedProductType);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalType === 'edit' ? 'Edit/Delete Product' : 'Create New Product'}</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <p>Select Product Type:</p>
            {/* Dropdown for selecting product type */}
            <select onChange={(e) => handleProductTypeChange(e.target.value)}>
              <option value="">Select a type</option>
              <option value="Gorra">Gorra</option>
              <option value="Polera">Polera</option>
              <option value="Polo">Polo</option>
              <option value="Termo">Termo</option>
              {/* Add other product types as needed */}
            </select>
            {/* Conditional rendering for DataTable or Form based on modalType */}
            {modalType === 'edit' ? (
              <DataTable 
                tableName={selectedProductType} 
                data={productData} 
                onDataChange={handleDataChange} 
              />
            ) : (
              <form onSubmit={handleCreateProduct}>
                {/* Form fields for creating a new product */}
                <Input placeholder="Product Name" required />
                <Input placeholder="Description" />
                {/* Add other fields as necessary */}
                <Button type="submit">Create Product</Button>
              </form>
            )}
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
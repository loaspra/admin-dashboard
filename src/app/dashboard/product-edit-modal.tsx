'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DataTable } from './data-table';
import { GlowEffect } from '@/app/components/ui/glow-effect';
import { motion } from 'framer-motion';
import { Edit, Loader2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define product types based on the backend implementation
const PRODUCT_TYPES = [
  { value: 'cap', label: 'Gorras' },
  { value: 'sweatshirt', label: 'Poleras' },
  { value: 'poloShirt', label: 'Polos' },
  { value: 'thermos', label: 'Termos' },
  { value: 'sticker', label: 'Stickers' },
  { value: 'stickerSheet', label: 'Sticker Sheets' }
];

// Define a Product interface based on your application's data model
interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  images?: string[];
  [key: string]: any; // For other dynamic properties
}

export function ProductEditModal({ isOpen, onClose }: ProductEditModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(PRODUCT_TYPES[0].value);

  // Fetch products when modal opens or tab changes
  useEffect(() => {
    if (isOpen && activeTab) {
      fetchProducts(activeTab);
    }
  }, [isOpen, activeTab]);

  const fetchProducts = async (productType: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/products?type=${productType}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to fetch products');
      }
      
      const result = await response.json();
      setProducts(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching products');
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle data change (refresh products after edit/delete)
  const handleDataChange = () => {
    fetchProducts(activeTab);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-[85vw] md:max-w-[90vw] lg:max-w-[95vw] max-h-[90vh] overflow-y-auto",
        "backdrop-blur-xl border-none rounded-xl shadow-xl",
        "bg-black/60 dark:bg-black/70 text-white",
        "relative overflow-hidden"
      )}>
        {/* Glow effect */}
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <GlowEffect
            colors={['#5D4FE8', '#9747FF', '#14B8A6', '#06B6D4']}
            mode="static"
            blur="strong"
            scale={1.2}
          />
        </div>
        
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
        
        <DialogHeader className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-white">
              <Edit className="h-5 w-5 text-primary" />
              Edit or Delete Products
            </DialogTitle>
          </motion.div>
        </DialogHeader>
        
        <div className="relative z-10 flex-1 overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="bg-black/30 border border-white/10 grid grid-cols-3 md:grid-cols-6 mb-4">
              {PRODUCT_TYPES.map((type) => (
                <TabsTrigger 
                  key={type.value} 
                  value={type.value}
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-white"
                >
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full flex flex-col"
            >
              {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-white/70">Loading products...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-red-500 p-4 text-center">
                  {error}
                </div>
              ) : products.length === 0 ? (
                <div className="text-white/70 p-8 text-center">
                  No products found for this category.
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <DataTable 
                    tableName={`${activeTab}-products`} 
                    data={products}
                    onDataChange={handleDataChange}
                  />
                </div>
              )}
            </motion.div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
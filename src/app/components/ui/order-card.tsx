import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { EnhancedGlassCard } from '@/components/ui/enhanced-glass-card';
import { motion } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import { ShoppingBag, User, MapPin, Instagram } from 'lucide-react';
import { ImageUtils } from '@/app/lib/image-utils';

type OrderCardProps = {
  order: any;
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(amount);
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'processing':
    case 'shipped':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

// Helper function to fix image paths
// Helper function to fix image paths
const fixImagePath = (imagePath: string) => {
  return ImageUtils.getPublicUrlFromStoragePath(imagePath);
};

// Helper function to get the appropriate image for an order item
const getOrderItemImage = (item: any) => {
  // Check if it's a custom sticker sheet product
  if (item.productId === 'template-sticker-product' && item.customization) {
    try {
      // Parse customization if it's a string
      const customization = typeof item.customization === 'string' 
        ? JSON.parse(item.customization) 
        : item.customization;
      
      console.log('Custom sticker sheet customization:', customization);
      
      // Use the exact format from the example (paths starting with /storage/images/personalizacion)
      if (customization.uploadedImagePath) {
        const path = customization.uploadedImagePath;
        console.log('Using uploadedImagePath:', path);
        
        if (path.startsWith('/storage/images/personalizacion/')) {
          // This is the exact format from the example
          // We need to avoid including "images" twice
          return `http://localhost:8000/storage/v1/object/public${path.replace('/storage/images', '/images')}`;
        }
        
        // Handle other /storage paths
        if (path.startsWith('/storage/')) {
          return `http://localhost:8000/storage/v1/object/public${path.replace('/storage', '')}`;
        }
        
        // Default case for other paths
        return `http://localhost:8000/storage/v1/object/public/images/${path}`;
      } 
      
      // Fall back to customImagePath if uploadedImagePath is not available
      if (customization.customImagePath) {
        const path = customization.customImagePath;
        console.log('Using customImagePath:', path);
        
        // If it's a personalizacion path but doesn't have the full prefix
        if (path.includes('personalizacion/') && !path.startsWith('/')) {
          return `http://localhost:8000/storage/v1/object/public/images/${path}`;
        }
        
        // Use the raw path
        return `http://localhost:8000/storage/v1/object/public/images/${path}`;
      }
    } catch (error) {
      console.error('Error parsing customization:', error);
    }
  }
  
  // Default to product image
  return item.Product?.images?.[0] ? fixImagePath(item.Product.images[0]) : '';
};

export default function OrderCard({ order }: OrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Determine what user data to display (from Supabase or Prisma)
  const userName = order.supabaseUser?.name || order.User?.firstName || 'Usuario';
  const userLastName = order.supabaseUser?.lastName || order.User?.lastName || '';
  const userFullName = `${userName} ${userLastName}`.trim();
  const userEmail = order.supabaseUser?.email || order.User?.email || '';
  const userPhone = order.supabaseUser?.phone || order.User?.phone || '';
  const userAddress = order.supabaseUser?.address || order.User?.address || '';
  const instagramUser = order.supabaseUser?.instagramUser || '';
  
  // Debug log to check if we're getting the instagramUser field
  console.log('OrderCard - supabaseUser:', order.supabaseUser);
  console.log('OrderCard - instagramUser:', instagramUser);
  
  // Format the order date
  const orderDate = new Date(order.orderDate);
  const formattedDate = formatDistanceToNow(orderDate, { 
    addSuffix: true,
    locale: es 
  });

  return (
    <>
      <EnhancedGlassCard 
        className="mb-4 hover:shadow-md transition-shadow duration-300 w-full"
        colorMode="static"
        blur="soft"
        glowColors={['#3B82F6', '#60A5FA', '#3B82F6', '#2563EB']}
      >
        <div className="p-4">
          <div className="flex justify-between items-start">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary/70" />
                <span className="text-lg font-medium text-white">
                  #{order.id.substring(0, 8)}
                </span>
                <Badge className={cn("ml-2", getStatusColor(order.status))}>
                  {order.status}
                </Badge>
              </div>
              <p className="text-sm text-white/60 mt-1">{formattedDate}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="text-right"
            >
              <p className="font-semibold text-white text-lg">
                {formatCurrency(order.totalAmount)}
              </p>
            </motion.div>
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <User className="h-3 w-3 text-white/60" />
            <div>
              <p className="text-sm text-white">{userFullName}</p>
              <p className="text-xs text-white/60 truncate">{userEmail}</p>
              {instagramUser && (
                <div className="flex items-center gap-1 mt-1">
                  <Instagram className="h-3 w-3 text-pink-400" />
                  <p className="text-xs text-pink-400">@{instagramUser}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full relative overflow-hidden group mt-2 border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                >
                  <span className="relative z-10 text-white group-hover:text-white transition-colors">Ver detalle</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-black/80 backdrop-blur-xl border border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Orden #{order.id.substring(0, 8)}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      {new Date(order.orderDate).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    {/* Status */}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Estado:</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    
                    {/* Customer Info */}
                    <EnhancedGlassCard className="p-4" colorMode="pulse" blur="soft">
                      <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-primary" />
                        Información del cliente
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-400">Nombre:</span>
                        <span className="text-white">{userFullName}</span>
                        
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{userEmail}</span>
                        
                        {instagramUser && (
                          <>
                            <span className="text-gray-400">Instagram:</span>
                            <span className="text-white">@{instagramUser}</span>
                          </>
                        )}
                        
                        <span className="text-gray-400">Teléfono:</span>
                        <span className="text-white">{userPhone}</span>
                        
                        <span className="text-gray-400">Dirección:</span>
                        <span className="text-white">{userAddress}</span>
                      </div>
                    </EnhancedGlassCard>
                    
                    {/* Order Items */}
                    <EnhancedGlassCard className="p-4" colorMode="static" blur="soft">
                      <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                        Productos
                      </h4>
                      <div className="space-y-3">
                        {order.OrderItem && order.OrderItem.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden border border-white/10">
                                <img 
                                  src={getOrderItemImage(item)} 
                                  alt={item.Product?.name || 'Producto personalizado'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {item.productId === 'template-sticker-product' 
                                    ? 'Sticker personalizado' 
                                    : (item.Product?.name || 'Producto')}
                                </p>
                                <p className="text-xs text-gray-400">Cant: {item.quantity}</p>
                                {item.customization && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {typeof item.customization === 'string'
                                      ? JSON.parse(item.customization).details || 'Personalizado'
                                      : item.customization.details || 'Personalizado'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-white">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </EnhancedGlassCard>
                    
                    {/* Order Summary */}
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between font-semibold text-lg">
                        <span className="text-white">Total:</span>
                        <span className="text-white">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      {order.deliveryDate && (
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-gray-400">Fecha de entrega estimada:</span>
                          <span className="text-white">{new Date(order.deliveryDate).toLocaleDateString('es-PE')}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Shipping Address */}
                    <EnhancedGlassCard className="p-4" colorMode="static" blur="soft">
                      <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Dirección de envío
                      </h4>
                      <p className="text-sm text-white">{order.shippingAddress}</p>
                    </EnhancedGlassCard>
                  </div>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </EnhancedGlassCard>
    </>
  );
} 
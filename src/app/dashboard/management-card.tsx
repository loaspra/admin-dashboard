'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCreateModal } from './product-create-modal';
import { ProductEditModal } from './product-edit-modal';
import { Package, Edit, Plus } from 'lucide-react';
import { EnhancedGlassCard } from '@/components/ui/enhanced-glass-card';

export function ManagementCard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Product Management Card */}
      <EnhancedGlassCard 
        className="overflow-hidden relative p-5"
        colorMode="pulse"
        glowColors={['#5D4FE8', '#9747FF', '#14B8A6', '#06B6D4']}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Manage Products
            </h3>
            <p className="text-white/60 mt-1">Create, edit, or delete product listings</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="default" 
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:flex-1 group relative overflow-hidden bg-primary/80 hover:bg-primary backdrop-blur-sm"
            >
              <span className="relative z-10 flex items-center gap-2 text-white">
                <Plus className="h-4 w-4" />
                Create New Product
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(true)}
              className="w-full sm:flex-1 group relative overflow-hidden border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit/Delete Products
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </div>
      </EnhancedGlassCard>

      {/* Create Product Modal */}
      <ProductCreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Edit/Delete Product Modal */}
      <ProductEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
    </motion.div>
  );
} 
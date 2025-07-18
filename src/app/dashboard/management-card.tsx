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
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Product Management Card */}
      <EnhancedGlassCard
        className="overflow-hidden relative p-5"
        colorMode="static"
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
              className="w-full sm:flex-1 bg-primary/20 hover:bg-primary/30 text-white border border-primary/30 hover:border-primary/50 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Product
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full sm:flex-1 border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit/Delete Products
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
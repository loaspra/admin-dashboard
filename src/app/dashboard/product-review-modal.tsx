'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/app/lib/utils';
import { motion } from 'framer-motion';
import { Check, X, Edit3, Plus, Trash2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  category: string;
  collection: string;
  color: string;
  style: string;
  orientation: string;
  premium: boolean;
  stock: number;
  imageUrl: string;
  productType: string;
}

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productData: ProductData;
  onSave: (updatedData: ProductData) => Promise<void>;
  onReject: () => void;
  // New props for navigation
  currentIndex?: number;
  totalProducts?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function ProductReviewModal({ 
  isOpen, 
  onClose, 
  productData, 
  onSave, 
  onReject,
  currentIndex = 0,
  totalProducts = 1,
  onNext,
  onPrevious
}: ProductReviewModalProps) {
  const [editedData, setEditedData] = useState<ProductData>(productData);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Update edited data when productData changes
  useEffect(() => {
    console.log('Product data changed:', {
      currentIndex,
      totalProducts,
      hasOnNext: !!onNext,
      hasOnPrevious: !!onPrevious,
      productName: productData.name
    });
    setIsNavigating(true);
    setEditedData(productData);
    // Small delay to show navigation animation
    const timer = setTimeout(() => setIsNavigating(false), 150);
    return () => clearTimeout(timer);
  }, [productData, currentIndex, totalProducts, onNext, onPrevious]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowLeft' && onPrevious && currentIndex > 0) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext && currentIndex < totalProducts - 1) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleReject();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, totalProducts, onNext, onPrevious]);

  const handleInputChange = (field: keyof ProductData, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !editedData.tags.includes(newTag.trim())) {
      setEditedData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditedData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(editedData);
      toast.success('Product saved successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to save product');
      console.error('Error saving product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh]",
        "backdrop-blur-xl border-none rounded-xl shadow-xl",
        "bg-slate-900/95 dark:bg-slate-950/95 text-white",
        "relative z-[95] flex flex-col overflow-hidden"
      )}>
        {/* Large Navigation Arrows - Left */}
        {totalProducts > 1 && onPrevious && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 border border-white/20 hover:bg-black/70 text-white disabled:opacity-30"
            title="Previous product (←)"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Large Navigation Arrows - Right */}
        {totalProducts > 1 && onNext && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={currentIndex === totalProducts - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 border border-white/20 hover:bg-black/70 text-white disabled:opacity-30"
            title="Next product (→)"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        <DialogHeader className="relative z-10 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                <Edit3 className="h-5 w-5 text-primary" />
                Review Product Data
              </DialogTitle>
              
              {/* Navigation Controls - Show when multiple products */}
              {totalProducts > 1 && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    disabled={!onPrevious || currentIndex === 0}
                    className="bg-slate-700/50 border-slate-600 hover:bg-slate-600 text-white disabled:opacity-50"
                    title="Previous product (←)"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="hidden sm:inline ml-1">Prev</span>
                  </Button>
                  
                  <div className="flex flex-col items-center gap-1 px-2">
                    <span className="text-sm text-white/90 font-medium">
                      {currentIndex + 1} of {totalProducts}
                    </span>
                    {/* Progress bar */}
                    <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / totalProducts) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNext}
                    disabled={!onNext || currentIndex === totalProducts - 1}
                    className="bg-slate-700/50 border-slate-600 hover:bg-slate-600 text-white disabled:opacity-50"
                    title="Next product (→)"
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 flex-1 overflow-y-auto p-1">
          {/* Navigation overlay */}
          {isNavigating && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="bg-primary/20 px-4 py-2 rounded-lg border border-primary/30">
                <span className="text-white text-sm">Loading product...</span>
              </div>
            </div>
          )}
          
          {/* Image Preview */}
          <motion.div
            className="space-y-4"
            key={`image-${currentIndex}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Label className="text-lg font-semibold text-white">Image Preview</Label>
            <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden max-w-xs mx-auto">
              <img
                src={editedData.imageUrl}
                alt={editedData.name}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Product Data Form */}
          <motion.div 
            className="space-y-4"
            key={`form-${currentIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Product Name */}
            <div>
              <Label htmlFor="name" className="text-white">Product Name</Label>
              <Input
                id="name"
                value={editedData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={editedData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white min-h-[80px]"
              />
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-white">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={editedData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="stock" className="text-white">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={editedData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value))}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Category and Collection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-white">Category</Label>
                <Input
                  id="category"
                  value={editedData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="collection" className="text-white">Collection</Label>
                <Input
                  id="collection"
                  value={editedData.collection}
                  onChange={(e) => handleInputChange('collection', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Style and Orientation */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="style" className="text-white">Style</Label>
                <Select value={editedData.style} onValueChange={(value) => handleInputChange('style', value)}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                    <SelectItem value="realista">Realistic</SelectItem>
                    <SelectItem value="minimalista">Minimalist</SelectItem>
                    <SelectItem value="abstracto">Abstract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="orientation" className="text-white">Orientation</Label>
                <Select value={editedData.orientation} onValueChange={(value) => handleInputChange('orientation', value)}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="cuadrada">Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color" className="text-white">Main Color</Label>
                <Input
                  id="color"
                  value={editedData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Premium Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="premium"
                checked={editedData.premium}
                onChange={(e) => handleInputChange('premium', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="premium" className="text-white">Premium Product</Label>
            </div>
          </motion.div>
        </div>

        {/* Tags Section */}
        <div className="space-y-4 relative z-10">
          <Label className="text-lg font-semibold text-white">Tags</Label>
          <div className="flex flex-wrap gap-2 mb-4">
            {editedData.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="bg-slate-700 text-white">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add new tag"
              className="bg-slate-800/50 border-slate-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button
              onClick={addTag}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="relative z-10 flex-shrink-0 flex flex-col gap-3 mt-4">
          {/* Keyboard shortcuts info */}
          {totalProducts > 1 && (
            <div className="text-xs text-white/50 text-center border-t border-slate-700 pt-3">
              Use ← → arrow keys to navigate | Ctrl+Enter to save | Esc to reject
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              className="relative overflow-hidden group border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Reject
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="relative overflow-hidden group border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-white"
            >
              <span className="relative z-10 flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="relative overflow-hidden group bg-green-600 hover:bg-green-500 text-white"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Product'}
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

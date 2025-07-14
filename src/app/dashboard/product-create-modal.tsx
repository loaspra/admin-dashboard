'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUpload } from './image-upload';
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { ProductReviewModal } from './product-review-modal';
import { cn } from '@/app/lib/utils';
import { Plus, X } from 'lucide-react';

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductCreateModal({ isOpen, onClose }: ProductCreateModalProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {});
  const [productsForReview, setProductsForReview] = useState<any[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const showConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmationTitle(title);
    setConfirmationMessage(message);
    setConfirmationAction(() => action);
    setConfirmationOpen(true);
  };

  const handleConfirmAction = () => {
    confirmationAction();
  };

  const handleProductsForReview = (products: any[]) => {
    setProductsForReview(products);
    setCurrentReviewIndex(0);
  };

  const handleSaveReviewedProduct = async (productData: any) => {
    try {
      const response = await fetch('/api/products/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      // Move to next product or close if this was the last one
      if (currentReviewIndex < productsForReview.length - 1) {
        setCurrentReviewIndex(currentReviewIndex + 1);
      } else {
        // All products reviewed
        setProductsForReview([]);
        setCurrentReviewIndex(0);
        onClose();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  };

  const handleNextProduct = () => {
    console.log('handleNextProduct called', { 
      currentIndex: currentReviewIndex, 
      totalProducts: productsForReview.length 
    });
    if (currentReviewIndex < productsForReview.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    }
  };

  const handlePreviousProduct = () => {
    console.log('handlePreviousProduct called', { 
      currentIndex: currentReviewIndex, 
      totalProducts: productsForReview.length 
    });
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex(currentReviewIndex - 1);
    }
  };

  const handleRejectProduct = () => {
    // Move to next product or close if this was the last one
    if (currentReviewIndex < productsForReview.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    } else {
      // All products processed
      setProductsForReview([]);
      setCurrentReviewIndex(0);
    }
  };

  const closeReviewModal = () => {
    setProductsForReview([]);
    setCurrentReviewIndex(0);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn(
          "max-w-4xl w-[90vw] max-h-[85vh] overflow-y-auto",
          "backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl",
          "bg-slate-900/95 text-white"
        )}>
          {/* Simplified glow effect */}
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 rounded-xl" />
          </div>
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-white">
              <Plus className="h-5 w-5 text-primary" />
              Create New Product
            </DialogTitle>
          </DialogHeader>
            
          <div className="relative z-10">
            <ImageUpload
              showConfirmation={showConfirmation}
              onSuccess={() => onClose()}
              onProductsForReview={handleProductsForReview}
            />
          </div>
            
          <DialogFooter className="relative z-10">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      <ConfirmationDialog
        isOpen={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={handleConfirmAction}
        title={confirmationTitle}
        description={confirmationMessage}
      />

      {/* Product Review Modal */}
      {productsForReview.length > 0 && (
        <>
          {console.log('Rendering ProductReviewModal with:', {
            currentIndex: currentReviewIndex,
            totalProducts: productsForReview.length,
            hasNextFunction: !!handleNextProduct,
            hasPreviousFunction: !!handlePreviousProduct,
            productName: productsForReview[currentReviewIndex]?.name
          })}
          <ProductReviewModal
            isOpen={true}
            onClose={closeReviewModal}
            productData={productsForReview[currentReviewIndex]}
            onSave={handleSaveReviewedProduct}
            onReject={handleRejectProduct}
            currentIndex={currentReviewIndex}
            totalProducts={productsForReview.length}
            onNext={handleNextProduct}
            onPrevious={handlePreviousProduct}
          />
        </>
      )}
    </>
  );
}
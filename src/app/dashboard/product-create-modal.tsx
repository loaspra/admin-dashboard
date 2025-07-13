'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageUpload } from './image-upload';
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
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
      </Dialog>

        <ConfirmationDialog
          isOpen={confirmationOpen}
          onClose={() => setConfirmationOpen(false)}
          onConfirm={handleConfirmAction}
          title={confirmationTitle}
          description={confirmationMessage}
        />
      </>
    );
} 
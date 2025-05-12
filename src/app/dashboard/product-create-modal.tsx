'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { ImageUpload } from './image-upload';
import { ConfirmationDialog } from "@/app/components/ui/confirmation-dialog";
import { cn } from '@/app/lib/utils';
import { GlowEffect } from '@/app/components/ui/glow-effect';
import { motion } from 'framer-motion';
import { Plus, FileUp, X } from 'lucide-react';

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductCreateModal({ isOpen, onClose }: ProductCreateModalProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {});

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
          "max-w-4xl max-h-[90vh] overflow-y-auto",
          "backdrop-blur-xl border-none rounded-xl shadow-xl",
          "bg-black/60 dark:bg-black/70 text-white",
          "relative"
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
                <Plus className="h-5 w-5 text-primary" />
                Create New Product
              </DialogTitle>
            </motion.div>
          </DialogHeader>
          
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="p-1 relative rounded-lg">
                <ImageUpload 
                  showConfirmation={showConfirmation}
                  onSuccess={() => onClose()}
                />
              </div>
            </motion.div>
          </div>
          
          <DialogFooter className="relative z-10">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="relative overflow-hidden group border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <span className="relative z-10 flex items-center gap-2">
                <X className="h-4 w-4" /> Cancel
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-destructive/20 to-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
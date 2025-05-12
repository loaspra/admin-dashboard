"use client"

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { GlowEffect } from '@/components/ui/glow-effect';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'warning'
}: ConfirmationDialogProps) {
  const variantStyles = {
    danger: {
      iconColor: "text-destructive",
      bgGradient: "from-destructive/30 via-destructive/20 to-transparent",
      buttonVariant: "destructive" as const,
      glowColors: ['#E11D48', '#F43F5E', '#9F1239', '#881337'],
      icon: AlertCircle
    },
    warning: {
      iconColor: "text-amber-600",
      bgGradient: "from-amber-500/30 via-amber-400/20 to-transparent",
      buttonVariant: "default" as const,
      glowColors: ['#F59E0B', '#FBBF24', '#D97706', '#B45309'],
      icon: AlertCircle
    },
    info: {
      iconColor: "text-primary",
      bgGradient: "from-primary/30 via-primary/20 to-transparent",
      buttonVariant: "default" as const,
      glowColors: ['#5D4FE8', '#9747FF', '#14B8A6', '#06B6D4'],
      icon: Info
    }
  };

  const { iconColor, bgGradient, buttonVariant, glowColors, icon: Icon } = variantStyles[variant];

  // Create a portal container if it doesn't exist
  React.useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('confirmation-dialog-root')) {
      const portalRoot = document.createElement('div');
      portalRoot.id = 'confirmation-dialog-root';
      document.body.appendChild(portalRoot);
    }
    return () => {
      if (typeof document !== 'undefined') {
        const portalRoot = document.getElementById('confirmation-dialog-root');
        if (portalRoot && !portalRoot.hasChildNodes()) {
          portalRoot.remove();
        }
      }
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
          <DialogPortal container={typeof document !== 'undefined' ? document.getElementById('confirmation-dialog-root') : undefined}>
            <DialogOverlay className="z-[999] bg-black/70" />
            <DialogContent 
              className={cn(
                "sm:max-w-[425px] p-0 overflow-hidden",
                "backdrop-blur-xl border-none rounded-xl shadow-xl",
                "bg-black/60 dark:bg-black/70 text-white",
                "fixed inset-auto top-[50%] left-[50%] transform-gpu",
                "z-[1000] max-h-screen"
              )}
              style={{
                transform: 'translate(-50%, -50%)'
              }}
              onEscapeKeyDown={onClose}
              onPointerDownOutside={onClose}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <GlowEffect
                  colors={glowColors}
                  mode="pulse"
                  blur="strong"
                  scale={1.2}
                />
              </div>
              
              <div className="relative z-10 p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader className="flex flex-col items-center text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 15,
                        delay: 0.1 
                      }}
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center mb-4",
                        "bg-white/10 backdrop-blur-sm shadow-xl",
                        iconColor
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </motion.div>
                    
                    <DialogTitle className="text-xl font-semibold text-white">
                      {title}
                    </DialogTitle>
                    
                    <DialogDescription className="mt-2 text-center text-gray-300">
                      {description}
                    </DialogDescription>
                  </DialogHeader>

                  <DialogFooter className="flex flex-row justify-center gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="relative overflow-hidden group border-white/10 bg-white/5 hover:bg-white/10 text-white w-full sm:w-auto"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <X className="h-4 w-4" /> {cancelText}
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Button>
                    
                    <Button
                      variant={buttonVariant}
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                      className="relative overflow-hidden group w-full sm:w-auto"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> {confirmText}
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                    </Button>
                  </DialogFooter>
                </motion.div>
              </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default ConfirmationDialog; 
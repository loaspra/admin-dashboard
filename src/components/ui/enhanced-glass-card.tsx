'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/app/lib/utils';
import { GlowEffect } from '@/components/ui/glow-effect';

interface EnhancedGlassCardProps {
  children: ReactNode;
  className?: string;
  colorMode?: 'static' | 'pulse' | 'colorShift';
  hoverEffect?: boolean;
  glowColors?: string[];
  blur?: 'soft' | 'medium' | 'strong';
  [key: string]: any;
}

export function EnhancedGlassCard({
  children,
  className,
  colorMode = 'static',
  hoverEffect = true,
  glowColors = ['#5D4FE8', '#9747FF', '#14B8A6', '#06B6D4'],
  blur = 'medium',
  ...props
}: EnhancedGlassCardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10',
        'bg-black/40 backdrop-blur-xl dark:bg-black/60',
        'shadow-lg hover:shadow-xl transition-all duration-300',
        className
      )}
      {...props}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <GlowEffect
          colors={glowColors}
          mode={colorMode}
          blur={blur}
          scale={1.1}
        />
      </div>

      {/* Inner highlight effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
      
      {/* Card edge highlights */}
      <div className="absolute inset-[1px] rounded-[11px] pointer-events-none">
        <div className="absolute inset-0 rounded-[11px] bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-50" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
} 
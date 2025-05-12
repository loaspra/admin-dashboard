'use client';

import { useTheme } from '@/contexts/theme-context';
import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full w-10 h-10 glass-card backdrop-blur-lg border border-primary/10 shadow-lg relative overflow-hidden group"
      >
        <span className="sr-only">Toggle theme</span>
        <span className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/40 group-hover:opacity-80 transition-opacity duration-300 opacity-90" />
        
        {theme === 'dark' ? (
          <Moon className="h-5 w-5 relative z-10" />
        ) : (
          <Sun className="h-5 w-5 relative z-10" />
        )}
        
        <span className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
      </Button>
    </motion.div>
  );
} 
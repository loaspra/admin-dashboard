'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { cn } from '@/app/lib/utils';
import { toast } from 'sonner';
import { ManagementCard } from './management-card';
import { BarChart3, Activity, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import RecentOrders from '@/app/components/ui/recent-orders';
import { EnhancedGlassCard } from '@/app/components/ui/enhanced-glass-card';
import { GlowEffect } from '@/app/components/ui/glow-effect';
import { useTheme } from '@/contexts/theme-context';
import { AuroraBackground } from '@/app/components/ui/aurora-background';

// Type definitions
interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  colorMode?: 'static' | 'pulse' | 'colorShift';
  glowColors?: string[];
  [key: string]: any;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  glowColors?: string[];
  delay?: number;
}

// Animated floating orbs for background
const BackgroundOrbs = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [orbs, setOrbs] = useState<{top: string; left: string; width: string; height: string}[]>([]);
  
  useEffect(() => {
    // Generate random orb positions on client-side only to avoid hydration mismatch
    setOrbs(
      [...Array(7)].map(() => ({
        width: `${180 + Math.random() * 300}px`,
        height: `${180 + Math.random() * 300}px`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
      }))
    );
  }, []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ 
            duration: 3 + (i % 5),
            repeat: Infinity,
            delay: i * 0.7,
            repeatType: 'reverse'
          }}
          className={cn(
            "absolute rounded-full",
            isDark ? "bg-primary/20" : "bg-primary/10",
            "blur-3xl"
          )}
          style={{
            width: orb.width,
            height: orb.height,
            top: orb.top,
            left: orb.left,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color, glowColors, delay = 0 }: StatsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="w-full"
    >
      <EnhancedGlassCard 
        className="p-5"
        colorMode="static"
        glowColors={glowColors}
      >
        <div className="flex items-center">
          <div className={cn(
            "p-3 rounded-xl", 
            color
          )}>
            {icon}
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <h3 className="text-2xl font-bold text-white">{value}</h3>
          </div>
        </div>
      </EnhancedGlassCard>
    </motion.div>
  );
};

// Graph Placeholder Component
const GraphPlaceholder = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="h-[300px] relative overflow-hidden rounded-xl"
    >
      <EnhancedGlassCard className="h-full" colorMode="pulse" blur="medium">
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          <Activity className="h-12 w-12 text-white/40 mb-3 animate-pulse" />
          <p className="text-gray-400">Graph data will be displayed here</p>
        </div>
      </EnhancedGlassCard>
    </motion.div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <AuroraBackground className="min-h-screen">
      {/* Background elements */}
      <BackgroundOrbs />
      
      <div className="container mx-auto p-6 relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/70">Welcome to your admin dashboard</p>
        </motion.div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard 
            title="Total Revenue" 
            value="S/ 12,345" 
            icon={<DollarSign className="h-5 w-5 text-white" />}
            color="bg-emerald-500"
            glowColors={['#059669', '#10B981', '#059669', '#047857']}
            delay={0.1}
          />
          <StatsCard 
            title="Total Orders" 
            value="17" 
            icon={<ShoppingBag className="h-5 w-5 text-white" />}
            color="bg-blue-500"
            glowColors={['#3B82F6', '#60A5FA', '#3B82F6', '#2563EB']}
            delay={0.2}
          />
          <StatsCard 
            title="Sales Growth" 
            value="+24%" 
            icon={<TrendingUp className="h-5 w-5 text-white" />}
            color="bg-purple-500"
            glowColors={['#8B5CF6', '#A78BFA', '#8B5CF6', '#7C3AED']}
            delay={0.3}
          />
          <StatsCard 
            title="Average Sale" 
            value="S/ 42.50" 
            icon={<BarChart3 className="h-5 w-5 text-white" />}
            color="bg-amber-500"
            glowColors={['#F59E0B', '#FBBF24', '#F59E0B', '#D97706']}
            delay={0.4}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Management Section */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 text-white">Management</h2>
            <ManagementCard />
          </div>
          
          {/* Main Graph Section */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 text-white">Sales Overview</h2>
            <GraphPlaceholder />
          </div>
          
          {/* Recent Orders Section */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-3"
            >
              <h2 className="text-xl font-bold mb-4 text-white">Recent Orders</h2>
              <RecentOrders />
            </motion.div>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
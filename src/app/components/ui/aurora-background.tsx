'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/app/lib/utils';

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
}: {
  className?: string;
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const listener = (e: MouseEvent) => {
      if (!ref.current) return;
      
      const { clientX, clientY } = e;
      const x = Math.round((clientX / window.innerWidth) * 100);
      const y = Math.round((clientY / window.innerHeight) * 100);

      ref.current.style.setProperty('--x', `${x}%`);
      ref.current.style.setProperty('--y', `${y}%`);
    };

    window.addEventListener('mousemove', listener);

    // Add event listener to fix body height issues
    const resizeListener = () => {
      if (document.body.scrollHeight > window.innerHeight) {
        document.body.style.height = '100vh';
        document.body.style.overflowY = 'auto';
      }
    };
    
    window.addEventListener('resize', resizeListener);
    // Run once on mount
    resizeListener();

    return () => {
      window.removeEventListener('mousemove', listener);
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'fixed inset-0 min-h-screen w-full overflow-hidden bg-slate-950',
        className
      )}
      style={{ 
        height: '100vh',
        maxHeight: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),rgba(0,_0,_0,_0)_0%,rgba(0,_0,_0,_0.7)_70%)]"
        style={{
          opacity: showRadialGradient ? 1 : 0,
        }}
      />
      <div className="aurora-bg-gradient-wrapper">
        <div className="aurora-bg-gradient"></div>
      </div>
      <div className="relative z-10 h-full overflow-auto">{children}</div>
    </div>
  );
} 
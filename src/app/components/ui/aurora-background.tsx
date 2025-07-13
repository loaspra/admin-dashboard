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



    return () => {
      window.removeEventListener('mousemove', listener);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'relative w-full h-screen overflow-hidden bg-slate-950',
        className
      )}
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
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// This component renders children into a DOM node that exists outside 
// the DOM hierarchy of the parent component
export function Portal({ children }: { children: React.ReactNode }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    // Check if there's already a portal-root
    let element = document.getElementById('portal-root');
    
    // If not, create one
    if (!element) {
      element = document.createElement('div');
      element.id = 'portal-root';
      element.style.position = 'fixed';
      element.style.zIndex = '1000';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.pointerEvents = 'none'; // Allow clicks to pass through by default
      document.body.appendChild(element);
    }
    
    setPortalRoot(element);
    
    // Cleanup function to remove the portal-root if necessary
    return () => {
      // Only remove if there are no other portals
      if (element && element.childNodes.length === 0) {
        document.body.removeChild(element);
      }
    };
  }, []);
  
  // Only render the portal when we have a root element
  if (!portalRoot) {
    return null;
  }
  
  // Use React's createPortal to render the children into the portal root
  return createPortal(
    <div style={{ pointerEvents: 'auto' }}>
      {children}
    </div>,
    portalRoot
  );
} 
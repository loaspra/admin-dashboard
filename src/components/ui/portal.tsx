'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

// This component renders children into a DOM node that exists outside 
// the DOM hierarchy of the parent component
export function Portal({ children }: { children: React.ReactNode }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const createdElement = useRef<boolean>(false);
  
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
      element.style.overflow = 'auto'; // Enable scrolling
      document.body.appendChild(element);
      createdElement.current = true;
    }
    
    setPortalRoot(element);
    
    // Cleanup function to remove the portal-root if necessary
    return () => {
      // Only remove if we created it and it exists and has no other children
      if (createdElement.current && element && document.body.contains(element) && element.childNodes.length === 0) {
        try {
          document.body.removeChild(element);
        } catch (error) {
          // Silently ignore if element is already removed
          console.warn('Portal cleanup: Element already removed from DOM');
        }
      }
    };
  }, []);
  
  // Only render the portal when we have a root element
  if (!portalRoot) {
    return null;
  }
  
  // Use React's createPortal to render the children into the portal root
  return createPortal(
    <div style={{ 
      pointerEvents: 'auto',
      maxHeight: '100vh',
      overflow: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      {children}
    </div>,
    portalRoot
  );
} 
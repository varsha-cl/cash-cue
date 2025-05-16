import { useEffect } from 'react';

// Custom hook to prevent body scrolling when chat is active
export const useScrollLock = (isActive: boolean) => {
  useEffect(() => {
    if (!isActive) return;
    
    // Save the current body overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
    
    // Restore original style when component unmounts or isActive changes
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isActive]);
}; 
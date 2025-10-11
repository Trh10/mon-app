"use client";
import { useEffect, useState } from 'react';

/**
 * Simple responsive breakpoint hook.
 * - Returns true when window width <= 768px (tailwind md breakpoint).
 * - SSR safe (defaults to false until mounted).
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [breakpoint]);

  return isMobile;
}

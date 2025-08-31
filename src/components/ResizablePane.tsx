"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@lib/cn";

export function ResizablePane({
  leftPane,
  rightPane,
  defaultLeftWidth = 400,
  minLeftWidth = 300,
  maxLeftWidth = 800,
  className = ""
}: {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
}) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;
    
    // Applique les limites
    const clampedWidth = Math.max(
      minLeftWidth,
      Math.min(maxLeftWidth, newLeftWidth)
    );
    
    setLeftWidth(clampedWidth);
  }, [isResizing, minLeftWidth, maxLeftWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={cn("flex h-full", className)}>
      {/* Panneau gauche */}
      <div 
        style={{ width: leftWidth }}
        className="flex-shrink-0 bg-white border-r border-gray-300"
      >
        {leftPane}
      </div>
      
      {/* Diviseur redimensionnable */}
      <div
        className={cn(
          "w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors duration-150 relative group",
          isResizing && "bg-blue-500"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Indicateur visuel */}
        <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-1 h-8 bg-blue-500 rounded-full shadow-sm"></div>
        </div>
        
        {/* Zone de grip élargie pour faciliter le clic */}
        <div className="absolute inset-y-0 -left-2 -right-2"></div>
      </div>
      
      {/* Panneau droit */}
      <div className="flex-1 min-w-0 bg-gray-50">
        {rightPane}
      </div>
    </div>
  );
}
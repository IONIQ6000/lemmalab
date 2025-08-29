"use client";

import * as React from "react";

/**
 * Wrapper component that suppresses hydration warnings for elements
 * commonly modified by browser extensions like Dark Reader
 */
export function BrowserExtensionSafe({ 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning {...props}>
      {children}
    </div>
  );
}

/**
 * SVG wrapper that handles browser extension modifications
 */
export function SafeSVG({ 
  children, 
  ...props 
}: React.SVGAttributes<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg suppressHydrationWarning {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { suppressHydrationWarning: true } as any);
        }
        return child;
      })}
    </svg>
  );
}

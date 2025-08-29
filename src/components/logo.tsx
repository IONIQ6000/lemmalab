"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LogoProps extends React.SVGAttributes<SVGSVGElement> {
  title?: string;
}

// Minimal, modern take on ∀ (universal quantifier):
// - Geometric inverted arch with cap
// - Rounded joints, stroke follows currentColor to match theme
export function Logo({ className, title = "LemmaLab", ...props }: LogoProps) {
  const titleId = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-labelledby={titleId}
      className={cn("block", className)}
      suppressHydrationWarning
      {...props}
    >
      <title id={titleId}>{title}</title>
      <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning>
        {/* Top cap */}
        <path d="M10 12 H38" />
        {/* Inverted arch (suggestive of ∀) */}
        <path d="M12 36 L24 14 L36 36" />
        {/* Subtle baseline */}
        <path d="M16 39 H32" opacity="0.6" />
      </g>
    </svg>
  );
}



// components/ui/LinkText.tsx
import { AnchorHTMLAttributes, ReactNode } from 'react';
import Link from "next/link";
import { cn } from '@/utils/cn';

type LinkTextVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'muted';
type LinkTextSize = 'xs' | 'sm' | 'md' | 'lg';

interface LinkTextProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: ReactNode;
  className?: string;
  variant?: LinkTextVariant;
  size?: LinkTextSize;
  disabled?: boolean;
  external?: boolean;
  href?: string | null;
  target?: string;
}

export default function LinkText({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  external = false,
  href = null,
  target = '_blank',
  ...props
}: LinkTextProps) {
  const baseStyles = 'inline-flex items-center gap-1 transition-colors duration-200 hover:underline';

  const variants: Record<LinkTextVariant, string> = {
    primary: 'text-primary hover:text-primary/80',
    secondary: 'text-gray-600 hover:text-gray-800',
    danger: 'text-red-600 hover:text-red-700',
    success: 'text-green-600 hover:text-green-700',
    muted: 'text-gray-500 hover:text-gray-600'
  };

  const sizes: Record<LinkTextSize, string> = {
    lg: 'text-lg',
    md: 'text-base',
    sm: 'text-sm',
    xs: 'text-xs'
  };

  const classes = cn(
    baseStyles,
    variants[variant] || variants.primary,
    sizes[size],
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  );

  // If no href provided, render as span
  if (!href) {
    return (
      <span className={classes} {...(props as React.HTMLAttributes<HTMLSpanElement>)}>
        {children}
      </span>
    );
  }

  // External links
  if (external) {
    return (
      <a
        href={href}
        target={target}
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  // Internal Next.js links
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

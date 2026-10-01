// components/ui/IconButton.tsx
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type IconButtonVariant = 'ghost' | 'ghost-danger' | 'ghost-active' | 'ghost-toggle';
type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}

/**
 * IconButton component for external action buttons in document builder
 * Specialized for toggle, settings, delete, and other icon-only actions
 */
export default function IconButton({
  children,
  className = '',
  variant = 'ghost',
  size = 'md',
  disabled = false,
  active = false,
  title,
  ...props
}: IconButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring';

  const getVariantClass = (): string => {
    switch (variant) {
      case 'ghost':
        return 'text-gray-400 hover:text-primary hover:bg-gray-100';
      case 'ghost-danger':
        return 'text-gray-400 hover:text-red-600 hover:bg-red-50';
      case 'ghost-active':
        return 'text-primary bg-brand-muted hover:bg-brand-muted';
      case 'ghost-toggle':
        return active
          ? 'text-primary bg-brand-muted hover:bg-brand-muted'
          : 'text-gray-400 hover:text-primary hover:bg-gray-100';
      default:
        return 'text-gray-400 hover:text-primary hover:bg-gray-100';
    }
  };

  const sizes: Record<IconButtonSize, string> = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  return (
    <button
      className={cn(
        baseStyles,
        getVariantClass(),
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      title={title}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

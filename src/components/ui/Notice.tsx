// components/ui/Notice.tsx
import { AlertCircle, Info, CheckCircle, XCircle, AlertTriangle, Globe, Users, X, LucideIcon } from 'lucide-react';
import { useState, ReactNode, CSSProperties } from 'react';
import { cn } from '@/utils/cn';

type NoticeVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'public' | 'private';
type NoticeSize = 'xs' | 'sm' | 'default' | 'lg';
type BrandSpacing = 'compact' | 'medium' | 'spacious';
type BrandBorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';

interface VariantConfig {
  container: string;
  icon: string;
  title: string;
}

interface SizeConfig {
  container: string;
  icon: string;
  title: string;
  text: string;
  spacing: string;
}

interface NoticeProps {
  icon?: LucideIcon | ReactNode;
  title?: string;
  text?: string;
  children?: ReactNode;
  variant?: NoticeVariant;
  size?: NoticeSize;
  className?: string;
  dismissible?: boolean;
  dismissKey?: string | null;
  persistDismissal?: boolean;
  onDismiss?: (() => void) | null;
  brandedVariant?: 'branded' | null;
  brandSpacing?: BrandSpacing;
  brandBorderRadius?: BrandBorderRadius;
  brandFontFamily?: string | null;
}

export default function Notice({
  icon,
  title,
  text,
  children,
  variant = 'default',
  size = 'default',
  className = '',
  dismissible = false,
  dismissKey = null,
  persistDismissal = false,
  onDismiss = null,
  brandedVariant = null,
  brandSpacing = 'medium',
  brandBorderRadius = 'medium',
  brandFontFamily = null
}: NoticeProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (dismissible && dismissKey && persistDismissal) {
      try {
        return localStorage.getItem(`notice-dismissed-${dismissKey}`) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    if (dismissKey && persistDismissal) {
      try {
        localStorage.setItem(`notice-dismissed-${dismissKey}`, 'true');
      } catch {
        // localStorage not available
      }
    }
    if (onDismiss) onDismiss();
  };

  if (isDismissed) return null;

  const getBrandSpacingClass = (): string => {
    switch (brandSpacing) {
      case 'compact': return 'p-3';
      case 'spacious': return 'p-6';
      default: return 'p-4';
    }
  };

  const getBrandBorderRadiusClass = (): string => {
    switch (brandBorderRadius) {
      case 'none': return 'rounded-none';
      case 'small': return 'rounded-sm';
      case 'large': return 'rounded-lg';
      case 'full': return 'rounded-full';
      default: return 'rounded-md';
    }
  };

  const getBrandedStyles = (): CSSProperties =>
    brandFontFamily ? { fontFamily: brandFontFamily } : {};

  const variants: Record<NoticeVariant, VariantConfig> = {
    default: {
      container: 'border-amber-200 text-amber-700 bg-amber-50',
      icon: 'text-amber-600',
      title: 'text-amber-900',
    },
    info: {
      container: 'border-primary/50 text-foreground bg-brand-muted',
      icon: 'text-foreground',
      title: 'text-foreground',
    },
    success: {
      container: 'border-green-200 text-green-700 bg-green-50',
      icon: 'text-green-600',
      title: 'text-green-900',
    },
    warning: {
      container: 'border-amber-200 text-amber-700 bg-amber-50',
      icon: 'text-amber-600',
      title: 'text-amber-900',
    },
    error: {
      container: 'border-red-200 text-red-700 bg-red-50',
      icon: 'text-red-600',
      title: 'text-red-900',
    },
    neutral: {
      container: 'border-gray-200 text-gray-700 bg-gray-50',
      icon: 'text-gray-600',
      title: 'text-gray-900',
    },
    public: {
      container: 'border-green-200 bg-green-50 text-green-700',
      icon: 'text-green-600',
      title: 'text-green-900',
    },
    private: {
      container: 'border-gray-200 bg-gray-50 text-gray-700',
      icon: 'text-gray-600',
      title: 'text-gray-900',
    },
  };

  const sizes: Record<NoticeSize, SizeConfig> = {
    xs: { container: 'p-2', icon: 'w-3 h-3', title: 'text-xs', text: 'text-xs', spacing: 'space-x-2' },
    sm: { container: 'p-3', icon: 'w-4 h-4', title: 'text-sm', text: 'text-xs', spacing: 'space-x-2' },
    default: { container: 'p-4', icon: 'w-5 h-5', title: 'text-sm', text: 'text-sm', spacing: 'space-x-3' },
    lg: { container: 'p-6', icon: 'w-6 h-6', title: 'text-base', text: 'text-sm', spacing: 'space-x-4' },
  };

  const iconMap: Record<NoticeVariant, LucideIcon> = {
    default: AlertCircle,
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    neutral: Info,
    public: Globe,
    private: Users,
  };

  const DefaultIcon = iconMap[variant];
  const iconSize = sizes[size].icon;

  return (
    <div
      className={cn(
        'border flex items-start relative text-left',
        brandedVariant ? getBrandBorderRadiusClass() : 'rounded-lg',
        brandedVariant ? getBrandSpacingClass() : sizes[size].container,
        sizes[size].spacing,
        variants[variant]?.container,
        className
      )}
      style={getBrandedStyles()}
    >
      <div className={cn('mt-0.5 flex-shrink-0', variants[variant]?.icon)}>
        {icon ? (icon as ReactNode) : <DefaultIcon className={iconSize} />}
      </div>
      <div className="flex-1 space-y-1">
        {title && (
          <p
            className={cn('font-medium', variants[variant]?.title, sizes[size].title)}
            style={getBrandedStyles()}
          >
            {title}
          </p>
        )}
        {text && <p className={sizes[size].text} style={getBrandedStyles()}>{text}</p>}
        <div style={getBrandedStyles()}>{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={cn('mt-0.5 flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black/10 transition-colors', variants[variant]?.icon)}
          title="Dismiss"
          type="button"
        >
          <X className={iconSize} />
        </button>
      )}
    </div>
  );
}

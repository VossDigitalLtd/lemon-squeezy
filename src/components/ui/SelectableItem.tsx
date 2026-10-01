// components/ui/SelectableItem.tsx
'use client';
import { ReactNode } from 'react';
import { Check } from 'lucide-react';

type ItemSize = 'sm' | 'md' | 'lg';
type ItemVariant = 'default' | 'compact';

interface Badge {
  label: string;
  className?: string;
}

interface SelectableItemProps {
  item?: unknown;
  isSelected?: boolean;
  onToggle?: (item: unknown) => void;
  title?: string;
  subtitle?: string;
  description?: string;
  icon?: string | (() => ReactNode) | ReactNode;
  badges?: Badge[];
  selectable?: boolean;
  disabled?: boolean;
  className?: string;
  showCheckbox?: boolean;
  variant?: ItemVariant;
  size?: ItemSize;
}

export default function SelectableItem({
  item,
  isSelected = false,
  onToggle,
  title,
  subtitle,
  description,
  icon,
  badges = [],
  selectable = true,
  disabled = false,
  className = '',
  showCheckbox = false,
  variant = 'default',
  size = 'md',
}: SelectableItemProps) {
  const handleClick = () => {
    if (selectable && !disabled && onToggle) {
      onToggle(item);
    }
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm': return 'p-3 space-x-3';
      case 'lg': return 'p-6 space-x-6';
      default: return 'p-4 space-x-4';
    }
  };

  const getVariantClasses = (): string => {
    const baseClasses = 'relative w-full transition-all duration-200 text-left';
    const sizeClasses = getSizeClasses();
    if (variant === 'compact') {
      return `${baseClasses} p-3 space-x-3 border rounded-md ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`;
    }
    return `${baseClasses} ${sizeClasses} border rounded-lg ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`;
  };

  const buttonClasses = [
    getVariantClasses(),
    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
    className,
  ].join(' ').trim();

  const flexSpacing = variant === 'compact' ? 'space-x-3' :
    size === 'sm' ? 'space-x-3' :
    size === 'lg' ? 'space-x-6' : 'space-x-4';

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <div className={`rounded-lg bg-gray-100 flex items-center justify-center text-lg ${
          size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
        }`}>
          {icon}
        </div>
      );
    }
    if (typeof icon === 'function') {
      return (
        <div className={`rounded-lg bg-gray-50 flex items-center justify-center ${
          size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-3' : 'p-2'
        }`}>
          {(icon as () => ReactNode)()}
        </div>
      );
    }
    return icon as ReactNode;
  };

  return (
    <button type="button" onClick={handleClick} disabled={disabled} className={buttonClasses}>
      <div className={`flex items-center ${flexSpacing}`}>
        {icon && <div className="flex-shrink-0">{renderIcon()}</div>}

        {showCheckbox && (
          <div className="flex-shrink-0">
            <div className={`rounded border-2 flex items-center justify-center ${
              size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
            } ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
              {isSelected && <Check className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className={`font-semibold text-gray-900 truncate ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
            }`}>
              {title}
            </h4>
            {badges.map((badge, index) => (
              <span key={index} className={`px-2 py-1 text-xs rounded-full ${badge.className || 'bg-gray-100 text-gray-700'}`}>
                {badge.label}
              </span>
            ))}
          </div>
          {subtitle && (
            <p className={`text-gray-600 mb-1 truncate ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {subtitle}
            </p>
          )}
          {description && (
            <p className={`text-gray-500 truncate ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}`}>
              {description}
            </p>
          )}
        </div>

        {isSelected && !showCheckbox && (
          <div className="flex-shrink-0">
            <div className={`rounded-full bg-blue-500 flex items-center justify-center ${
              size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
            }`}>
              <Check className={`text-white ${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

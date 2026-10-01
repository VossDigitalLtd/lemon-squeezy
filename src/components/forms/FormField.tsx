// components/forms/FormField.tsx — base wrapper: label + error + hint + char count
import { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui';
import type { BadgeConfig } from './types';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  minLength?: number;
  maxLength?: number;
  currentLength?: number;
  showCharCount?: boolean;
  badge?: BadgeConfig;
  children: ReactNode;
}

const FormField = ({
  label,
  required = false,
  error,
  hint,
  className = '',
  minLength,
  maxLength,
  currentLength = 0,
  showCharCount = false,
  badge,
  children,
}: FormFieldProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex justify-between items-baseline">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {(minLength || maxLength) && (
              <span className="text-xs font-normal text-gray-500 ml-2">
                {minLength && maxLength
                  ? `(${minLength}-${maxLength} chars)`
                  : minLength
                  ? `(min ${minLength} chars)`
                  : `(max ${maxLength} chars)`}
              </span>
            )}
          </label>
          {badge?.text && (
            <Badge
              variant={badge.variant ?? 'secondary'}
              className={`text-xs ${badge.className ?? ''}`}
            >
              {badge.text}
            </Badge>
          )}
          {showCharCount && (minLength || maxLength) && (
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                maxLength && currentLength > maxLength
                  ? 'text-red-600'
                  : minLength && currentLength < minLength
                  ? 'text-amber-600'
                  : 'text-gray-500'
              )}
            >
              {maxLength ? `${currentLength}/${maxLength}` : `${currentLength} chars`}
            </span>
          )}
        </div>
      )}

      {children}

      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}

      {error && (
        <div className="flex items-center text-sm text-red-600">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;

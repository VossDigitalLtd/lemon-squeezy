// components/forms/RadioField.tsx
import { ChangeEvent } from 'react';
import FormField from './FormField';
import { cn } from '@/utils/cn';
import type { SelectOption } from './types';

type RadioRenderStyle = 'radio' | 'button';

interface RadioFieldProps {
  label?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement> | { target: { value: string } }) => void;
  options?: SelectOption[];
  required?: boolean;
  error?: string;
  hint?: string;
  renderStyle?: RadioRenderStyle;
  disabled?: boolean;
  name?: string;
  className?: string;
  fieldClassName?: string;
}

const RadioField = ({
  label,
  value,
  onChange,
  options = [],
  required = false,
  error,
  hint,
  renderStyle = 'radio',
  disabled = false,
  name,
  className = '',
  fieldClassName = '',
}: RadioFieldProps) => {
  const hasError = Boolean(error);
  const fieldName = name ?? `radio-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={fieldClassName}
    >
      {renderStyle === 'button' ? (
        <div className={cn('flex flex-wrap gap-2', className)}>
          {options.map((option, index) => {
            const optionValue = option.value ?? `option-${index}`;
            const isSelected = value === optionValue;

            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => onChange?.({ target: { value: optionValue } })}
                disabled={disabled}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                  hasError && 'border-red-300',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={cn('space-y-2', className)}>
          {options.map((option, index) => (
            <div key={option.value ?? `option-${index}`} className="flex items-center">
              <input
                type="radio"
                id={`${fieldName}-${option.value ?? index}`}
                name={fieldName}
                value={option.value}
                checked={value === option.value}
                onChange={onChange as (e: ChangeEvent<HTMLInputElement>) => void}
                disabled={disabled}
                className={cn(
                  'h-4 w-4 text-primary focus:ring-ring border-gray-300',
                  hasError && 'border-red-300',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                )}
              />
              <label
                htmlFor={`${fieldName}-${option.value ?? index}`}
                className={cn(
                  'ml-2 text-sm',
                  hasError ? 'text-red-900' : 'text-gray-700',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      )}
    </FormField>
  );
};

export default RadioField;

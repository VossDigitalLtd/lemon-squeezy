// components/forms/CheckboxField.tsx
import { InputHTMLAttributes, ChangeEvent } from 'react';
import FormField from './FormField';
import { cn } from '@/utils/cn';

type CheckboxRenderStyle = 'checkbox' | 'toggle';

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string;
  checked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  fieldClassName?: string;
  renderStyle?: CheckboxRenderStyle;
}

const CheckboxField = ({
  label,
  checked,
  onChange,
  required = false,
  disabled = false,
  error,
  hint,
  className = '',
  fieldClassName = '',
  renderStyle = 'checkbox',
  ...props
}: CheckboxFieldProps) => {
  const hasError = Boolean(error);

  return (
    <FormField required={required} error={error} hint={hint} className={fieldClassName}>
      {renderStyle === 'toggle' ? (
        <label className="flex items-center">
          <div className="relative">
            <input
              type="checkbox"
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              className="sr-only"
              {...props}
            />
            <div
              className={cn(
                'block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out',
                checked ? 'bg-primary' : hasError ? 'bg-red-300' : 'bg-gray-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
            <div
              className={cn(
                'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm',
                checked && 'translate-x-4',
                disabled && 'cursor-not-allowed'
              )}
            />
          </div>
          <div className="ml-3 text-sm font-medium">
            <span className={cn(hasError ? 'text-red-900' : 'text-gray-700', disabled && 'opacity-50')}>
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </div>
        </label>
      ) : (
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              'h-4 w-4 text-primary focus:ring-ring border-gray-300 rounded',
              hasError && 'border-red-300',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            {...props}
          />
          <div className="ml-2 text-sm font-medium">
            <span className={cn(hasError ? 'text-red-900' : 'text-gray-700', disabled && 'opacity-50')}>
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </div>
        </label>
      )}
    </FormField>
  );
};

export default CheckboxField;

// components/forms/InputField.tsx
import { InputHTMLAttributes, ReactNode, ChangeEvent } from 'react';
import { Input } from '@/components/ui';
import FormField from './FormField';
import { cn } from '@/utils/cn';
import type { BadgeConfig } from './types';

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  maxLength?: number;
  minLength?: number;
  showCharCount?: boolean;
  autoFocus?: boolean;
  type?: string;
  disabled?: boolean;
  icon?: ReactNode;
  badge?: BadgeConfig | null;
  className?: string;
  fieldClassName?: string;
}

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  maxLength,
  minLength,
  showCharCount = false,
  autoFocus = false,
  type = 'text',
  disabled = false,
  icon,
  badge = null,
  className = '',
  fieldClassName = '',
  ...props
}: InputFieldProps) => {
  const hasError = Boolean(error);

  const inputEl = (
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      className={cn(
        icon && 'pl-10',
        hasError && 'border-red-300 focus:ring-red-500 focus:border-red-500',
        className
      )}
      {...props}
    />
  );

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={fieldClassName}
      minLength={minLength}
      maxLength={maxLength}
      currentLength={(value ?? '').length}
      showCharCount={showCharCount}
      badge={badge ?? undefined}
    >
      {icon ? (
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {icon}
          </div>
          {inputEl}
        </div>
      ) : (
        inputEl
      )}
    </FormField>
  );
};

export default InputField;

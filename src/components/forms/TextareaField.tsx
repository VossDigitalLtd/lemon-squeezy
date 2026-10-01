// components/forms/TextareaField.tsx
import { TextareaHTMLAttributes, ChangeEvent } from 'react';
import { Textarea } from '@/components/ui';
import FormField from './FormField';
import { cn } from '@/utils/cn';

interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  showCharCount?: boolean;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
}

const TextareaField = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  rows = 4,
  maxLength,
  minLength,
  showCharCount = true,
  disabled = false,
  className = '',
  fieldClassName = '',
  ...props
}: TextareaFieldProps) => {
  const hasError = Boolean(error);

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
    >
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          hasError && 'border-red-300 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
    </FormField>
  );
};

export default TextareaField;

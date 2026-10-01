// components/forms/SelectField.tsx — uses shadcn Select primitives
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import FormField from './FormField';
import { cn } from '@/utils/cn';
import type { SelectOption } from './types';

interface SelectFieldProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
}

const SelectField = ({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  required = false,
  error,
  hint,
  disabled = false,
  className = '',
  fieldClassName = '',
}: SelectFieldProps) => {
  const hasError = Boolean(error);

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={fieldClassName}
    >
      <Select value={value} onValueChange={onChange} disabled={disabled} required={required}>
        <SelectTrigger
          className={cn(hasError && 'border-red-300 focus:ring-red-500', className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
};

export default SelectField;

// components/forms/ToggleField.tsx — uses shadcn Switch
import { ReactNode } from 'react';
import FormField from './FormField';
import { Switch } from '@/components/ui';

interface ToggleFieldProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (e: { target: { checked: boolean } }) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
}

const ToggleField = ({
  label,
  checked,
  onChange,
  required = false,
  error,
  hint,
  description,
  disabled = false,
  className = '',
  fieldClassName = '',
}: ToggleFieldProps) => {
  const handleChange = (value: boolean) => {
    onChange?.({ target: { checked: value } });
  };

  return (
    <FormField error={error} hint={hint} className={fieldClassName}>
      <div className="flex items-center gap-3">
        <Switch
          checked={checked}
          onCheckedChange={handleChange}
          disabled={disabled}
          className={className}
        />
        {(label || description) && (
          <div>
            {label && (
              <span className="text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </span>
            )}
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        )}
      </div>
    </FormField>
  );
};

export default ToggleField;

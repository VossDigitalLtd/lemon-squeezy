// components/forms/DateField.tsx
import InputField from './InputField';

interface DateFieldProps {
  label?: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
}

const DateField = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  hint,
  minDate,
  maxDate,
  ...props
}: DateFieldProps) => {
  const formatDateForInput = (date: string | null | undefined): string => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    onChange?.(dateValue ? new Date(dateValue).toISOString() : null);
  };

  return (
    <InputField
      type="date"
      label={label}
      value={formatDateForInput(value)}
      onChange={handleDateChange}
      placeholder={placeholder}
      required={required}
      error={error}
      hint={hint}
      min={minDate ? formatDateForInput(minDate) : undefined}
      max={maxDate ? formatDateForInput(maxDate) : undefined}
      icon={
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      }
      {...props}
    />
  );
};

export default DateField;

// components/forms/TagField.tsx
import { useState } from 'react';
import InputField from './InputField';

interface TagFieldProps {
  label?: string;
  value?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  maxTagLength?: number;
  className?: string;
  fieldClassName?: string;
}

const TagField = ({
  label = 'Tags',
  value = [],
  onChange,
  placeholder = 'Enter tags separated by commas...',
  required = false,
  error,
  hint = 'Add tags to help with searching and organization',
  maxTagLength = 50,
  className = '',
  fieldClassName = '',
}: TagFieldProps) => {
  const [inputValue, setInputValue] = useState(Array.isArray(value) ? value.join(', ') : '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const tags = newValue
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && tag.length <= maxTagLength);
    onChange?.(tags);
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = value.filter((_, index) => index !== indexToRemove);
    onChange?.(newTags);
    setInputValue(newTags.join(', '));
  };

  return (
    <div className={fieldClassName}>
      <InputField
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        error={error}
        hint={hint}
        className={className}
      />
      {Array.isArray(value) && value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-muted text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 text-primary hover:text-primary/80 focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagField;

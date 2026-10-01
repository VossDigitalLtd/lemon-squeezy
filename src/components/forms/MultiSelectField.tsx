// components/forms/MultiSelectField.tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import FormField from './FormField';
import { cn } from '@/utils/cn';
import type { SelectOption } from './types';

type MultiSelectRenderStyle = 'checkbox' | 'button' | 'dropdown';

interface MultiSelectFieldProps {
  label?: string;
  value?: string[];
  onChange?: (e: { target: { value: string[] } }) => void;
  options?: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  maxSelections?: number;
  renderStyle?: MultiSelectRenderStyle;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
}

const MultiSelectField = ({
  label,
  value = [],
  onChange,
  options = [],
  placeholder = 'Select options',
  required = false,
  error,
  hint,
  maxSelections,
  renderStyle = 'checkbox',
  disabled = false,
  className = '',
  fieldClassName = '',
}: MultiSelectFieldProps) => {
  const hasError = Boolean(error);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = Array.isArray(value) ? value : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectionChange = (optionValue: string, isChecked: boolean) => {
    let newValue: string[];
    if (isChecked) {
      newValue = [...selectedValues, optionValue];
      if (maxSelections && newValue.length > maxSelections) return;
    } else {
      newValue = selectedValues.filter((val) => val !== optionValue);
    }
    onChange?.({ target: { value: newValue } });
  };

  const isMaxReached = Boolean(maxSelections && selectedValues.length >= maxSelections);

  return (
    <FormField
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={fieldClassName}
    >
      <div className={cn('space-y-2', className)}>
        {options.length === 0 ? (
          <div
            className={cn(
              'border rounded-md p-3',
              hasError ? 'border-red-300' : 'border-gray-300',
              disabled ? 'bg-gray-50' : 'bg-white'
            )}
          >
            <p className="text-sm text-gray-500 italic">No options available</p>
          </div>
        ) : renderStyle === 'button' ? (
          <div className={cn('flex flex-wrap gap-2', className)}>
            {options.map((option, index) => {
              const optionValue = option.value ?? `option-${index}`;
              const isSelected = selectedValues.includes(optionValue);
              const isDisabled = disabled || (!isSelected && isMaxReached);
              return (
                <button
                  key={optionValue}
                  type="button"
                  onClick={() => handleSelectionChange(optionValue, !isSelected)}
                  disabled={isDisabled}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md border transition-colors',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    hasError && 'border-red-300',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : renderStyle === 'dropdown' ? (
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-left text-sm bg-white border rounded-md shadow-sm cursor-pointer',
                hasError ? 'border-red-300' : 'border-gray-300',
                disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50',
                isDropdownOpen && 'ring-1 ring-ring border-primary'
              )}
            >
              <div className="flex-1">
                {selectedValues.length === 0 ? (
                  <span className="text-gray-500">{placeholder}</span>
                ) : selectedValues.length === options.length ? (
                  <span className="text-gray-900">All selected</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedValues.slice(0, 3).map((val) => {
                      const option = options.find((opt) => opt.value === val);
                      return (
                        <span
                          key={val}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-brand-muted text-primary"
                        >
                          {option?.label ?? val}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectionChange(val, false);
                            }}
                            className="ml-1 text-primary hover:text-primary/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    {selectedValues.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{selectedValues.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronDown
                className={cn('w-4 h-4 transition-transform', isDropdownOpen && 'rotate-180')}
              />
            </div>
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {(!maxSelections || options.length <= maxSelections) && (
                  <div className="px-3 py-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        const allValues = options.map((opt) => opt.value);
                        const newValue =
                          selectedValues.length === options.length ? [] : allValues;
                        onChange?.({ target: { value: newValue } });
                      }}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                )}
                {options.map((option, index) => {
                  const optionValue = option.value ?? `option-${index}`;
                  const isSelected = selectedValues.includes(optionValue);
                  const isDisabled = disabled || (!isSelected && isMaxReached);
                  return (
                    <div
                      key={optionValue}
                      onClick={() => !isDisabled && handleSelectionChange(optionValue, !isSelected)}
                      className={cn(
                        'flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={isDisabled}
                        className="h-4 w-4 text-primary focus:ring-ring border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Checkbox style (default)
          <div
            className={cn(
              'border rounded-md p-3 max-h-48 overflow-y-auto space-y-2',
              hasError ? 'border-red-300' : 'border-gray-300',
              disabled ? 'bg-gray-50' : 'bg-white'
            )}
          >
            {options.map((option, index) => {
              const optionValue = option.value ?? `option-${index}`;
              const isSelected = selectedValues.includes(optionValue);
              const isDisabled = disabled || (!isSelected && isMaxReached);
              const inputId = `multiselect-${typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : 'field'}-${optionValue}`;
              return (
                <div key={optionValue} className="flex items-center">
                  <input
                    type="checkbox"
                    id={inputId}
                    checked={isSelected}
                    onChange={(e) => handleSelectionChange(optionValue, e.target.checked)}
                    disabled={isDisabled}
                    className={cn(
                      'h-4 w-4 text-primary focus:ring-ring border-gray-300 rounded',
                      hasError ? 'border-red-300' : 'border-gray-300',
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    )}
                  />
                  <label
                    htmlFor={inputId}
                    className={cn(
                      'ml-2 text-sm',
                      hasError ? 'text-red-900' : 'text-gray-700',
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    )}
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {(selectedValues.length > 0 || maxSelections) && (
          <div className="text-xs text-gray-500">
            {selectedValues.length > 0 && `${selectedValues.length} selected`}
            {maxSelections && ` (max: ${maxSelections})`}
          </div>
        )}
        {isMaxReached && (
          <div className="text-xs text-amber-600">Maximum number of selections reached</div>
        )}
      </div>
    </FormField>
  );
};

export default MultiSelectField;

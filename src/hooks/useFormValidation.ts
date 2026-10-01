// hooks/useFormValidation.ts
import { useState, useEffect, useCallback } from 'react';
import { isValidEmail } from '@/lib/supabase/utils/validation';

// Types
export interface ValidationRule {
  required?: boolean;
  requiredMessage?: string;
  type?: 'email' | 'text';
  emailMessage?: string;
  minLength?: number;
  minLengthMessage?: string;
  maxLength?: number;
  maxLengthMessage?: string;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: string, values: Record<string, string>) => string | undefined;
}

export type ValidationRules = Record<string, ValidationRule>;

export interface FormValidationOptions {
  debounceDelay?: number;
  validateOnMount?: boolean;
  clearErrorsOnChange?: boolean;
}

export interface UseFormValidationReturn {
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isValidating: boolean;
  setValue: (field: string, value: string) => void;
  updateValues: (newValues: Record<string, string>) => void;
  handleChange: (field: string) => (value: string | { target: { value: string } }) => void;
  clearErrors: () => void;
  clearError: (field: string) => void;
  reset: () => void;
  validateForm: (touchedOnly?: boolean) => boolean;
  isFieldValid: (field: string) => boolean;
  getFieldError: (field: string) => string | undefined;
}

/**
 * Flexible form validation hook with debounced validation
 */
export function useFormValidation(
  initialValues: Record<string, string> = {},
  validationRules: ValidationRules = {},
  options: FormValidationOptions = {}
): UseFormValidationReturn {
  const {
    debounceDelay = 1200,
    validateOnMount = false,
    clearErrorsOnChange = true,
  } = options;

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Validation function with optional touched-only mode
  const validateForm = useCallback((touchedOnly = false): boolean => {
    const newErrors: Record<string, string | undefined> = {};

    Object.keys(validationRules).forEach((field) => {
      // If touchedOnly mode, skip validation for untouched fields
      if (touchedOnly && !touched[field]) {
        return;
      }
      const rules = validationRules[field];
      const value = values[field];

      // Skip validation for empty optional fields
      if (!rules.required && (!value || value.toString().trim() === '')) {
        return;
      }

      // Required field validation
      if (rules.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = rules.requiredMessage || `${field} is required`;
        return;
      }

      // Built-in validation types
      if (rules.type === 'email' && value) {
        if (!isValidEmail(value)) {
          newErrors[field] = rules.emailMessage || 'Please enter a valid email address';
        }
      }

      // Custom validation function
      if (rules.custom && value) {
        const customError = rules.custom(value, values);
        if (customError) {
          newErrors[field] = customError;
        }
      }

      // Min/Max length validation
      if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = rules.minLengthMessage || `Minimum ${rules.minLength} characters required`;
      }

      if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[field] = rules.maxLengthMessage || `Maximum ${rules.maxLength} characters allowed`;
      }

      // Pattern validation
      if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternMessage || 'Invalid format';
      }
    });

    setErrors(newErrors);
    setIsValidating(false);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules, touched]);

  // Debounced validation function (only validates touched fields)
  const debouncedValidate = useCallback(() => {
    const timer = setTimeout(() => {
      validateForm(true); // touchedOnly = true for debounced validation
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [validateForm, debounceDelay]);

  // Trigger debounced validation when values change
  useEffect(() => {
    // Only validate if we have non-empty values AND fields have been touched
    const hasNonEmptyValues = Object.values(values).some(
      (value) => value && typeof value === 'string' && value.trim() !== ''
    );
    const hasTouchedFields = Object.keys(touched).length > 0;

    if (hasNonEmptyValues && hasTouchedFields && Object.keys(validationRules).length > 0) {
      setIsValidating(true);
      const cleanup = debouncedValidate();
      return cleanup;
    }
    return undefined;
  }, [values, touched, debouncedValidate, validationRules]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount && Object.keys(validationRules).length > 0) {
      validateForm();
    }
  }, [validateOnMount, validationRules, validateForm]);

  // Update form value and optionally clear errors
  const setValue = useCallback(
    (field: string, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Clear error immediately for better UX
      if (clearErrorsOnChange && errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors, clearErrorsOnChange]
  );

  // Handle input change (compatible with existing onChange patterns)
  const handleChange = useCallback(
    (field: string) => (value: string | { target: { value: string } }) => {
      // Handle both direct values and event objects
      const actualValue: string = typeof value === 'object' && value?.target
        ? value.target.value
        : value as string;
      setValue(field, actualValue);
    },
    [setValue]
  );

  // Set multiple values at once
  const updateValues = useCallback((newValues: Record<string, string>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Clear specific field error
  const clearError = useCallback((field: string) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  // Check if form is valid (no errors)
  const isValid = Object.keys(errors).filter((k) => errors[k] !== undefined).length === 0;

  // Check if specific field is valid
  const isFieldValid = useCallback(
    (field: string) => {
      return !errors[field];
    },
    [errors]
  );

  // Get error for specific field
  const getFieldError = useCallback(
    (field: string) => {
      return errors[field];
    },
    [errors]
  );

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    // Form state
    values,
    errors,
    touched,
    isValid,
    isValidating,

    // Form actions
    setValue,
    updateValues,
    handleChange,
    clearErrors,
    clearError,
    reset,

    // Validation actions
    validateForm,
    isFieldValid,
    getFieldError,
  };
}

/**
 * Common validation rules that can be reused across forms
 */
export const commonValidationRules: Record<string, ValidationRule> = {
  email: {
    required: true,
    type: 'email',
    requiredMessage: 'Email is required',
    emailMessage: 'Please enter a valid email address',
  },

  firstName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    requiredMessage: 'First name is required',
    maxLengthMessage: 'First name cannot exceed 50 characters',
  },

  lastName: {
    required: true,
    minLength: 1,
    maxLength: 50,
    requiredMessage: 'Last name is required',
    maxLengthMessage: 'Last name cannot exceed 50 characters',
  },

  phone: {
    required: false,
    pattern: /^[+]?[\s\-\(\)\d]+$/,
    patternMessage: 'Please enter a valid phone number',
  },

  company: {
    required: false,
    maxLength: 100,
    maxLengthMessage: 'Company name cannot exceed 100 characters',
  },

  jobTitle: {
    required: false,
    maxLength: 100,
    maxLengthMessage: 'Job title cannot exceed 100 characters',
  },
};

/**
 * Pre-configured validation rules for common form types
 */
export const formValidationPresets: Record<string, ValidationRules> = {
  contact: {
    first_name: commonValidationRules.firstName,
    last_name: commonValidationRules.lastName,
    email: commonValidationRules.email,
    phone: commonValidationRules.phone,
    company: commonValidationRules.company,
    job_title: commonValidationRules.jobTitle,
  },

};

export default useFormValidation;

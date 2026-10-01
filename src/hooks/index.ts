// hooks/index.ts
export { default as useLocalStorage } from './useLocalStorage';
export { default as useDebounce } from './useDebounce';
export { default as useToast } from './useToast';
export { default as useFormValidation } from './useFormValidation';

// Also export named exports from useFormValidation
export { commonValidationRules, formValidationPresets } from './useFormValidation';

// Re-export types
export type { ToastType } from './useToast';
export type {
  ValidationRule,
  ValidationRules,
  FormValidationOptions,
  UseFormValidationReturn
} from './useFormValidation';

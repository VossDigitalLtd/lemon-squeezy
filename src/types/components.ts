import { ReactNode, ComponentPropsWithoutRef, ChangeEvent } from 'react';

// Base field props shared by all form fields
export interface BaseFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Input field props
export interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
}

// Textarea field props
export interface TextareaFieldProps extends BaseFieldProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}

// Select option
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Select field props
export interface SelectFieldProps extends BaseFieldProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
}

// Button variants and sizes
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Button props
export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

// Modal sizes
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Modal props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
}

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast props
export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

// Card props
export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Spinner props
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Badge variants
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

// Badge props
export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

// Children only props
export interface ChildrenProps {
  children: ReactNode;
}

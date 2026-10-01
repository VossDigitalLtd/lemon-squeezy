// components/forms/types.ts — shared types for form components

export interface SelectOption {
  value: string;
  label: string;
}

export interface BadgeConfig {
  text: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

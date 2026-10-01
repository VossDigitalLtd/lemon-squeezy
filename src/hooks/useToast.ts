// Re-export from the global toast context.
// Import paths remain unchanged — call useToast() anywhere inside ToastProvider.
export { useToast as default, useToast } from '@/lib/toast/context';
export type { ToastType } from '@/components/ui/Toast';

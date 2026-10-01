// components/ui/ToastContainer.tsx
import Toast, { ToastData } from './Toast';

interface ToastContainerProps {
  toasts?: ToastData[];
  onRemoveToast: (id: number) => void;
}

export default function ToastContainer({ toasts = [], onRemoveToast }: ToastContainerProps) {
  if (!toasts?.length) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 space-y-3 z-50 w-full max-w-md px-4">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={onRemoveToast}
        />
      ))}
    </div>
  );
}

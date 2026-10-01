// components/ui/Spinner.tsx
import { cn } from '@/utils/cn';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerColor = 'blue' | 'gray' | 'red' | 'green' | 'yellow' | 'purple' | 'pink' | 'white' | 'current';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}

export default function Spinner({
  size = 'md',
  color = 'blue',
  className,
  ...props
}: SpinnerProps) {
  const sizes: Record<SpinnerSize, string> = {
    xs: 'h-3 w-3 border',
    sm: 'h-4 w-4 border',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
    xl: 'h-12 w-12 border-4'
  };

  const colors: Record<SpinnerColor, string> = {
    blue: 'border-primary border-t-transparent',
    gray: 'border-gray-600 border-t-transparent',
    red: 'border-red-600 border-t-transparent',
    green: 'border-green-600 border-t-transparent',
    yellow: 'border-yellow-600 border-t-transparent',
    purple: 'border-purple-600 border-t-transparent',
    pink: 'border-pink-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    current: 'border-current border-t-transparent'
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        sizes[size],
        colors[color],
        className
      )}
      {...props}
    />
  );
}

interface LoadingOverlayProps {
  show?: boolean;
  message?: string;
  className?: string;
  spinnerSize?: SpinnerSize;
  spinnerColor?: SpinnerColor;
}

export function LoadingOverlay({
  show = true,
  message = 'Loading...',
  className,
  spinnerSize = 'lg',
  spinnerColor = 'blue'
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className={cn(
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4 min-w-[200px]">
        <Spinner size={spinnerSize} color={spinnerColor} />
        {message && (
          <p className="text-gray-700 text-center">{message}</p>
        )}
      </div>
    </div>
  );
}

interface InlineLoaderProps {
  message?: string;
  className?: string;
  spinnerSize?: SpinnerSize;
  spinnerColor?: SpinnerColor;
}

export function InlineLoader({
  message = 'Loading...',
  className,
  spinnerSize = 'sm',
  spinnerColor = 'blue'
}: InlineLoaderProps) {
  return (
    <div className={cn('flex items-center gap-2 text-gray-600', className)}>
      <Spinner size={spinnerSize} color={spinnerColor} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

// components/ui/Tip.tsx
import { useState } from 'react';
import { X } from 'lucide-react';

interface TipProps {
  tip: string | null;
  dismissible?: boolean;
  dismissKey?: string | null;
  persistDismissal?: boolean;
  onDismiss?: (() => void) | null;
}

export default function Tip({
  tip,
  dismissible = false,
  dismissKey = null,
  persistDismissal = false,
  onDismiss = null
}: TipProps) {
  // Handle dismissal state
  const [isDismissed, setIsDismissed] = useState(() => {
    if (dismissible && dismissKey && persistDismissal) {
      try {
        return localStorage.getItem(`tip-dismissed-${dismissKey}`) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleDismiss = () => {
    setIsDismissed(true);

    // Store dismissal state if persistent
    if (dismissKey && persistDismissal) {
      try {
        localStorage.setItem(`tip-dismissed-${dismissKey}`, 'true');
      } catch {
        // localStorage not available
      }
    }

    // Call custom onDismiss handler if provided
    if (onDismiss) {
      onDismiss();
    }
  };

  // Don't render if no tip or dismissed
  if (!tip || isDismissed) return null;

  return (
    <p className="text-xs text-gray-600 m-0 flex items-start space-x-1 group">
      <strong className="text-nowrap">Tip:</strong>
      <span className="text-pretty flex-1">{tip}</span>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200"
          title="Dismiss tip"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </p>
  );
}

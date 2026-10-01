'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[admin error boundary]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full min-h-64 px-4">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">⚠</p>
        <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 text-sm">An unexpected error occurred in this section.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

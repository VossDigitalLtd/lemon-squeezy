'use client';

import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="rounded-md bg-red-50 p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Authentication Error</h2>
          <p className="text-red-700">
            There was an error confirming your email. The link may have expired or already been used.
          </p>
        </div>
        <div className="space-y-4">
          <Link href="/login" className="block text-primary hover:text-primary/80">
            Try signing in
          </Link>
          <Link href="/signup" className="block text-primary hover:text-primary/80">
            Create a new account
          </Link>
        </div>
      </div>
    </div>
  );
}

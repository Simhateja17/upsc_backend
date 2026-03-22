'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm" style={{ maxWidth: 500 }}>
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="font-inter font-bold text-[#111827] mb-2 text-2xl">
          Something went wrong!
        </h2>
        <p className="text-sm text-[#6B7280] mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

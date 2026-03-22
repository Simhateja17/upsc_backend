import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm" style={{ maxWidth: 500 }}>
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="font-inter font-bold text-[#111827] mb-2 text-2xl">
          Page Not Found
        </h2>
        <p className="text-sm text-[#6B7280] mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

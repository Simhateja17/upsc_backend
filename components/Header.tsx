'use client';

import Link from 'next/link';

const Header = () => {
  return (
    // Transparent header over the hero background
    <nav className="w-full bg-transparent absolute top-0 left-0 pt-4 pb-2 px-8 flex items-center justify-between z-50 border-b border-[#D8C784]/30">
      {/* Logo Section */}
      <Link href="/" className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="RiseWithJeet Logo" className="w-[78px] h-auto object-contain" />
      </Link>
      {/* Nav Links - Using a clean flex layout with no separators */}
      <div className="flex items-center gap-16">
        <Link href="/" className="text-white text-xl font-serif font-semibold hover:text-[#F5C75D] transition-colors">
          Home
        </Link>
        <Link href="/practice" className="text-white text-xl font-serif font-semibold hover:text-[#F5C75D] transition-colors">
          Daily Practice
        </Link>
        <Link href="/evaluation" className="text-white text-xl font-serif font-semibold hover:text-[#F5C75D] transition-colors">
          Answer Evaluation
        </Link>
        <Link href="/ai" className="text-white text-xl font-serif font-semibold hover:text-[#F5C75D] transition-colors">
          AI assistant
        </Link>
        <Link href="/videos" className="text-white text-xl font-serif font-semibold hover:text-[#F5C75D] transition-colors">
          Videos
        </Link>
        <Link href="/material" className="text-white text-xl font-serif font-semibold hover:text-[#F5C75D] transition-colors">
          Study Material
        </Link>
      </div>
      {/* Login & Sign Up Buttons */}
      <div className="flex items-center gap-3">
        <Link
          href="/login?tab=login"
          className="px-5 py-2.5 border-2 border-white text-white text-base font-semibold rounded-md hover:bg-white hover:text-black transition-all duration-200"
        >
          Login
        </Link>
        <Link
          href="/login?tab=signup"
          className="px-5 py-2.5 bg-[#F5C75D] text-black text-base font-semibold rounded-md hover:bg-[#FFC557] transition-all duration-200"
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
};

export default Header;

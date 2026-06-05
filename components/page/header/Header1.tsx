import Link from "next/link";

/**
 * Site Header — Layout 1
 * Light minimal style: white background, logo left, navigation right.
 */
export default function Header1() {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-xl font-extrabold text-gray-900 tracking-tight">
                    MySite
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-7">
                    <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                        Home
                    </Link>
                    <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                        Blog
                    </Link>
                    <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                        About
                    </Link>
                    <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                        Contact
                    </Link>
                </nav>

                {/* CTA */}
                <Link
                    href="/contact"
                    className="hidden md:inline-flex items-center px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition"
                >
                    Get Started
                </Link>

                {/* Mobile hamburger placeholder */}
                <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition" aria-label="Open menu">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </header>
    );
}

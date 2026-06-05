import Link from "next/link";

/**
 * Site Header — Layout 2
 * Dark gradient style: violet-to-purple gradient bar, centered logo, right nav.
 */
export default function Header2() {
    return (
        <header className="bg-linear-to-r from-violet-600 to-purple-700 sticky top-0 z-50 shadow-lg">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-xl font-extrabold text-white tracking-tight">
                    MySite
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-7">
                    <Link href="/" className="text-sm font-medium text-violet-100 hover:text-white transition">
                        Home
                    </Link>
                    <Link href="/blog" className="text-sm font-medium text-violet-100 hover:text-white transition">
                        Blog
                    </Link>
                    <Link href="/about" className="text-sm font-medium text-violet-100 hover:text-white transition">
                        About
                    </Link>
                    <Link href="/contact" className="text-sm font-medium text-violet-100 hover:text-white transition">
                        Contact
                    </Link>
                </nav>

                {/* CTA */}
                <Link
                    href="/contact"
                    className="hidden md:inline-flex items-center px-4 py-2 rounded-lg bg-white text-violet-700 text-sm font-semibold hover:bg-violet-50 transition shadow-md"
                >
                    Get Started
                </Link>

                {/* Mobile hamburger placeholder */}
                <button className="md:hidden p-2 rounded-lg text-violet-200 hover:bg-white/10 transition" aria-label="Open menu">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </header>
    );
}

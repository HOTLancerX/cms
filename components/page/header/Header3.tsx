import Link from "next/link";

/**
 * Site Header — Layout 3
 * Dark transparent style: dark semi-transparent bar with accent underline,
 * suited for pages with hero images/backgrounds behind.
 */
export default function Header3() {
    return (
        <header className="bg-[#0f1117]/95 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-xl font-extrabold text-white tracking-tight">
                    My<span className="text-violet-400">Site</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-7">
                    {[
                        { label: "Home", href: "/" },
                        { label: "Blog", href: "/blog" },
                        { label: "About", href: "/about" },
                        { label: "Contact", href: "/contact" },
                    ].map(({ label, href }) => (
                        <Link
                            key={href}
                            href={href}
                            className="text-sm font-medium text-gray-400 hover:text-white transition relative group"
                        >
                            {label}
                            <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-violet-400 group-hover:w-full transition-all duration-200" />
                        </Link>
                    ))}
                </nav>

                {/* CTA */}
                <Link
                    href="/contact"
                    className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition shadow-lg shadow-violet-500/25"
                >
                    Get Started
                </Link>

                {/* Mobile hamburger placeholder */}
                <button className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-white/10 transition" aria-label="Open menu">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </header>
    );
}

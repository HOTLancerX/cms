import Link from "next/link";

/**
 * Site Footer — Layout 3
 * Compact centered style: minimal single-row layout, suits dark pages (e.g. Header3).
 */
export default function Footer3() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-[#0f1117] border-t border-white/10 mt-auto">
            <div className="container py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Brand */}
                    <Link href="/" className="text-lg font-extrabold text-white tracking-tight">
                        My<span className="text-violet-400">Site</span>
                    </Link>

                    {/* Nav */}
                    <nav className="flex flex-wrap items-center justify-center gap-5">
                        {[
                            { label: "Home", href: "/" },
                            { label: "Blog", href: "/blog" },
                            { label: "About", href: "/about" },
                            { label: "Contact", href: "/contact" },
                            { label: "Privacy", href: "#" },
                            { label: "Terms", href: "#" },
                        ].map(({ label, href }) => (
                            <Link
                                key={label}
                                href={href}
                                className="text-sm text-gray-500 hover:text-white transition"
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    {/* Copyright */}
                    <p className="text-xs text-gray-600 whitespace-nowrap">
                        © {year} MySite
                    </p>
                </div>
            </div>
        </footer>
    );
}

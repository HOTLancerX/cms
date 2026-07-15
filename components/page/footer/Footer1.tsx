import Link from "next/link";

/**
 * Site Footer — Layout 1
 * Light minimal style: white background, four-column grid, bottom copyright bar.
 */
export default function Footer1() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="container py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand column */}
                    <div className="space-y-3">
                        <Link href="/" className="text-xl font-extrabold text-gray-900 tracking-tight">
                            MySite
                        </Link>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Building great digital experiences, one page at a time.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Company</h3>
                        <ul className="space-y-2">
                            {["About", "Blog", "Careers", "Contact"].map((item) => (
                                <li key={item}>
                                    <Link href={`/${item.toLowerCase()}`} className="text-sm text-gray-600 hover:text-gray-900 transition">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Resources</h3>
                        <ul className="space-y-2">
                            {["Documentation", "Support", "Privacy Policy", "Terms"].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Stay Updated</h3>
                        <p className="text-sm text-gray-500 mb-3">Subscribe to our newsletter.</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Your email"
                                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            />
                            <button className="px-3 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition">
                                →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gray-100">
                <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">© {year} MySite. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                        <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition">Privacy</Link>
                        <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

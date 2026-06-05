import Link from "next/link";

/**
 * Site Footer — Layout 2
 * Dark gradient style: matches Header2, violet-to-purple gradient band at top,
 * dark body with light text.
 */
export default function Footer2() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 mt-auto">
            {/* Top accent stripe */}
            <div className="h-1 bg-linear-to-r from-violet-500 via-purple-500 to-indigo-500" />

            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="space-y-3">
                        <Link href="/" className="text-xl font-extrabold text-white tracking-tight">
                            MySite
                        </Link>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Building great digital experiences, one page at a time.
                        </p>
                        {/* Social icons */}
                        <div className="flex items-center gap-3 pt-1">
                            {["twitter", "github", "linkedin"].map((s) => (
                                <Link
                                    key={s}
                                    href="#"
                                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                                    aria-label={s}
                                >
                                    <span className="text-xs text-gray-300 font-mono uppercase">{s[0]}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Company</h3>
                        <ul className="space-y-2">
                            {["About", "Blog", "Careers", "Contact"].map((item) => (
                                <li key={item}>
                                    <Link href={`/${item.toLowerCase()}`} className="text-sm text-gray-400 hover:text-white transition">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Resources</h3>
                        <ul className="space-y-2">
                            {["Documentation", "Support", "Privacy Policy", "Terms"].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-sm text-gray-400 hover:text-white transition">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Stay Updated</h3>
                        <p className="text-sm text-gray-400 mb-3">Subscribe to our newsletter.</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Your email"
                                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <button className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition">
                                →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">© {year} MySite. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                        <Link href="#" className="text-xs text-gray-500 hover:text-gray-300 transition">Privacy</Link>
                        <Link href="#" className="text-xs text-gray-500 hover:text-gray-300 transition">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

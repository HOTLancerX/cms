"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/Provider";
import Sidebar from "@/components/admin/Sidebar";
import { buildNavTree, type NavNode } from "@/components/admin/nav";
import { useActivePlugins } from "@/hook/useActivePlugins";
import { Icon } from "@iconify/react";
import Link from "next/link";


// ─── Convert NavNode tree → SidebarItem shape expected by Sidebar ─────────────
type SidebarItem = {
  icon: React.ReactNode;
  name: string;
  link?: string;
  subItems?: { name: string; link: string }[];
};

function navNodesToSidebarItems(nodes: NavNode[]): SidebarItem[] {
  return nodes.map((node) => {
    const icon = <Icon icon={node.icon} width={20} />;
    const link = `/admin/${node.slug}`.replace(/\/+$/, "") || "/admin";

    if (node.children.length > 0) {
      const parentAsFirstChild = { name: node.label, link };
      return {
        icon,
        name: node.label,
        subItems: [
          parentAsFirstChild,
          ...node.children.map((child) => ({
            name: child.label,
            link: `/admin/${child.slug}`,
          })),
        ],
      };
    }

    return { icon, name: node.label, link };
  });
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { user, loading } = useUser();
  const router = useRouter();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && user?.type !== "admin") {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // ── Active plugins — calls reregisterHooks internally, polls every 30 s ────
  // This populates _navItems (via addHook("admin.nav")) before we build the tree.
  const activePlugins = useActivePlugins();

  // Build nav tree after reregisterHooks has run (activePlugins !== null)
  const sidebarItems =
    activePlugins !== null
      ? navNodesToSidebarItems(buildNavTree(activePlugins))
      : [];

  // ── Responsive: detect mobile ───────────────────────────────────────────────
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ── Close sidebar on outside click (mobile) ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.getElementById("sidebar");
        const hamburger = document.getElementById("hamburger-btn");
        if (
          sidebar &&
          !sidebar.contains(event.target as Node) &&
          hamburger &&
          !hamburger.contains(event.target as Node)
        ) {
          setSidebarOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, sidebarOpen]);

  const handleLogOut = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "http://localhost:5000"}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-license-key": process.env.NEXT_PUBLIC_LICENSE_KEY ?? "",
          },
        }
      );
    } catch {
      // ignore network errors — still redirect
    }
    router.replace("/");
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon icon="svg-spinners:ring-resize" width={32} className="text-gray-400" />
      </div>
    );
  }

  if (!user || user.type !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed top-0 left-0 h-screen w-64 z-50 transition-all duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
      >
        <Sidebar items={sidebarItems} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm mb-6">
          <div className="container px-2 md:px-6">
            <div className="flex items-center justify-between w-full py-3">
              {/* Left Section */}
              <div className="flex items-center">
                <button
                  id="hamburger-btn"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? (
                    <Icon icon="mdi:close" width={30} />
                  ) : (
                    <Icon icon="mdi:menu" width={30} />
                  )}
                </button>
                <Link href="/admin" className="text-2xl font-bold text-gray-900">
                  Dashboard
                </Link>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-2 lg:space-x-4">
                {/* Quick Action Buttons */}
                <div className="flex items-center space-x-1 lg:space-x-2">
                  {/* Website Link */}
                  <Link
                    href="/"
                    target="_blank"
                    className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                    title="Visit Website"
                  >
                    <Icon icon="mdi:web" width={18} />
                  </Link>

                  {/* Add Post — Desktop Only */}
                  <Link
                    className="flex p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200"
                    href="/admin/posts/blog/new"
                    title="Add Blog Post"
                  >
                    <Icon icon="streamline-sharp:story-post" width={20} height={20} />
                  </Link>

                  {/* Users */}
                  <Link
                    href="/admin/users"
                    className="p-2 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200"
                    title="Users"
                  >
                    <Icon icon="mdi:account-group" width={18} />
                  </Link>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogOut}
                  className="flex items-center bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Icon icon="mdi:logout" width={14} />
                  <span className="hidden sm:inline ml-2">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container px-2 md:px-6 min-h-screen">
          {children}
          <footer>
            <div className="py-6 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Your Company Name. All rights reserved.
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";

type SidebarItem = {
    icon: React.ReactNode;
    name: string;
    link?: string;
    subItems?: { name: string; link: string }[];
};

type SidebarProps = {
    items: SidebarItem[];
    onClose?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ items, onClose }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const pathname = usePathname();

    const isActive = (path: string) => {
        // Only exact match - no partial matching
        return pathname === path;
    };

    useEffect(() => {
        items.forEach((item, index) => {
            if (
                item.subItems &&
                item.subItems.some((subItem) => isActive(subItem.link))
            ) {
                setActiveIndex(index);
            }
        });
    }, [pathname, items]);

    const handleItemClick = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const handleSubItemClick = () => {
        if (onClose) {
            onClose();
        }
    };

    return (
        <div className="w-64 h-screen bg-linear-to-r from-blue-600 to-purple-600 shadow-lg text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-slate-700">
                <div className="flex items-center space-x-2">
                    <Icon icon="devicon:react" className="text-white text-sm" width="20" height="20" />
                    <h2 className="font-bold text-lg">Admin Panels</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-white hover:bg-slate-700 transition-colors duration-200 md:hidden"
                >
                    <Icon icon="mdi:close" width={16} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2 sidebar-scroll bg-white">
                <ul className="space-y-1">
                    {items.map((item, index) => {
                        const isItemActive = activeIndex === index;
                        const hasActiveSubItem = item.subItems?.some((subItem) =>
                            isActive(subItem.link)
                        );
                        const isParentLinkActive = item.link && isActive(item.link);

                        return (
                            <li key={index} className="relative">
                                {item.link && !item.subItems ? (
                                    // Parent item with link and no subitems - acts as direct link
                                    <Link href={item.link} onClick={handleSubItemClick}>
                                        <div
                                            className={`flex items-center justify-between p-2 cursor-pointer transition-all duration-200 group ${isParentLinkActive
                                                ? "bg-linear-to-r from-blue-600 to-purple-600 shadow-lg"
                                                : "hover:bg-slate-700/50"
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className={`text-lg transition-colors duration-200 ${isParentLinkActive
                                                        ? "text-white"
                                                        : "text-gray-700 group-hover:text-white"
                                                        }`}
                                                >
                                                    {item.icon}
                                                </div>
                                                <span
                                                    className={`font-medium transition-colors duration-200 ${isParentLinkActive
                                                        ? "text-white"
                                                        : "text-gray-700 group-hover:text-white"
                                                        }`}
                                                >
                                                    {item.name}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ) : (
                                    // Parent item with subitems - expandable
                                    <div
                                        className={`flex items-center justify-between p-2 cursor-pointer transition-all duration-200 group ${isItemActive || hasActiveSubItem
                                            ? "bg-linear-to-r from-blue-600 to-purple-600 shadow-lg"
                                            : "hover:bg-slate-700/50"
                                            }`}
                                        onClick={() => handleItemClick(index)}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`text-lg transition-colors duration-200 ${isItemActive || hasActiveSubItem
                                                    ? "text-white"
                                                    : "text-gray-700 group-hover:text-white"
                                                    }`}
                                            >
                                                {item.icon}
                                            </div>
                                            <span
                                                className={`font-medium transition-colors duration-200 ${isItemActive || hasActiveSubItem
                                                    ? "text-white"
                                                    : "text-gray-700 group-hover:text-white"
                                                    }`}
                                            >
                                                {item.name}
                                            </span>
                                        </div>
                                        {item.subItems && (
                                            <div
                                                className={`transition-transform duration-200 ${isItemActive ? "rotate-90" : ""
                                                    }`}
                                            >
                                                <Icon
                                                    icon="mdi:chevron-right"
                                                    className={`text-sm ${isItemActive || hasActiveSubItem
                                                        ? "text-white"
                                                        : "text-gray-700 group-hover:text-white"
                                                        }`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submenu */}
                                {isItemActive && item.subItems && (
                                    <div className="mt-2 ml-2 animate-in slide-in-from-top-2 duration-200">
                                        {item.subItems.map((subItem, subIndex) => (
                                            <Link
                                                key={subIndex}
                                                href={subItem.link}
                                                onClick={handleSubItemClick}
                                            >
                                                <div
                                                    className={`flex items-center p-1.5 rounded mb-1 text-sm transition-all duration-200 group ${isActive(subItem.link)
                                                        ? "bg-gray-700 text-white shadow-md font-medium"
                                                        : "text-gray-700 hover:text-white hover:bg-gray-700"
                                                        }`}
                                                >
                                                    <div
                                                        className={`w-2 h-2 rounded-full mr-2 transition-colors duration-200 ${isActive(subItem.link)
                                                            ? "bg-white"
                                                            : "bg-gray-700 group-hover:bg-slate-300"
                                                            }`}
                                                    />
                                                    <span className="truncate">{subItem.name}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-2 border-t border-slate-700">
                <div className="flex items-center space-x-2 text-white">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                        <Icon icon="mdi:account-group" className="text-sm" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs">User Menu</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

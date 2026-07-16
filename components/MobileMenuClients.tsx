"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MenuItem } from "@/models/Menu";

const BuilderClient = dynamic(() => import("@/components/BuilderClient"), { ssr: false });

interface MobileMenuClientsProps {
  menuItems: MenuItem[];
  settings?: Record<string, any>;
  builderContent?: Record<string, any[]>;
}

export default function MobileMenuClients({
  menuItems,
  settings = {},
  builderContent = {},
}: MobileMenuClientsProps) {
  const [open, setOpen] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => setAnimateOpen(true), 20);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      setAnimateOpen(false);
      document.body.style.overflow = "";
    }
  }, [open]);

  const handleClose = () => {
    setAnimateOpen(false);
    setTimeout(() => setOpen(false), 300);
  };

  const icon = settings.mobile_icon || "solar:hamburger-menu-bold";
  const iconColor = settings.mobile_icon_color || "#111827";
  const iconSize = typeof settings.mobile_icon_size === "number" ? settings.mobile_icon_size : 24;
  const drawerBg = settings.mobile_drawer_bg || "#ffffff";
  const drawerText = settings.mobile_drawer_text || "#111827";
  const drawerActive = settings.mobile_drawer_active || "#00aaa6";
  const align = settings.mobile_align || "right";

  return (
    <div className={`flex w-full ${align === "right" ? "justify-end" : "justify-start"}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ color: iconColor }}
        className="p-2 rounded-lg hover:bg-black/5 transition flex items-center justify-center"
      >
        <Icon icon={icon} width={iconSize} height={iconSize} />
      </button>

      {open && typeof window !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300 ${
              animateOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleClose}
          />

          {/* Sliding Drawer */}
          <div
            className="fixed inset-y-0 z-[9999] w-[80vw] max-w-[340px] shadow-2xl flex flex-col transition-transform duration-300 ease-out"
            style={{
              backgroundColor: drawerBg,
              color: drawerText,
              right: align === "right" ? 0 : "auto",
              left: align === "left" ? 0 : "auto",
              transform: align === "right"
                ? (animateOpen ? "translateX(0)" : "translateX(100%)")
                : (animateOpen ? "translateX(0)" : "translateX(-100%)")
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-sm tracking-wider uppercase opacity-80">Menu</span>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-black/5 transition"
                style={{ color: drawerText }}
              >
                <Icon icon="solar:close-bold" width={20} />
              </button>
            </div>

            {/* Menu Items List */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {menuItems.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-2">No menu items.</p>
              ) : (
                <MobileDrawerList
                  items={menuItems}
                  onClose={handleClose}
                  depth={0}
                  textColor={drawerText}
                  activeColor={drawerActive}
                  builderContent={builderContent}
                />
              )}
            </nav>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

interface MobileDrawerListProps {
  items: MenuItem[];
  onClose: () => void;
  depth: number;
  textColor: string;
  activeColor: string;
  builderContent: Record<string, any[]>;
}

function MobileDrawerList({
  items,
  onClose,
  depth,
  textColor,
  activeColor,
  builderContent,
}: MobileDrawerListProps) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <MobileDrawerItem
          key={item.id}
          item={item}
          onClose={onClose}
          depth={depth}
          textColor={textColor}
          activeColor={activeColor}
          builderContent={builderContent}
        />
      ))}
    </ul>
  );
}

interface MobileDrawerItemProps {
  item: MenuItem;
  onClose: () => void;
  depth: number;
  textColor: string;
  activeColor: string;
  builderContent: Record<string, any[]>;
}

function MobileDrawerItem({
  item,
  onClose,
  depth,
  textColor,
  activeColor,
  builderContent,
}: MobileDrawerItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isBuilderItem = (item.displayStyle === "builder" || item.type === "builder") && !!item.builderId;
  const hasChildren = (item.children?.length ?? 0) > 0;
  const canExpand = hasChildren || isBuilderItem;

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-black/5 transition"
        style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
      >
        {item.image && (
          <img
            src={item.image}
            alt={item.label}
            className="w-5 h-5 object-cover rounded shrink-0"
          />
        )}
        <Link
          href={item.url}
          onClick={onClose}
          className="flex-1 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: textColor }}
        >
          {item.label}
        </Link>
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-black/10 transition"
            style={{ color: textColor }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <Icon
              icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
              width={18}
            />
          </button>
        )}
      </div>

      {canExpand && expanded && (
        <div className="mt-1">
          {isBuilderItem && builderContent[item.builderId!] ? (
            <div className="px-3 py-2 rounded-lg bg-black/5 overflow-hidden">
              <BuilderClient content={builderContent[item.builderId!]} />
            </div>
          ) : (
            <MobileDrawerList
              items={item.children || []}
              onClose={onClose}
              depth={depth + 1}
              textColor={textColor}
              activeColor={activeColor}
              builderContent={builderContent}
            />
          )}
        </div>
      )}
    </li>
  );
}

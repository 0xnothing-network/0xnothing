"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/pixel", label: "Draw" },
  { href: "/pixel/gallery", label: "Gallery" },
  { href: "/pixel/marketplace", label: "Marketplace" },
];

export function PixelHeader() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#13131F]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/0xNothing.jpg"
            alt="0xNothing Logo"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-white font-bold text-base tracking-tight">0xPixel</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-lg text-sm text-[#64748B] hover:text-white hover:bg-white/5 transition-all duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Connect + Mobile Toggle */}
        <div className="flex items-center gap-2">
          {mounted ? (
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          ) : (
            <div className="w-28 h-9 bg-white/5 rounded-lg animate-pulse" />
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className={`block w-5 h-px bg-white transition-all ${mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block w-5 h-px bg-white transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-px bg-white transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-white/5 px-4 py-3 space-y-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-[#64748B] hover:text-white hover:bg-white/5 transition-all duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

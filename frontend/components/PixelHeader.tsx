"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/pixel", label: "Draw" },
  { href: "/pixel/gallery", label: "Gallery" },
  { href: "/pixel/marketplace", label: "Marketplace" },
];

interface ContractStats {
  totalFees: string;
  txCount: number;
}

export function PixelHeader() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<ContractStats>({ totalFees: "—", txCount: 0 });

  useEffect(() => {
    setMounted(true);
    fetch("/api/contract-stats")
      .then((r) => r.json())
      .then((data: ContractStats) => {
        setStats({ totalFees: data.totalFees, txCount: data.txCount });
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#13131F]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo + Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/icon.svg"
              alt="0xNothing Logo"
              width={32}
              height={32}
              priority
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-white font-bold text-base tracking-tight">0xPixel</span>
          </Link>
            <a
            href="https://etherscan.io/address/0x8693f17185F3C295edfD2aDC715f20290A5D538D#analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span className="text-[#94A3B8] text-xs">Fees Burned</span>
            <span className="text-emerald-400 text-xs font-bold">{stats.totalFees} ETH</span>
          </a>
        </div>

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

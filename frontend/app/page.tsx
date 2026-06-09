"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const PRODUCTS = [
  {
    id: "0xPixel",
    name: "0xPixel",
    desc: "Draw, own, trade pixel art on-chain",
    href: "/pixel",
    tag: "Live",
    color: "#6366F1",
    glow: "rgba(99,102,241,0.15)",
    disabled: false,
  },
  {
    id: "0xName",
    name: "0x",
    desc: "Coming Soon",
    href: "#",
    tag: "Coming Soon",
    color: "#6366F1",
    glow: "rgba(99,102,241,0.15)",
    disabled: true,
  },
  {
    id: "0xMarket",
    name: "0x",
    desc: "Coming Soon",
    href: "#",
    tag: "Coming Soon",
    color: "#6366F1",
    glow: "rgba(99,102,241,0.15)",
    disabled: true,
  },
  {
    id: "0xGallery",
    name: "0x",
    desc: "Coming Soon",
    href: "#",
    tag: "Coming Soon",
    color: "#6366F1",
    glow: "rgba(99,102,241,0.15)",
    disabled: true,
  },
];

export default function LandingPage() {
  const [exploreOpen, setExploreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09091A] flex flex-col relative overflow-hidden">

      {/* Animated stars background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="landing-star"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              background: "rgba(255,255,255," + (Math.random() * 0.6 + 0.2) + ")",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animationDelay: Math.random() * 3 + "s",
              animationDuration: Math.random() * 3 + 2 + "s",
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <header className="landing-fade-in relative z-10 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image
            src="/0xNothing.jpg"
            alt="0xNothing"
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover shadow-lg"
          />
          <span className="text-white font-semibold text-base tracking-tight">0xNothing</span>
        </div>
        <button
          onClick={() => setExploreOpen(true)}
          className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
        >
          Explore
        </button>
      </header>

      {/* hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative">

        {/* Big glow halo behind logo */}
        <div className="absolute pointer-events-none landing-pulse" style={{
          width: "700px",
          height: "700px",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)",
          filter: "blur(80px)",
        }} />

        {/* Solar system orbit container */}
        <div className="landing-solar-system relative mb-10" style={{ width: "420px", height: "420px", display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Sun glow */}
          <div className="absolute pointer-events-none landing-pulse-slow" style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(251,146,60,0.6) 40%, rgba(249,115,22,0.2) 70%, transparent 100%)",
            boxShadow: "0 0 60px rgba(251,191,36,0.6), 0 0 120px rgba(251,146,60,0.3)",
          }} />
          <div className="absolute pointer-events-none" style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff 0%, #fbbf24 60%, #f59e0b 100%)",
            boxShadow: "0 0 30px rgba(251,191,36,0.8), 0 0 60px rgba(251,146,60,0.4)",
          }} />

          {/* Orbit path - inner */}
          <div className="absolute pointer-events-none" style={{
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            border: "1px solid rgba(99,102,241,0.15)",
          }} />

          {/* Orbit path - outer */}
          <div className="absolute pointer-events-none" style={{
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            border: "1px solid rgba(139,92,246,0.1)",
          }} />

          {/* Orbit path - outermost */}
          <div className="absolute pointer-events-none" style={{
            width: "440px",
            height: "440px",
            borderRadius: "50%",
            border: "1px dashed rgba(255,255,255,0.05)",
          }} />

          {/* Planet 1 - inner orbit */}
          <div style={{ position: "absolute", width: "240px", height: "240px", animation: "orbit1 8s linear infinite" }}>
            <div className="absolute" style={{ top: "0", left: "50%", transform: "translate(-50%, -50%)" }}>
              <div style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #a78bfa, #6366f1)",
                boxShadow: "0 0 12px rgba(167,139,250,0.6)",
              }} />
            </div>
          </div>

          {/* Planet 2 - medium orbit */}
          <div style={{ position: "absolute", width: "240px", height: "240px", animation: "orbit2 12s linear infinite" }}>
            <div className="absolute" style={{ bottom: "0", left: "50%", transform: "translate(-50%, 50%)" }}>
              <div style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #67e8f9, #0891b2)",
                boxShadow: "0 0 10px rgba(103,232,249,0.5)",
              }} />
            </div>
          </div>

          {/* Planet 3 - outer orbit */}
          <div style={{ position: "absolute", width: "380px", height: "380px", animation: "orbit3 18s linear infinite" }}>
            <div className="absolute" style={{ top: "50%", right: "0", transform: "translate(50%, -50%)" }}>
              <div style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #fca5a5, #dc2626)",
                boxShadow: "0 0 14px rgba(252,165,165,0.5)",
              }} />
            </div>
          </div>

          {/* Main planet - the logo */}
          <div style={{ position: "absolute", width: "380px", height: "380px", animation: "orbitPlanet 20s linear infinite" }}>
            <div className="absolute" style={{ bottom: "0", left: "50%", transform: "translate(-50%, 50%)" }}>
              <div style={{ animation: "tiltPlanet 20s ease-in-out infinite" }}>
              <Image
                src="/0xNothing.jpg"
                alt="0xNothing"
                width={90}
                height={90}
                className="rounded-full object-cover"
                style={{
                  boxShadow: "0 0 30px rgba(99,102,241,0.8), 0 0 60px rgba(99,102,241,0.5), 0 0 90px rgba(139,92,246,0.3)",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              />
              </div>
            </div>
          </div>
        </div>

        {/* Brand */}
        <div className="landing-brand text-center mb-10 space-y-2">
          <h1 className="text-white text-5xl md:text-7xl font-bold tracking-tight" style={{
            textShadow: "0 0 40px rgba(99,102,241,0.5)",
          }}>
            0xNothing
          </h1>
          <p className="text-[#64748B] text-base md:text-lg uppercase tracking-[0.3em]">Creative Space</p>
        </div>

        {/* CTA */}
        <button
          onClick={() => setExploreOpen(true)}
          className="landing-cta group relative flex items-center gap-2.5 px-12 py-5 rounded-2xl text-white font-semibold text-base transition-all duration-200 hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            boxShadow: "0 0 80px rgba(99,102,241,0.4), 0 0 160px rgba(99,102,241,0.15)",
          }}
        >
          <span>Explore</span>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Sub links */}
        <div className="landing-sublinks mt-16 flex items-center gap-8">
          <a href="https://x.com/0xnothing_net" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#4B5563] hover:text-white text-xs uppercase tracking-wider transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow on X
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-5 border-t border-white/5 flex items-center justify-between">
        <p className="text-[#374151] text-xs">Built on Ethereum</p>
        <p className="text-[#374151] text-xs">by 0xNothing</p>
      </footer>

      {/* Explore Modal */}
      {exploreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setExploreOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-3xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-white text-2xl font-bold">Explore Products</h2>
                <button
                  onClick={() => setExploreOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-white hover:bg-white/5 transition-all"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRODUCTS.map((p) => {
                  if (p.disabled) {
                    return (
                      <div key={p.id} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 opacity-50 cursor-not-allowed overflow-hidden">
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: p.color }}>
                              {p.name.slice(0, 2)}
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-base">{p.name}</h3>
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${p.color}20`, color: p.color }}>
                                {p.tag}
                              </span>
                            </div>
                          </div>
                          <p className="text-[#64748B] text-sm">{p.desc}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <Link key={p.id} href={p.href} onClick={() => setExploreOpen(false)} className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all overflow-hidden explore-card">
                      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                        background: `radial-gradient(ellipse at 30% 50%, ${p.glow} 0%, transparent 70%)`,
                      }} />
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                          {p.id === "0xPixel" ? (
                            <Image src="/icon.svg" alt={p.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: p.color }}>
                              {p.name.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-white font-semibold text-base">{p.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${p.color}20`, color: p.color }}>
                              {p.tag}
                            </span>
                          </div>
                        </div>
                        <p className="text-[#64748B] text-sm">{p.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </div>
  );
}

const styles = `
/* Landing page CSS animations - hardware accelerated */
.landing-star {
  position: absolute;
  border-radius: 50%;
  animation: twinkle ease-in-out infinite;
  will-change: opacity, transform;
}

.landing-fade-in {
  opacity: 0;
  animation: fadeIn 0.6s ease-out forwards;
}

.landing-solar-system {
  opacity: 0;
  transform: scale(0.8);
  animation: solarSystemIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards;
  will-change: transform, opacity;
}

.landing-brand {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeSlideUp 0.6s ease-out 0.6s forwards;
  will-change: transform, opacity;
}

.landing-cta {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
  animation: fadeSlideUp 0.6s ease-out 0.9s forwards;
  will-change: transform, opacity;
}

.landing-sublinks {
  opacity: 0;
  animation: fadeSlideUp 0.6s ease-out 1.1s forwards;
  will-change: opacity;
}

.landing-pulse {
  animation: pulseGlow 4s ease-in-out infinite;
  will-change: transform, opacity;
}

.landing-pulse-slow {
  animation: pulseGlow 3s ease-in-out infinite;
  will-change: transform, opacity;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.5); }
}

@keyframes fadeIn {
  to { opacity: 1; }
}

@keyframes solarSystemIn {
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeSlideUp {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes orbit1 {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes orbit2 {
  from { transform: rotate(120deg); }
  to { transform: rotate(480deg); }
}
@keyframes orbit3 {
  from { transform: rotate(240deg); }
  to { transform: rotate(600deg); }
}
@keyframes orbitPlanet {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes tiltPlanet {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}

/* Explore card modal animation */
.explore-card {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  animation: cardIn 0.4s ease-out forwards;
}

.explore-card:nth-child(1) { animation-delay: 0.05s; }
.explore-card:nth-child(2) { animation-delay: 0.1s; }
.explore-card:nth-child(3) { animation-delay: 0.15s; }
.explore-card:nth-child(4) { animation-delay: 0.2s; }

@keyframes cardIn {
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;
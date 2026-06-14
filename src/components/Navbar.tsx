'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NavLink {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const links: NavLink[] = [
  { label: 'AI Detector', href: '/' },
  { label: 'Plagiarism', href: '/plagiarism-checker' },
  { label: 'Humanizer', href: '/text-humanizer' },
  {
    label: 'Tools',
    href: '#',
    children: [
      { label: 'Grammar Check', href: '#' },
      { label: 'Summarizer', href: '#' },
      { label: 'Paraphraser', href: '#' },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    window.addEventListener('scroll', onScroll);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClick); };
  }, []);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-lg border-b border-[#f5e6cc] shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[#ffa94d] flex items-center justify-center shadow-lg shadow-[#ff6b6b]/25 group-hover:shadow-xl group-hover:shadow-[#ff6b6b]/35 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-[#3d3227]' : 'text-[#3d3227]'}`}>
              Verify<span className="text-gradient-warm">AI</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <div key={link.label} ref={link.children ? dropdownRef : undefined} className="relative">
                {link.children ? (
                  <button onClick={() => setToolsOpen(!toolsOpen)} className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${toolsOpen ? 'text-[#ff6b6b] bg-[#fff5f5]' : 'text-[#8c7a64] hover:text-[#3d3227] hover:bg-[#fff8ec]'}`}>
                    {link.label}
                    <svg className={`w-3 h-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <Link href={link.href} className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${isActive(link.href) ? 'text-[#3d3227] bg-[#fff8ec]' : 'text-[#8c7a64] hover:text-[#3d3227] hover:bg-[#fff8ec]'}`}>
                    {link.label}
                  </Link>
                )}

                {link.children && toolsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-2xl border border-[#f5e6cc] shadow-xl shadow-[#3d3227]/8 py-2 animate-scale-in">
                    {link.children.map((child) => (
                      <Link key={child.label} href={child.href} className="block px-4 py-2.5 text-sm text-[#8c7a64] hover:text-[#3d3227] hover:bg-[#fff8ec] mx-2 rounded-xl transition-colors" onClick={() => setToolsOpen(false)}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Pricing link */}
            <Link href="/pricing" className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${isActive('/pricing') ? 'text-[#3d3227] bg-[#fff8ec]' : 'text-[#8c7a64] hover:text-[#3d3227] hover:bg-[#fff8ec]'}`}>
              Pricing
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${isActive('/dashboard') ? 'text-[#3d3227] bg-[#fff8ec]' : 'text-[#8c7a64] hover:text-[#3d3227] hover:bg-[#fff8ec]'}`}>
                  Dashboard
                </Link>
                <Link href="/account" className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${isActive('/account') ? 'text-[#3d3227] bg-[#fff8ec]' : 'text-[#8c7a64] hover:text-[#3d3227] hover:bg-[#fff8ec]'}`}>
                  Account
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-[#8c7a64] hover:text-[#3d3227] rounded-xl hover:bg-[#fff8ec] transition-colors">
                  Sign in
                </Link>
                <Link href="/login?signup=true" className="btn-primary text-sm !py-2.5 !px-5">
                  Get started
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-[#8c7a64] rounded-xl hover:bg-[#fff8ec]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {mobileOpen ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#f5e6cc] shadow-lg animate-scale-in">
          <div className="px-5 py-4 space-y-1">
            {links.map((link) => (
              <div key={link.label}>
                {link.children ? (
                  <details className="group">
                    <summary className="py-2.5 text-sm font-medium text-[#8c7a64] list-none cursor-pointer">{link.label}</summary>
                    <div className="ml-4 mt-1 space-y-1">{link.children.map((c) => <Link key={c.label} href={c.href} className="block py-2 text-sm text-[#8c7a64]" onClick={() => setMobileOpen(false)}>{c.label}</Link>)}</div>
                  </details>
                ) : (
                  <Link href={link.href} className="block py-2.5 text-sm font-medium text-[#8c7a64]" onClick={() => setMobileOpen(false)}>{link.label}</Link>
                )}
              </div>
            ))}
            <Link href="/pricing" className="block py-2.5 text-sm font-medium text-[#8c7a64]" onClick={() => setMobileOpen(false)}>Pricing</Link>
            <div className="pt-4 mt-2 border-t border-[#f5e6cc] space-y-2">
              {user ? (
                <>
                  <Link href="/dashboard" className="block w-full text-center py-2.5 text-sm font-medium border border-[#f5e6cc] text-[#3d3227] rounded-xl">Dashboard</Link>
                  <Link href="/account" className="block w-full text-center py-2.5 text-sm font-medium text-[#8c7a64] border border-[#f5e6cc] rounded-xl">Account</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="block w-full text-center py-2.5 text-sm font-medium border border-[#f5e6cc] text-[#3d3227] rounded-xl">Sign in</Link>
                  <Link href="/login?signup=true" className="block w-full text-center py-2.5 text-sm font-semibold bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] text-white rounded-xl shadow-md">Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function HexLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="16,3 27.26,9.5 27.26,22.5 16,29 4.74,22.5 4.74,9.5"
        fill="#4F46E5"
      />
      <line x1="10.5" y1="12.5" x2="21.5" y2="12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="21.5" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="19.5" x2="21.5" y2="19.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const NAV_LINKS = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Upload', href: '/upload' },
  { label: 'Dashboard', href: '/dashboard' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[#E5E5E5] bg-[#FAFAFA] transition-shadow duration-200"
      style={{ boxShadow: scrolled ? '0 1px 12px 0 rgba(0,0,0,0.07)' : 'none' }}
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-3 items-center px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <HexLogo />
          <span
            className="text-[#0A0A0A] text-[17px] font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}
          >
            DataSwarm
          </span>
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden md:flex items-center justify-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-semibold text-[#6B7280] transition-colors duration-150 hover:text-[#4F46E5]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right — ConnectButton + hamburger */}
        <div className="flex items-center justify-end gap-3">
          <div className="hidden md:block">
            <ConnectButton />
          </div>

          {/* Hamburger */}
          <button
            className="flex md:hidden h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md hover:bg-[#F0F0F0] transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span
              className="block h-[2px] w-5 rounded-full bg-[#6B7280]"
              style={{
                transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
            <span
              className="block h-[2px] w-5 rounded-full bg-[#6B7280]"
              style={{
                opacity: menuOpen ? 0 : 1,
                transition: 'opacity 0.15s ease',
              }}
            />
            <span
              className="block h-[2px] w-5 rounded-full bg-[#6B7280]"
              style={{
                transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-2.5 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-[#F5F5F5] hover:text-[#4F46E5]"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-[#E5E5E5] pt-4">
            <ConnectButton />
          </div>
        </div>
      )}
    </header>
  )
}

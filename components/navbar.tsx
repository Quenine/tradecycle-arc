"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount } from "wagmi"
import ConnectWallet from "@/components/connect-wallet"
import { NETWORK, PROTOCOL_OWNER } from "@/constants/contracts"

const NAV_LINKS = [
  { href: "/",             label: "Explore" },
  { href: "/market",       label: "Trade" },
  { href: "/portfolio",    label: "Portfolio" },
  { href: "/operator",     label: "Operators" },
  { href: "/verifier",     label: "Verify" },
  { href: "/faucet",       label: "Faucet", highlight: true },
  { href: "/demo",         label: "Demo" },
  { href: "/how-it-works", label: "Docs" },
  { href: "/stats",        label: "Stats" },
  { href: "/admin",        label: "Admin" },
]

export default function Navbar() {
  const pathname = usePathname()
  const { address } = useAccount()
  const isOwner = address?.toLowerCase() === PROTOCOL_OWNER.toLowerCase()
  const visibleLinks = NAV_LINKS.filter((link) => link.href !== "/admin" || isOwner)

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "rgba(8,10,14,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <path
              d="M14 2L26 8V20L14 26L2 20V8L14 2Z"
              stroke="#C9A84C"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M14 8L20 11.5V18.5L14 22L8 18.5V11.5L14 8Z"
              fill="#C9A84C"
              opacity="0.3"
            />
            <circle cx="14" cy="14" r="3" fill="#C9A84C" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            TradeCycle
          </span>
        </Link>

        {/* Nav links — flex-shrink so they compress before hiding the wallet button */}
        <div
          style={{
            display: "flex",
            gap: 1,
            flex: 1,
            minWidth: 0,          // allows flex child to shrink below content size
            overflow: "hidden",   // hides overflow instead of clipping wallet button
            flexShrink: 1,
          }}
        >
          {visibleLinks.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  color: active
                    ? "var(--text-primary)"
                    : link.highlight
                    ? "var(--gold)"
                    : "var(--text-muted)",
                  background: active ? "var(--bg-surface)" : "transparent",
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                  border:
                    link.highlight && !active
                      ? "1px solid rgba(201,168,76,0.2)"
                      : "1px solid transparent",
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Chain indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--emerald)",
              boxShadow: "0 0 6px var(--emerald)",
              display: "inline-block",
            }}
          />
          <span className="hide-mobile">{NETWORK.name}</span>
        </div>

        {/* Wallet connect — must NEVER be clipped or hidden */}
        <div style={{ flexShrink: 0, zIndex: 10 }}>
          <ConnectWallet compact />
        </div>
      </div>
    </nav>
  )
}

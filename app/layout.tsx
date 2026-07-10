import type { Metadata } from "next"
import { Suspense } from "react"
import "@rainbow-me/rainbowkit/styles.css"
import "./globals.css"
import { Web3Provider } from "@/providers/web3-provider"

export const metadata: Metadata = {
  title: "TradeCycle - USDC milestone finance for SMEs on Arc",
  description: "USDC milestone finance for SME production and trade cycles on Arc Testnet.",
  openGraph: {
    title: "TradeCycle - USDC milestone finance for SMEs on Arc",
    description: "TradeCycle connects SME operators, investors, and verifiers for milestone-based USDC finance on Arc.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Suspense fallback={null}>
          <Web3Provider>{children}</Web3Provider>
        </Suspense>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import { Suspense } from "react"
import "@rainbow-me/rainbowkit/styles.css"
import "./globals.css"
import { Web3Provider } from "@/providers/web3-provider"

export const metadata: Metadata = {
  title: "FundR - Real-World Yield Protocol",
  description: "Invest in real production cycles - agriculture, trade finance, commodities - with milestone-gated capital release and on-chain yield distribution.",
  openGraph: {
    title: "FundR - Real-World Yield Protocol",
    description: "Decentralised infrastructure where real economic activity becomes investable on-chain.",
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

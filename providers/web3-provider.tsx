
"use client"

import { ReactNode } from "react"
import { RainbowKitProvider, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit"
import { coinbaseWallet, injectedWallet, rainbowWallet, rabbyWallet, trustWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets"
import { createConfig, http, WagmiProvider } from "wagmi"
import { defineChain } from "viem"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NETWORK } from "@/constants/contracts"

// Module-level singletons — created once when this "use client" module is
// first evaluated on the browser.  Never runs on the server.

const appChain = defineChain({
  id: NETWORK.chainId,
  name: NETWORK.name,
  nativeCurrency: NETWORK.nativeCurrency,
  rpcUrls: {
    default: { http: [NETWORK.rpcUrl] },
  },
  blockExplorers: {
    default: { name: NETWORK.blockExplorerName, url: NETWORK.blockExplorer },
  },
  testnet: NETWORK.isTestnet,
})

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "fundr-local"

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        walletConnectWallet,
        coinbaseWallet,
        rainbowWallet,
        rabbyWallet,
        trustWallet,
      ],
    },
  ],
  {
    appName: "FundR",
    projectId: walletConnectProjectId,
  },
)

const wagmiConfig = createConfig({
  chains: [appChain],
  connectors,
  ssr: false,
  transports: {
    [appChain.id]: http(NETWORK.rpcUrl),
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 2, refetchOnWindowFocus: true },
  },
})

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={appChain}
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#C9A84C",
            accentColorForeground: "#080A0E",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

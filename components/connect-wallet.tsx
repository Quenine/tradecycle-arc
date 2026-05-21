"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function ConnectWallet({
  compact = false,
}: {
  compact?: boolean
}) {
  const baseStyle = {
    minWidth: compact ? 0 : 150,
    padding: compact ? "8px 12px" : undefined,
    fontSize: compact ? 12 : 13,
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted
        const connected = ready && account && chain

        if (!connected) {
          return (
            <button
              className="btn-primary"
              onClick={openConnectModal}
              type="button"
              style={baseStyle}
            >
              Connect Wallet
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button
              className="btn-ghost"
              onClick={openChainModal}
              type="button"
              style={{
                ...baseStyle,
                minWidth: compact ? 0 : 178,
                borderColor: "rgba(224,82,82,0.28)",
                color: "var(--danger)",
              }}
            >
              Wrong Network
            </button>
          )
        }

        return (
          <button
            className="btn-ghost"
            onClick={openAccountModal}
            type="button"
            title={account.address}
            style={{
              ...baseStyle,
              borderColor: "rgba(201,168,76,0.28)",
              color: "var(--gold)",
            }}
          >
            {account.displayName || short(account.address)}
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}

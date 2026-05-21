
import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: path.join(__dirname, ".."),

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // ── Alias every React-Native / non-browser package to an empty shim ──
      // MetaMask SDK imports these but they don't exist in a browser project.
      // Without this alias the bundle fails to compile and RainbowKit renders
      // nothing (the ConnectButton disappears silently).
      const noop = path.resolve(__dirname, "noop.js")
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        "@react-native-async-storage/async-storage": noop,
        "@react-native-async-storage/async-storage$": noop,
        "react-native":                              noop,
        "react-native$":                             noop,
        "react-native-encrypted-storage":            noop,
        "react-native-encrypted-storage$":           noop,
        "react-native-keychain":                     noop,
        "react-native-keychain$":                    noop,
        "@react-native-community/netinfo":           noop,
        "@react-native-community/netinfo$":          noop,
      }

      // ── Silence optional deps that aren't installed ────────────────────
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "pino-pretty",
        "lokijs",
        "encoding",
      ]
    }
    return config
  },
}

export default nextConfig

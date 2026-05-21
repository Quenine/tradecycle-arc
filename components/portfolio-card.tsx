"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { useAccount } from "wagmi"
import Link from "next/link"

type PortfolioPosition = {
  cycle: string
  symbol: string
  balance: string | number
}

type EthereumWindow = Window & {
  ethereum?: ethers.Eip1193Provider
}

export default function PortfolioCard({ position }: { position: PortfolioPosition }) {

  const { address } = useAccount()
  const [loading, setLoading] = useState(false)

  async function withdraw() {

    try {

      if (!address) {
        alert("Connect wallet")
        return
      }

      const ethereum = (window as EthereumWindow).ethereum
      if (!ethereum) {
        alert("No injected wallet found")
        return
      }

      const provider = new ethers.BrowserProvider(ethereum)
      const signer = await provider.getSigner()

      const abi = [
        "function withdraw()"
      ]

      const contract = new ethers.Contract(
        position.cycle,
        abi,
        signer
      )

      setLoading(true)

      const tx = await contract.withdraw()

      await tx.wait()

      alert("Withdrawal successful 🎉")

      window.location.reload()

    } catch (err) {

      console.error(err)
      alert("Withdrawal failed")

    }

    setLoading(false)
  }

  return (

    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="text-xl font-semibold mb-2">
        {position.symbol}
      </h2>

      <p className="text-sm text-gray-500 break-all">
        {position.cycle}
      </p>

      <div className="mt-4 space-y-2">

        <div className="flex justify-between text-sm">
          <span>Balance</span>
          <span>{position.balance}</span>
        </div>

      </div>

      <div className="mt-6 space-y-2">

        <button
          onClick={withdraw}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg"
        >
          {loading ? "Processing..." : "Claim & Withdraw"}
        </button>

        <Link
          href={`/cycle/${position.cycle}`}
          className="block text-center text-blue-600 text-sm"
        >
          View Cycle →
        </Link>

      </div>

    </div>
  )
}

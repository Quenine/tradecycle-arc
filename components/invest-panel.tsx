"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { useAccount } from "wagmi"
import { CONTRACTS, STABLECOIN } from "@/constants/contracts"

type CycleSummary = {
  address: string
}

type EthereumWindow = Window & {
  ethereum?: ethers.Eip1193Provider
}

export default function InvestPanel({ cycle }: { cycle: CycleSummary }) {

  const { address } = useAccount()

  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const estimatedTokens = amount ? Number(amount) : 0
  const estimatedReturn = estimatedTokens * 1.3

  async function invest() {

    try {

      if (!address) {
        alert("Connect wallet")
        return
      }

      if (!amount || Number(amount) <= 0) {
        alert("Enter amount")
        return
      }

      const ethereum = (window as EthereumWindow).ethereum
      if (!ethereum) {
        alert("No injected wallet found")
        return
      }

      const provider = new ethers.BrowserProvider(ethereum)

      const signer = await provider.getSigner()

      const usdcABI = [
        "function approve(address spender,uint256 amount) returns(bool)"
      ]

      const cycleABI = [
        "function invest(uint256 amount)"
      ]

      const amountWei = ethers.parseUnits(amount, STABLECOIN.decimals)

      const usdc = new ethers.Contract(
        CONTRACTS.stablecoin,
        usdcABI,
        signer
      )

      const cycleContract = new ethers.Contract(
        cycle.address,
        cycleABI,
        signer
      )

      setLoading(true)

      const approveTx = await usdc.approve(
        cycle.address,
        amountWei
      )

      await approveTx.wait()

      const tx = await cycleContract.invest(amountWei)

      await tx.wait()

      alert("Investment successful")

      setAmount("")

    } catch (err) {

      console.error(err)
      alert("Transaction failed")

    }

    setLoading(false)

  }

  return (

    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="text-xl font-semibold mb-4">
        Invest
      </h2>

      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />

      <div className="text-sm space-y-2">

        <div className="flex justify-between">
          <span>Cycle Shares</span>
          <span>{estimatedTokens}</span>
        </div>

        <div className="flex justify-between">
          <span>Estimated Return</span>
          <span className="text-green-600">
            {estimatedReturn.toFixed(2)} USDC
          </span>
        </div>

      </div>

      <button
        onClick={invest}
        disabled={loading}
        className="mt-6 w-full bg-black text-white py-2 rounded-lg"
      >

        {loading ? "Processing..." : "Invest"}

      </button>

    </div>

  )
}

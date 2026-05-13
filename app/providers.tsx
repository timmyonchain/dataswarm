'use client'

import '@rainbow-me/rainbowkit/styles.css'

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { defineChain, http } from 'viem'
import { useState } from 'react'

const zgNewtonTestnet = defineChain({
  id: 16600,
  name: '0G Newton Testnet',
  nativeCurrency: { name: 'OG', symbol: 'OG', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan-newton.0g.ai' },
  },
  testnet: true,
})

const zgMainnet = defineChain({
  id: 16888,
  name: '0G Mainnet',
  nativeCurrency: { name: 'OG', symbol: 'OG', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-mainnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan.0g.ai' },
  },
  testnet: false,
})

const wagmiConfig = getDefaultConfig({
  appName: 'DataSwarm',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'dataswarm',
  chains: [zgNewtonTestnet, zgMainnet],
  transports: {
    [zgNewtonTestnet.id]: http('https://evmrpc-testnet.0g.ai'),
    [zgMainnet.id]: http('https://evmrpc-mainnet.0g.ai'),
  },
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

'use client'

import '@rainbow-me/rainbowkit/styles.css'

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { defineChain, http } from 'viem'
import { useState } from 'react'

const zeroGMainnet = defineChain({
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: '0G',
    symbol: 'OG',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.ankr.com/0g_mainnet_evm'],
    },
  },
  blockExplorers: {
    default: {
      name: '0G ChainScan',
      url: 'https://chainscan.0g.ai',
    },
  },
})

const zgTestnet = defineChain({
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: 'OG', symbol: 'OG', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evmrpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://chainscan-galileo.0g.ai' },
  },
  testnet: true,
})

const wagmiConfig = getDefaultConfig({
  appName: 'DataSwarm',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'dataswarm',
  chains: [zeroGMainnet, zgTestnet],
  transports: {
    [zeroGMainnet.id]: http('https://rpc.ankr.com/0g_mainnet_evm'),
    [zgTestnet.id]: http('https://evmrpc-testnet.0g.ai'),
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

export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '0x4beD50c7AA534629331f7254171Feade83e4D2e9'
) as `0x${string}`

export const CONTRACT_ABI = [
  {
    name: 'listDataset',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'storageHash', type: 'string' },
      { name: 'price',       type: 'uint256' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    name: 'submitValidation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'datasetId',  type: 'uint256' },
      { name: 'score',      type: 'uint8' },
      { name: 'reportHash', type: 'string' },
    ],
    outputs: [],
  },
] as const

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
  {
    name: 'purchaseDataset',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'datasetId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'hasAccess',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'datasetId', type: 'uint256' },
      { name: 'user',      type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getTotalDatasets',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getDataset',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'datasetId', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id',                   type: 'uint256' },
          { name: 'storageHash',          type: 'string'  },
          { name: 'metadataURI',          type: 'string'  },
          { name: 'contributor',          type: 'address' },
          { name: 'price',                type: 'uint256' },
          { name: 'validationScore',      type: 'uint8'   },
          { name: 'validationReportHash', type: 'string'  },
          { name: 'isValidated',          type: 'bool'    },
          { name: 'totalPurchases',       type: 'uint256' },
          { name: 'earnings',             type: 'uint256' },
          { name: 'createdAt',            type: 'uint256' },
        ],
      },
    ],
  },
] as const

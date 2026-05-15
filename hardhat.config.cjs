require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    "0g-testnet": {
      url: "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    "0g-mainnet": {
      url: "https://rpc.ankr.com/0g_mainnet_evm",
      chainId: 16661,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      timeout: 120000,
      httpHeaders: { "Content-Type": "application/json" },
    },
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

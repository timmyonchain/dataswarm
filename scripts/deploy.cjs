require("dotenv").config();
const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log("Deploying from:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "OG");

  const artifact = require("../artifacts/contracts/DataSwarm.sol/DataSwarm.json");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Deploying DataSwarm...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("DataSwarm deployed to:", address);
  console.log("Explorer: https://chainscan-newton.0g.ai/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

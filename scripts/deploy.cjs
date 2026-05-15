require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying from:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "OG");

  const DataSwarm = await hre.ethers.getContractFactory("DataSwarm");
  console.log("Deploying DataSwarm...");
  const contract = await DataSwarm.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("DataSwarm deployed to:", address);
  console.log("Explorer: https://chainscan.0g.ai/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

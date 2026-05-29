const { ethers } = require("hardhat");

async function main() {
  const devWallet = "0x58633401dCc383F010688e950878000000000000";

  console.log("Deploying ZeroxPixel...");
  const Factory = await ethers.getContractFactory("ZeroxPixel");
  const contract = await Factory.deploy(devWallet);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Deployed to:", address);
  console.log("Dev wallet:", devWallet);
}

main().catch(console.error);

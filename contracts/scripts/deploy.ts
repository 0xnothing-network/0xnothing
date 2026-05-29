import { ethers } from "hardhat";

async function main() {
  console.log("Deploying 0xPixel contract...");

  const DEV_WALLET_ADDRESS = process.env.DEV_WALLET_ADDRESS;
  if (!DEV_WALLET_ADDRESS) {
    throw new Error("DEV_WALLET_ADDRESS must be set in .env");
  }

  const devWallet = ethers.getAddress(DEV_WALLET_ADDRESS);

  const ZeroxPixel = await ethers.getContractFactory("ZeroxPixel");
  const zeroxPixel = await ZeroxPixel.deploy(devWallet);

  await zeroxPixel.waitForDeployment();
  const contractAddress = await zeroxPixel.getAddress();

  console.log(`0xPixel deployed to: ${contractAddress}`);
  console.log(`DevWallet: ${devWallet}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).chainId}`);

  const fs = require("fs");
  const envPath = "./.env";
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const newLine = `CONTRACT_ADDRESS=${contractAddress}`;
  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, newLine);
  } else {
    envContent += `\n${newLine}\n`;
  }
  fs.writeFileSync(envPath, envContent);

  console.log("Contract address saved to .env");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

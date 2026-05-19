import { ethers } from "hardhat";

async function main() {
  console.log("Deploying 0xPixel contract...");

  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
  if (!ADMIN_ADDRESS || !TREASURY_ADDRESS) {
    throw new Error("ADMIN_ADDRESS and TREASURY_ADDRESS must be set in .env");
  }

  const admin = ethers.getAddress(ADMIN_ADDRESS);
  const treasury = ethers.getAddress(TREASURY_ADDRESS);

  const ZeroxPixel = await ethers.getContractFactory("ZeroxPixel");
  const zeroxPixel = await ZeroxPixel.deploy(admin, treasury);

  await zeroxPixel.waitForDeployment();
  const contractAddress = await zeroxPixel.getAddress();

  console.log(`0xPixel deployed to: ${contractAddress}`);
  console.log(`Admin: ${admin}`);
  console.log(`Treasury: ${treasury}`);
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

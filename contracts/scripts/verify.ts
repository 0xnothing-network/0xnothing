import * as hre from "hardhat";

async function main() {
  const contractAddress = "0x476d9E7b258332d9d35Fe4287D8E58e1dbaFfC95";
  const adminAddress = "0x58bcC7B40790905a83373c8979B92Ac400000000";

  console.log("Verifying contract on Etherscan...");
  console.log(`Contract: ${contractAddress}`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [adminAddress],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

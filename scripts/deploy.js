const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const HelloWeb3 = await ethers.getContractFactory("HelloWeb3");
  const hello = await HelloWeb3.deploy("Hello, Web3!");
  await hello.waitForDeployment();
  console.log("HelloWeb3 deployed to:", await hello.getAddress());

  const MyToken = await ethers.getContractFactory("MyToken");
  const token = await MyToken.deploy("MyToken", "MTK", 1000000);
  await token.waitForDeployment();
  console.log("MyToken deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

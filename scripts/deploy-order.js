const hre = require("hardhat");

async function main() {
  const OrderContract = await hre.ethers.getContractFactory("OrderContract");
  const contract = await OrderContract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ OrderContract deployed to: ${address}`);
  console.log("\n📋 分账比例:");
  console.log(`   商家: ${await contract.merchantShare()}%`);
  console.log(`   骑手: ${await contract.riderShare()}%`);
  console.log(`   协议: ${await contract.getProtocolFee()}%`);

  // 验证信息
  console.log("\n🔍 验证命令:");
  console.log(`   npx hardhat verify --network monadTestnet ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

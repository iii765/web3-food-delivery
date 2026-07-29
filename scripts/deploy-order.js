const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function updateLocalFrontendConfig(address) {
  const configPath = path.join(__dirname, "..", "frontend", "config.js");
  const source = fs.readFileSync(configPath, "utf8");
  // 限制在 31337 配置块内，避免覆盖 Monad Testnet 地址。
  const pattern = /("31337"\s*:\s*\{[\s\S]*?contractAddress:\s*)"(0x[a-fA-F0-9]{40})"(?=[\s\S]*?\n\s*\},\s*\n\s*"10143")/;
  const match = source.match(pattern);
  if (!match) {
    throw new Error("未找到 frontend/config.js 中的本地合约地址");
  }

  if (match[2].toLowerCase() === address.toLowerCase()) {
    console.log(`📝 前端本地合约地址已是最新：${address}`);
    return;
  }

  fs.writeFileSync(configPath, source.replace(pattern, `$1"${address}"`));
  console.log(`📝 已同步前端本地合约地址: ${address}`);
}

async function main() {
  const OrderContract = await hre.ethers.getContractFactory("OrderContract");
  const contract = await OrderContract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ OrderContract deployed to: ${address}`);

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    updateLocalFrontendConfig(address);
  } else {
    console.log("ℹ️ 非本地网络：未自动覆盖 frontend/config.js 的 Monad 地址。");
  }

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    const frontendDir = path.join(__dirname, "..", "frontend");
    console.log("\n🌐 前端页面（先另开终端运行 npm run serve）:");
    console.log("   导航页: http://127.0.0.1:8081/");
    console.log("   顾客端: http://127.0.0.1:8081/customer.html");
    console.log("   商家端: http://127.0.0.1:8081/merchant.html");
    console.log("   骑手端: http://127.0.0.1:8081/rider.html");
    console.log("   管理端: http://127.0.0.1:8081/admin.html");
  }

  console.log("\n📋 分账比例:");
  console.log(`   商家: ${await contract.merchantShare()}%`);
  console.log(`   骑手: ${await contract.riderShare()}%`);
  console.log(`   协议: ${await contract.getProtocolFee()}%`);
  console.log("\n🔍 Monad 验证命令:");
  console.log(`   npx hardhat verify --network monadTestnet ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

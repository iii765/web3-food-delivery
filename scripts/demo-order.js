// 本地链完整演示：下单 → 接单 → 配送 → 分账
const hre = require("hardhat");

async function main() {
  const addr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const contract = await hre.ethers.getContractAt("OrderContract", addr);

  // 本地链账户：0=customer, 1=merchant, 2=rider
  const [customer, merchant, rider] = await hre.ethers.getSigners();

  const amount = hre.ethers.parseEther("0.1");

  console.log("👤 用户:", customer.address.slice(0, 10) + "...");
  console.log("🏪 商家:", merchant.address.slice(0, 10) + "...");
  console.log("🛵 骑手:", rider.address.slice(0, 10) + "...");
  console.log(`💰 订单金额: ${hre.ethers.formatEther(amount)} ETH\n`);

  // 1. 下单
  console.log("📦 [1/5] 用户下单...");
  const tx1 = await contract.connect(customer).createOrder(
    merchant.address,
    '{"items":"黄焖鸡米饭+可乐","price":"0.1 ETH"}',
    { value: amount }
  );
  await tx1.wait();
  const order = await contract.getOrder(1);
  console.log(`   ✅ 订单#${order.id} 已创建 | 状态: Pending | 金额已锁定在合约\n`);

  // 2. 商家接单
  console.log("👨‍🍳 [2/5] 商家接单...");
  const tx2 = await contract.connect(merchant).acceptOrder(1);
  await tx2.wait();
  console.log("   ✅ 商家已接单 | 状态: Accepted\n");

  // 3. 分配骑手
  console.log("🛵 [3/5] 分配骑手...");
  const tx3 = await contract.connect(merchant).assignRider(1, rider.address);
  await tx3.wait();
  console.log("   ✅ 骑手已分配 | 状态: Delivering\n");

  // 4. 骑手送达
  console.log("📬 [4/5] 骑手送达...");
  const tx4 = await contract.connect(rider).confirmDelivery(1);
  await tx4.wait();
  console.log("   ✅ 已送达 | 状态: Delivered\n");

  // 5. 用户确认收货 → 分账
  console.log("💸 [5/5] 用户确认收货 → 自动分账...");
  const tx5 = await contract.connect(customer).confirmReceipt(1);
  const receipt = await tx5.wait();
  console.log("   ✅ 分账完成 | 状态: Completed\n");

  // 查看最终结果
  const finalOrder = await contract.getOrder(1);
  console.log("═══════════════════════════════════");
  console.log("📊 分账明细:");
  console.log("═══════════════════════════════════");
  console.log(`   🏪 商家: ${hre.ethers.formatEther(amount * 85n / 100n)} ETH (85%)`);
  console.log(`   🛵 骑手: ${hre.ethers.formatEther(amount * 12n / 100n)} ETH (12%)`);
  console.log(`   🔗 协议: ${hre.ethers.formatEther(amount * 3n / 100n)} ETH (3%)`);
  console.log(`   ─────────────────────────`);
  console.log(`   📦 总计: ${hre.ethers.formatEther(amount)} ETH`);

  const fees = await contract.protocolFees();
  console.log(`\n🏦 协议金库累积: ${hre.ethers.formatEther(fees)} ETH`);
  console.log("\n🎉 完整订单流程跑通！");
}

main().catch(console.error);

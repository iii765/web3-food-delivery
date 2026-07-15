# 🛵 Web3 Food Delivery

智能合约托管 · 自动分账 85/12/3 · 零中间商抽成

## 核心理念

美团抽商家 25%，平台独赢。我们用智能合约替代平台——**代码管钱，自动分账，抽 3%。**

## 分账模型

```
用户下单 → 资金锁定在合约 → 商家接单 → 骑手配送 → 确认收货
                                                        ↓
                                            🏪 商家 85%  🛵 骑手 12%  🔗 协议 3%
```

## 当前状态

📝 MVP 阶段 — `OrderContract.sol` 已实现完整订单生命周期

- ✅ 下单 + 资金托管
- ✅ 商家接单 + 骑手分配
- ✅ 自动分账（85/12/3）
- ✅ 取消退款 + 争议仲裁
- ✅ 17 个测试全通过
- ✅ 前端交互页面

## 技术栈

| 层 | 技术 |
|----|------|
| 合约 | Solidity + Hardhat |
| 前端 | HTML + ethers.js v6 |
| 网络 | Monad Testnet (chain 10143) |

## 快速开始

```bash
git clone https://github.com/iii765/web3-food-delivery.git
cd web3-food-delivery
npm install

# 跑测试
npx hardhat test test/OrderContract.js

# 本地链 + 部署
npx hardhat node
npx hardhat run scripts/deploy-order.js --network localhost

# 前端体验
浏览器打开 frontend/index.html → 连 MetaMask → 一步步走订单
```

## Windows 开发

装好 Node.js、Git 后，以上命令完全通用（推荐 Git Bash 或 PowerShell）。

## 路线图

- [ ] `ReputationContract.sol` — 链上信誉系统
- [ ] `TokenContract.sol` — 双代币（$FOOD / $BITE）
- [ ] React 前端
- [ ] Monad Testnet 部署

## 协议

MIT License

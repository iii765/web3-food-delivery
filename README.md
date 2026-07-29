# 🛵 Web3 外卖平台

一个基于 Solidity 智能合约的外卖订单 MVP。用户下单时资金进入合约托管；订单完成后，合约按规则自动结算给商家、骑手和协议。

## 功能

- 用户：创建订单、待接单时取消订单、确认收货、查看订单历史
- 商家：接单、查看进行中与历史订单
- 骑手：抢单、确认送达、查看配送历史
- 管理员：查看订单、链上事件和协议费用；处理争议
- 自动分账：用户确认收货后自动执行

## 分账规则

| 场景 | 商家 | 骑手 | 协议 |
| --- | ---: | ---: | ---: |
| 骑手配送 | 85% | 12% | 3% |
| 商家自配送 | 97% | 0% | 3% |

## 技术栈

- Solidity `0.8.24` + Hardhat
- ethers.js v6 + MetaMask
- 原生 HTML/CSS/JavaScript 三角色前端
- 本地链：Hardhat Local（Chain ID `31337`）
- 可选测试网：Monad Testnet（Chain ID `10143`）

## 项目结构

```text
contracts/OrderContract.sol  # 核心订单与托管分账合约
test/OrderContract.js        # 合约测试
scripts/deploy-order.js      # 部署并同步本地前端合约地址
scripts/demo-order.js        # 自动完成一笔订单的演示脚本
scripts/serve-frontend.js    # 本地前端 HTTP 服务
frontend/
  ├── index.html             # 导航页
  ├── customer.html          # 用户端
  ├── merchant.html          # 商家端
  ├── rider.html             # 骑手端
  ├── admin.html             # 管理端
  └── config.js              # 共享网络和合约地址配置
TEST_GUIDE.md                # 完整本地联调说明
```

## 快速开始（本地联调）

```bash
npm install
npm test
```

随后打开 **3 个终端**：

```bash
# 终端 A：启动本地区块链，测试期间不要关闭
npm run node

# 终端 B：部署合约，并自动同步 frontend/config.js
npm run deploy:local

# 终端 C：启动前端 HTTP 服务，测试期间不要关闭
npm run serve
```

浏览器访问：<http://127.0.0.1:8081/>

MetaMask 添加 Hardhat Local：

| 配置 | 值 |
| --- | --- |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| 货币符号 | `ETH` |

从终端 A 的输出导入本地测试账户：Account #0 为用户、#1 为商家、#2 为骑手。**仅使用 Hardhat 自动生成的测试私钥，绝不导入真实钱包私钥。**

完整的启动、角色切换、停止服务说明见 [TEST_GUIDE.md](./TEST_GUIDE.md)。

## 角色测试顺序

1. 用户端：连接 Account #0，创建订单。
2. 商家端：切换至 Account #1，接单。
3. 骑手端：切换至 Account #2，抢单并确认送达。
4. 用户端：切回 Account #0，确认收货，触发自动分账。
5. 管理端：核对订单、事件与协议费用。

每个角色页面需主动点击“连接钱包”；同一浏览器源已授权后 MetaMask 可能不会再次显示授权弹窗，这是正常行为。

## 常用命令

```bash
npm test              # 运行合约测试
npm run node          # 启动 Hardhat 本地链（8545）
npm run deploy:local  # 部署本地合约并更新前端配置
npm run serve         # 启动前端服务（8081）
npm run demo          # 自动演示完整订单流程
```

按 `Ctrl+C` 可停止 `npm run node` 或 `npm run serve`。重启本地链会清空合约和订单数据，因此必须再次运行 `npm run deploy:local`。

## Monad Testnet（可选）

在 `.env` 配置 `MONAD_RPC_URL` 和 `PRIVATE_KEY` 后：

```bash
npx hardhat run scripts/deploy-order.js --network monadTestnet
```

不要提交 `.env` 或任何真实私钥。测试网部署地址需要有意识地更新到 `frontend/config.js` 的 `10143` 配置中。

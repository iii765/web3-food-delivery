# 🛵 Web3 外卖平台

基于智能合约的外卖订单 MVP：用户付款进入托管合约，订单完成后自动结算，平台只收协议费。

## 当前能力

- 用户下单、待接单时取消并退款
- 商家接单
- 骑手自主抢单、确认送达
- 用户确认收货后自动分账
- 订单争议与管理员裁决
- 管理端查看订单、链上事件与协议费用

## 分账规则

| 场景 | 商家 | 骑手 | 协议 |
| --- | ---: | ---: | ---: |
| 有骑手配送 | 85% | 12% | 3% |
| 无骑手 / 商家自配送 | 97% | 0% | 3% |

## 技术栈

- 合约：Solidity `0.8.24`、Hardhat、OpenZeppelin
- 前端：静态 HTML、ethers.js v6、MetaMask
- 本地网络：Hardhat Local（Chain ID `31337`）
- 测试网络：Monad Testnet（Chain ID `10143`）

## 开始前

```bash
cd ~/.openclaw/workspace/web3-dev
npm install
```

浏览器需要安装 MetaMask。前端页面请通过 `frontend/index.html` 进入；它是导航页，正式业务操作统一在角色页面完成。

## 本地测试：唯一流程

### 1. 跑自动化合约测试

```bash
npm test
```

预期：所有测试通过。

### 2. 启动本地链

终端 A：

```bash
npm run node
```

保持这个终端运行。重启本地链会清空所有账户状态、已部署合约和订单。

### 3. 部署合约并自动同步前端地址

新开终端 B：

```bash
npm run deploy:local
```

脚本会部署 `OrderContract`，并自动更新 `frontend/config.js` 中的本地合约地址。**不需要手动修改任何 HTML。**

### 4. 配置 MetaMask

添加或切换到：

| 配置项 | 值 |
| --- | --- |
| Network Name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | `ETH` |

从终端 A 的 Hardhat 输出导入前三个测试账户私钥：

| 角色 | 使用账户 |
| --- | --- |
| 用户 Customer | Account #0 |
| 商家 Merchant | Account #1 |
| 骑手 Rider | Account #2 |

> 仅导入本地 Hardhat 自动生成的测试私钥；不要导入真实钱包私钥。

### 5. 角色联调

在浏览器打开 `frontend/index.html`，按以下顺序操作并按角色切换 MetaMask 账户：

1. **用户端**（Account #0）：打开 `customer.html`，创建订单。
2. **商家端**（Account #1）：打开 `merchant.html`，接单。
3. **骑手端**（Account #2）：打开 `rider.html`，抢单并确认送达。
4. **用户端**（Account #0）：回到 `customer.html`，确认收货。
5. **管理端**：打开 `admin.html`，核对订单状态、链上事件和协议费用。

正常配送完成后，检查分账为商家 85%、骑手 12%、协议 3%。

## 自动演示

本地链与部署完成后，可运行：

```bash
npm run demo
```

它会自动走完整订单流程，用于快速验证合约交互。

## 常用命令

```bash
npm test              # 合约自动化测试
npm run node          # 启动 Hardhat 本地链
npm run deploy:local  # 部署本地合约并同步前端地址
npm run demo          # 自动演示完整订单流程
```

## 前端结构

```text
frontend/
├── index.html       # 测试导航入口，不含业务逻辑
├── config.js        # 所有页面共享的网络与合约地址配置
├── customer.html    # 用户端
├── merchant.html    # 商家端
├── rider.html       # 骑手端
└── admin.html       # 管理端
```

## Monad 测试网

本地流程稳定后再部署 Monad。Monad 地址与本地地址不同；部署前检查 `.env` 已配置 `MONAD_RPC_URL` 与 `PRIVATE_KEY`，且不要把私钥提交到 Git。

```bash
npx hardhat run scripts/deploy-order.js --network monadTestnet
```

该命令不会覆盖 `frontend/config.js` 中的 Monad 地址；确认合约正常后，再有意识地更新该地址。

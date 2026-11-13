# Web3 外卖平台 — 本地联调测试流程

## 概览：需要几个终端窗口？

**共 3 个终端，1 个浏览器（含 MetaMask）**

| 终端 | 作用 | 是否需要保持运行 |
|---|---|---|
| 终端 A | 运行 Hardhat 本地链（模拟区块链） | ✅ 全程保持 |
| 终端 B | 部署合约 | ❌ 部署完就可以关 |
| 终端 C | 运行前端服务 | ✅ 全程保持 |

---

## 第一步：启动本地区块链（终端 A）

```bash
cd ~/.openclaw/workspace/web3-dev
npm run node
```

**作用：** 在本地启动一条模拟以太坊区块链，监听 `http://127.0.0.1:8545`。

**成功标志：** 看到以下输出，并打印出 20 个测试账户和私钥：

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

⚠️ **重要：** 这个终端必须全程保持运行。关掉它等于关掉区块链，所有合约和订单数据都会清空，需要重头来过。

---

## 第二步：部署合约（终端 B）

> **前提：** 终端 A 必须已在运行。

新开一个终端：

```bash
cd ~/.openclaw/workspace/web3-dev
npm run deploy:local
```

**作用：** 把 `OrderContract.sol` 编译并部署到终端 A 的本地链上，同时自动将合约地址写入 `frontend/config.js`。

**成功标志：**

```
✅ OrderContract deployed to: 0x...
📝 已同步前端本地合约地址: 0x...

🌐 前端页面（先另开终端运行 npm run serve）:
   导航页: http://127.0.0.1:8081/
   顾客端: http://127.0.0.1:8081/customer.html
   ...

📋 分账比例:
   商家: 85%
   骑手: 12%
   协议: 3%
```

部署完成后这个终端可以关掉。

---

## 第三步：启动前端服务（终端 C）

新开一个终端：

```bash
cd ~/.openclaw/workspace/web3-dev
npm run serve
```

**作用：** 启动本地 HTTP 服务，让浏览器能通过 `http://` 访问前端页面。MetaMask 不支持 `file://` 协议，必须用 HTTP。

**成功标志：**

```
🌐 前端服务已启动: http://127.0.0.1:8081/
```

⚠️ **重要：** 这个终端也必须全程保持运行。

---

## 第四步：配置 MetaMask

> 只需配置一次，以后直接用。

### 添加 Hardhat Local 网络

MetaMask → 设置 → 网络 → 添加网络 → 手动添加：

| 字段 | 填写内容 |
|---|---|
| 网络名称 | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| 链 ID | `31337` |
| 货币符号 | `ETH` |
| 区块浏览器 | （留空） |

### 导入 3 个测试账户

从终端 A 的输出中找到 Account #0、#1、#2 的私钥，分别导入 MetaMask（账户 → 导入账户 → 粘贴私钥）：

| 角色 | MetaMask 账户 |
|---|---|
| 顾客（下单、确认收货） | Account #0 |
| 商家（接单） | Account #1 |
| 骑手（抢单、确认送达） | Account #2 |

---

## 第五步：浏览器联调（核心流程）

打开 `http://127.0.0.1:8081/`，按以下顺序操作：

### 1. 顾客下单（切换到 Account #0）

打开 `http://127.0.0.1:8081/customer.html`，连接钱包，填写金额并下单。MetaMask 弹出确认 → 点击确认。

预期：合约锁住资金，订单状态变为 `Pending`（待接单）。

### 2. 商家接单（切换到 Account #1）

MetaMask 切换到 Account #1，打开 `http://127.0.0.1:8081/merchant.html`，连接钱包，找到待接订单并接单。

预期：订单状态变为 `Accepted`（已接单）。

### 3. 骑手抢单 + 确认送达（切换到 Account #2）

MetaMask 切换到 Account #2，打开 `http://127.0.0.1:8081/rider.html`，连接钱包，抢单并确认送达。

预期：订单状态变为 `Delivered`（已送达）。

### 4. 顾客确认收货 → 自动分账（切换回 Account #0）

MetaMask 切回 Account #0，回到 `http://127.0.0.1:8081/customer.html`，确认收货。

预期：合约自动将资金按比例打款 — 商家 85%、骑手 12%、协议 3%。

### 5. 管理端核查

打开 `http://127.0.0.1:8081/admin.html`，查看订单历史、链上事件、协议累计费用。

---

## 第六步（可选）：自动演示

不想手动点的话，在终端 B 运行：

```bash
npm run demo
```

脚本会自动完成一笔完整订单的全流程，终端输出每一步执行结果。

---

## 结束测试：如何关闭服务

测试完后，在对应的终端窗口按：

```bash
Ctrl+C
```

| 终端 | 停止方式 | 影响 |
|---|---|---|
| 终端 A：`npm run node` | `Ctrl+C` | 关闭本地链；全部本地订单、合约状态都会消失 |
| 终端 C：`npm run serve` | `Ctrl+C` | 关闭前端网页服务；不影响链上数据 |
| 终端 B：部署命令 | 命令结束后已自动退出 | 无需关闭 |

下次重新测试，按“第一步 → 第二步 → 第三步”重新启动即可。注意：每次重启本地链后，都必须重新执行 `npm run deploy:local`，因为旧的合约地址和订单数据已失效。

## 常见问题

**Q: 重启本地链后前端连不上？**

先运行 `npm run deploy:local` 重新部署合约（旧合约地址已失效），再刷新浏览器，MetaMask 也要重置 nonce（设置 → 高级 → 清除活动记录）。

**Q: MetaMask 报错 nonce too high？**

MetaMask 设置 → 高级 → 清除活动记录（Clear activity tab data），然后重试。

**Q: 部署成功但页面显示"合约未找到"？**

刷新页面，检查 MetaMask 是否切换到了 Hardhat Local 网络（Chain ID 31337）。

---

## Monad Testnet 联调流程

> Monad 是公开测试网：交易会真实广播到测试网，但只消耗测试 MON，不要使用主网资产或含真实资金的钱包。
>
> **和本地链最大的区别：** 不需要 `npm run node`；每个角色必须使用一个独立、已领水的测试钱包；部署后必须将测试网合约地址同步进前端配置。

### 0. 准备三个测试钱包并领取测试 MON

建议在 MetaMask 新建三个专用测试账户（或三个独立测试钱包），不要导入常用主钱包私钥：

| 角色 | 用途 | 需要测试 MON |
|---|---|---|
| 顾客钱包 | 下单、取消、确认收货 | 是：支付订单金额和 Gas |
| 商家钱包 | 接单 | 是：支付 Gas |
| 骑手钱包 | 抢单、确认送达 | 是：支付 Gas |
| 部署钱包 | 部署合约、后续管理协议费/争议 | 是：支付部署 Gas |

可让部署钱包同时充当顾客钱包，但商家和骑手必须是不同地址；合约会拒绝顾客或商家自己抢骑手单。

分别从 Monad 官方 faucet 为会发交易的地址领取测试 MON。测试网的币没有价值；余额不足时只会导致交易无法广播或 Gas 估算失败。

### 1. 在 MetaMask 添加 Monad Testnet

MetaMask → 设置 → 网络 → 添加网络 → 手动添加：

| 字段 | 填写内容 |
|---|---|
| 网络名称 | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| 链 ID | `10143` |
| 货币符号 | `MON` |
| 区块浏览器 | `https://testnet.monadexplorer.com` |

前端右上角选择 **Monad Testnet** 后，页面会请求切换到这个网络。确认 MetaMask 顶部也显示的是 Monad Testnet，不能停留在 Hardhat Local（31337）。

### 2. 配置部署钱包（只在本机 `.env`）

在项目根目录创建或编辑 `.env`。`PRIVATE_KEY` 必须是**部署钱包的测试私钥**，以 `0x` 开头；不要把此文件提交到 Git。

```bash
cd ~/.openclaw/workspace/web3-dev
cat > .env <<'EOF'
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
PRIVATE_KEY=0x替换成部署钱包的测试私钥
EOF
```

先确认部署地址有测试 MON；如果余额为 0，先到 faucet 领取，再继续。

### 3. 编译、测试并部署至 Monad

```bash
cd ~/.openclaw/workspace/web3-dev
npm test
npx hardhat run scripts/deploy-order.js --network monadTestnet
```

部署成功时记录终端输出中的地址：

```text
✅ OrderContract deployed to: 0x你的Monad合约地址
```

> 脚本在非本地网络下**不会自动修改**前端配置，避免意外覆盖已部署地址；下一步必须手动同步。

### 4. 将新合约地址同步到前端

打开 `frontend/config.js`，只替换 `"10143"`（Monad Testnet）区块的 `contractAddress`，**不要动 `"31337"` 的本地地址**：

```js
"10143": {
  chainId: 10143,
  // ...
  contractAddress: "0x你的Monad合约地址"
}
```

保存后启动或重启前端：

```bash
npm run serve
```

浏览器打开 <http://127.0.0.1:8081/>，再按 `Ctrl + Shift + R` 强制刷新，避免继续使用浏览器缓存中的旧 `config.js`。

### 5. Monad 全流程测试

每次切换角色前：在 MetaMask 切到对应账户 → 确认网络为 Monad Testnet → 对应页面点击“连接钱包”。

1. **顾客**：打开 `customer.html`，填写**商家测试地址**、小额测试金额（建议 `0.001 MON`）和备注，创建订单。预期状态：`Pending`。
2. **商家**：切到商家钱包，打开 `merchant.html`，接单。预期状态：`Accepted`。
3. **骑手**：切到骑手钱包，打开 `rider.html`，抢单，再确认送达。预期状态：`Delivered`。
4. **顾客**：切回顾客钱包，打开 `customer.html`，确认收货。预期状态：`Completed`；合约按 85% / 12% / 3% 分账。
5. **管理员核对**：使用部署钱包打开 `admin.html`，核对订单记录、事件和协议费用。

每一笔业务交易都应在 MetaMask 确认后等待上链。浏览器显示成功前，页面会等待 `tx.wait()`，即已取得成功回执；仍建议复制交易哈希，在 Monad 区块浏览器确认 `Success`、调用方法和事件。

### 6. 验证已部署合约（可选）

部署完成后可尝试：

```bash
npx hardhat verify --network monadTestnet 0x你的Monad合约地址
```

如果验证服务要求 API Key，再根据 Monad 当前官方验证器要求配置对应环境变量；这不会影响合约本身的运行或前端测试。

### Monad 常见问题

**Q: 页面显示“合约未找到”或订单全部加载失败？**
依次确认：MetaMask 是 Chain ID `10143`、`frontend/config.js` 的 `10143.contractAddress` 是本次部署地址、前端已强制刷新，并在区块浏览器确认该地址有合约代码。

**Q: MetaMask 无法确认交易 / Gas 估算失败？**
确认当前账户有足够测试 MON，并检查角色是否正确：仅商家可接单、仅不同于顾客和商家的地址可抢单、仅骑手可确认送达、仅顾客可确认收货。

**Q: 前端提示成功，但区块浏览器显示失败？**
保存交易哈希和 MetaMask 错误信息，不要继续下一步。先核对 receipt 状态、当前网络、合约地址与订单状态；已失败的交易不会改变订单状态。

**Q: 能否使用之前 Hardhat Local 的订单？**
不能。本地链与 Monad Testnet 完全独立；需要在 Monad 上重新部署并新建订单。

## 进程一览

| 场景 | 进程 | 端口 | 作用 |
|---|---|---:|---|
| 本地联调 | `npm run node` | 8545 | Hardhat 本地区块链 |
| 本地 / Monad 前端 | `npm run serve` | 8081 | 前端 HTTP 服务 |
| Monad 测试网 | 无需本地链 | — | 使用公共 Monad RPC |


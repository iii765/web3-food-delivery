# Monad Testnet 部署清单

> 生成时间：2026-11-13 · 基于本机实测结果

## 0. 现状核查（已实测）

| 项目 | 结果 |
| --- | --- |
| RPC 可达性 | ✅ `https://testnet-rpc.monad.xyz` 返回 chainId `0x279f` = 10143 |
| 已有部署地址 | `0xC2f42082b16b4c06a0020a9a4cCDf555EF8c59de` |
| 该地址链上代码 | ✅ 有字节码（非 0x），说明**之前确实部署过** |
| 该地址余额 | `0xaa87bee538000` ≈ 0.003 MON（有少量遗留，可能是协议费） |

结论：不是从零开始，是**在已有部署上迭代**。重新部署会产生新地址，需要同步前端。

## 1. 部署前准备

- [ ] 准备一个**专用部署钱包**，不要用主钱包私钥
- [ ] 领测试网 MON：Monad Faucet（官方 Discord 或 faucet 站点），至少 0.5 MON
- [ ] 私钥只通过环境变量传入，绝不写进仓库：
      `export PRIVATE_KEY=0x...`
- [ ] 确认 `hardhat.config.js` 的 `monadTestnet.accounts` 读的是 `process.env.PRIVATE_KEY`（当前实现如此）

## 2. 部署

```bash
export PRIVATE_KEY=0x...
npx hardhat run scripts/deploy-order.js --network monadTestnet
```

⚠️ **注意**：`deploy-order.js` 里的 `updateLocalFrontendConfig()` **只更新 31337（本地）** 的地址，
10143 的地址需要手动改 `frontend/config.js` 里 `"10143".contractAddress`。

## 3. 部署后验证

- [ ] 拿新地址查链上代码：
```bash
curl -s -X POST https://testnet-rpc.monad.xyz \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["<新地址>","latest"]}'
# 返回不应是 "0x"
```
- [ ] 浏览器打开 `https://testnet.monadexplorer.com/address/<新地址>` 确认合约已创建
- [ ] 前端手动切到 Monad Testnet，走一遍：下单 → 商家接单 → 骑手送达 → 确认收货 → 查分账

## 4. 常见坑（按踩中概率排序）

1. **MetaMask 网络参数**：chainId 必须传十进制 `10143` 或十六进制 `0x27a3`，两者混用会导致 "chainId mismatch"
2. **公共 RPC 限流**：`testnet-rpc.monad.xyz` 是公共端点，并发高时返回 429。部署多次失败先怀疑这个，换私用 RPC 或降低频率
3. **gas 配置**：Monad 对 EIP-1559 支持与以太坊略有差异，如果 `maxFeePerGas` 相关报错，退回 legacy gasPrice
4. **前端地址没更新**：部署成功但页面报 "no contract"，90% 是 `frontend/config.js` 没同步
5. **私钥格式**：要带 `0x` 前缀，且长度 66；缺前缀会导致 Hardhat 抛 invalid account

## 5. 回滚

合约无法回滚，只能：
- 前端 `config.js` 改回旧地址（`0xC2f4...59de`）即回到上一版
- 旧合约里的资金仍可读取，但新逻辑不会生效

**建议**：每次部署把新地址记到 `docs/deployments.md`（地址 / 时间 / commit hash），否则三次之后没人分得清哪个是哪个。

## 6. 记账模板

| 日期 | 网络 | 合约地址 | commit | 备注 |
| --- | --- | --- | --- | --- |
| 2026-??-?? | Monad 10143 | 0xC2f42082b16b4c06a0020a9a4cCDf555EF8c59de | ? | 旧版本（85/12/3） |

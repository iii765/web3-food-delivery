# HANDOFF — Web3 外卖平台

> 供后继开发者 / AI 编码代理（Codex、Claude Code 等）接手使用。
> 生成时间：2026-11-13

## 1. 项目概览

基于 Solidity 智能合约的外卖订单 MVP。用户下单资金进入合约托管，订单完成后按规则自动结算。

- 技术栈：Solidity `0.8.24` + Hardhat + ethers.js v6 + 原生 HTML/JS 前端
- 合约：`contracts/OrderContract.sol`
- 测试：`test/OrderContract.js` — **当前 17 passing**
- 网络：本地 Hardhat（chainId `31337`，RPC `http://127.0.0.1:8545`）、Monad Testnet（chainId `10143`，RPC `https://testnet-rpc.monad.xyz`）

## 2. 分账规则（当前实现）

分账拆成两部分，各自独立计算：

| 组成 | 商家/骑手 | 协议 |
| --- | ---: | ---: |
| 餐费 | 商家 90% | 10% |
| 配送费 | 骑手 90% | 10% |

实现要点：
- `MERCHANT_SHARE = 90`、`RIDER_SHARE = 90` 为 `constant`
- 商家自配送时，配送费归商家（不产生骑手分成）
- 修改分账比例前必须先改测试，且需产品确认

## 3. 角色与流程

1. **用户**：创建订单（托管餐费+配送费）→ 待接单可取消 → 确认收货触发分账
2. **商家**：接单 → 备餐完成 → （自配送或等待骑手）
3. **骑手**：抢单 → 确认送达
4. **管理员**：查看订单/事件/协议费，处理争议

## 4. 目录结构

```
contracts/OrderContract.sol   核心合约
scripts/deploy-order.js       部署脚本
scripts/demo-order.js         演示下单流程
scripts/serve-frontend.js     本地静态服务器
frontend/customer.html        用户端
frontend/merchant.html        商家端
frontend/rider.html           骑手端
frontend/admin.html           管理端
frontend/config.js            网络与合约地址配置
```

## 5. 本地运行

```bash
npm install
npx hardhat node                    # 终端 A：本地链
npx hardhat run scripts/deploy-order.js --network localhost   # 终端 B：部署
node scripts/serve-frontend.js      # 终端 C：前端
```

部署后把合约地址写进 `frontend/config.js`。

## 6. 测试

```bash
npx hardhat test        # 期望：17 passing
```

提交前必须通过。

## 7. 已知待办

- [ ] 争议处理流程只做了骨架，缺少仲裁时限与双方举证结构
- [ ] 骑手抢单缺少质押/惩罚机制，存在恶意抢单无成本问题
- [ ] 订单超时未送达没有自动退款路径
- [ ] 前端网络切换在部分 MetaMask 版本仍有边缘情况
- [ ] 尚未部署到 Monad Testnet 做真实链路验证
- [ ] 缺少事件索引层（当前靠遍历事件，量大后性能问题）

## 8. 给编码代理的约束

1. 合约使用 `0.8.24`，不要引入新依赖库（OpenZeppelin 除外，需说明理由）
2. 任何合约改动必须同步更新 `test/OrderContract.js`，提交前 `npx hardhat test` 全绿
3. **禁止**把私钥、助记词写进仓库；部署用环境变量 `PRIVATE_KEY`
4. 分账比例、手续费归属属于产品决策，不得自行调整
5. 前端保持零构建（原生 HTML/JS），不引入框架，除非需求明确
6. 提交信息用中文或英文皆可，但需说明「改了什么、为什么」

## 9. 当前工作区状态

最近一次未提交改动包含：合约分账重构、测试重写、四个前端页面同步、TEST_GUIDE 更新。
详见 `git diff`。

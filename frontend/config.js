// 共享前端配置：本地部署脚本会自动更新 local.contractAddress。
window.WEB3_FOOD_CONFIG = {
  networks: {
    "31337": {
      chainId: 31337,
      chainIdHex: "0x7a69",
      name: "Hardhat Local",
      rpc: "http://127.0.0.1:8545",
      currency: "ETH",
      explorer: null,
      contractAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    },
    "10143": {
      chainId: 10143,
      chainIdHex: "0x27a3",
      name: "Monad Testnet",
      rpc: "https://testnet-rpc.monad.xyz",
      currency: "MON",
      explorer: "https://testnet.monadexplorer.com",
      contractAddress: "0xd1807927CD56CC87Ec846B96aBCFdFD959529436"
    }
  }
};

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
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    },
    "10143": {
      chainId: 10143,
      chainIdHex: "0x27a3",
      name: "Monad Testnet",
      rpc: "https://testnet-rpc.monad.xyz",
      currency: "MON",
      explorer: "https://testnet.monadexplorer.com",
      contractAddress: "0xC2f42082b16b4c06a0020a9a4cCDf555EF8c59de"
    }
  }
};

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
      websockets: true
    }
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      version: "0.8.20", // Стабильная версия Solidity
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
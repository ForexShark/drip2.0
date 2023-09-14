require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const env = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://bsc-mainnet.nodereal.io/v1/f82aa3b8072a46ccadf3024a96f0cff4`,
        blockNumber: 31252479,
        chainId: 56,
      },
    },
    mainnet: {
      url: `https://bsc-dataseed1.binance.org`,
      chainId: 56,
      accounts: [env.pk],
    },
  },
  etherscan: {
    apiKey: env.apiKey,
  },
};

require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const env = process.env;
const CHAIN_ID = 56;
const BLOCK_NUMBER = 32170456;
const BSC_URL = "https://bsc-mainnet.nodereal.io/v1/f82aa3b8072a46ccadf3024a96f0cff4";

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
    local: {
      // by default local is 31337, let's keep it that way
      url: "http://127.0.0.1:8545",
      forking: {
        url: BSC_URL,
        chainId: CHAIN_ID,
        blockNumber: BLOCK_NUMBER,
      },
    },
    hardhat: {
      forking: {
        url: BSC_URL,
        blockNumber: BLOCK_NUMBER,
        chainId: CHAIN_ID,
      },
    },
    mainnet: {
      url: `https://bsc-dataseed1.binance.org`,
      chainId: CHAIN_ID,
      accounts: [env.pk],
    },
  },
  etherscan: {
    apiKey: env.apiKey,
  },
};

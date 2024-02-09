import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox-viem";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL ?? "https://eth.llamarpc.com",
      },
      chainId: 1,
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL ?? "https://eth.llamarpc.com",
    },
  },
};

export default config;

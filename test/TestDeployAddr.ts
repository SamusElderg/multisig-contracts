import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress } from "viem";

describe("Gnosis Safe Address Determinism", function () {
  // fork mainnet ethereum (all contracts already exist, no need to deploy anything)
  // mock HARDHAT_DEPLOYER_ADDR (from .env)
  async function setupFixture() {
    console.log("Setting up fixture...");
    const deployerAddr = process.env.HARDHAT_DEPLOYER_ADDR as `0x${string}`;
    const multisigPolyAddr = process.env
      .HARDHAT_MULTISIG_POLY_ADDR as `0x${string}`;
    const safeProxyAddr = process.env.HARDHAT_SAFE_PROXY_ADDR as `0x${string}`;
    const singletonAddr = process.env
      .HARDHAT_SAFE_SINGLETON_ADDR as `0x${string}`;

    const initializerData = process.env
      .HARDHAT_INITIALIZER_DATA as `0x${string}`;

    /* Impersonate the deployer of the original multisig you are wanting to replicate on another chain */
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [deployerAddr],
    });

    const publicClient = await hre.viem.getPublicClient();
    const [fromWalletClient, toWalletClient] =
      await hre.viem.getWalletClients();

    let safeProxyContract = await hre.viem.getContractAt(
      "GnosisSafeProxyFactory",
      safeProxyAddr,
      { walletClient: fromWalletClient }
    );
    console.log("Ending fixture setup...");

    return {
      deployerAddr,
      multisigPolyAddr,
      safeProxyAddr,
      singletonAddr,
      initializerData,
      publicClient,
      fromWalletClient,
      toWalletClient,
      safeProxyContract,
    };
  }

  // call using mocked HARDHAT_DEPLOYER_ADDR to HARDHAT_SAFE_PROXY_ADDR with input data HARDHAT_INPUT_DATA
  describe("Run the tests", function () {
    it("send txn and confirm deployed address", async function () {
      console.log("Running test...");
      const {
        deployerAddr,
        multisigPolyAddr,
        safeProxyAddr,
        singletonAddr,
        initializerData,
        publicClient,
        fromWalletClient,
        toWalletClient,
        safeProxyContract,
      } = await loadFixture(setupFixture);

      const contractBefore = await publicClient.getBytecode({
        address: multisigPolyAddr,
      });
      console.log("Contract before:", contractBefore);
      expect(contractBefore).to.equal(undefined);

      const hash = await safeProxyContract.write.createProxyWithNonce([
        singletonAddr,
        initializerData,
        1697154183832n,
      ]);

      console.log("Deploying multisig wallet...", hash);

      const deployMultisigWalletTxReceipt =
        await publicClient.waitForTransactionReceipt({ hash });

      const logs = deployMultisigWalletTxReceipt.logs;

      if (logs.length > 0) {
        const firstLogAddress = logs[0].address;
        console.log("First log address:", firstLogAddress);

        // Check if the first log's address matches `multisigPolyAddr`
        expect(firstLogAddress.toLowerCase()).to.equal(
          multisigPolyAddr.toLowerCase()
        );
      } else {
        throw new Error("No logs found in transaction receipt");
      }

      const contractAfter = await publicClient.getBytecode({
        address: multisigPolyAddr,
      });
      console.log("Contract after:", contractAfter);
      expect(contractAfter).to.not.equal(undefined);
    });
  });

  // expect resulting deployment address to match HARDHAT_MULTISIG_MATIC_ADDR
});

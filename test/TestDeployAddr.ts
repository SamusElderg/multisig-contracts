import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Gnosis Safe Address Determinism", function () {
  async function setupFixture() {
    const deployerAddr = process.env.HARDHAT_DEPLOYER_ADDR as `0x${string}`;
    const multisigPolyAddr = process.env
      .HARDHAT_MULTISIG_POLY_ADDR as `0x${string}`;
    const safeProxyAddr = process.env.HARDHAT_SAFE_PROXY_ADDR as `0x${string}`;
    const singletonAddr = process.env
      .HARDHAT_SAFE_SINGLETON_ADDR as `0x${string}`;
    const initializerData = process.env
      .HARDHAT_INITIALIZER_DATA as `0x${string}`;
    await impersonateAccount(deployerAddr);
    const publicClient = await hre.viem.getPublicClient();
    const [fromWalletClient, toWalletClient] =
      await hre.viem.getWalletClients();
    const safeProxyContract = await hre.viem.getContractAt(
      "GnosisSafeProxyFactory",
      safeProxyAddr,
      { walletClient: fromWalletClient }
    );
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

  it("send txn and confirm deployed address", async function () {
    const {
      multisigPolyAddr,
      singletonAddr,
      initializerData,
      publicClient,
      safeProxyContract,
    } = await loadFixture(setupFixture);

    const contractBefore = await getBytecode(
      multisigPolyAddr,
      "Contract before"
    );
    expect(contractBefore).to.equal(undefined);

    const hash = await createProxyWithNonce(
      safeProxyContract,
      singletonAddr,
      initializerData
    );
    const deployMultisigWalletTxReceipt = await waitForTransactionReceipt(
      publicClient,
      hash
    );

    const firstLogAddress = getFirstLogAddress(deployMultisigWalletTxReceipt);
    expect(firstLogAddress.toLowerCase()).to.equal(
      multisigPolyAddr.toLowerCase()
    );

    const contractAfter = await getBytecode(multisigPolyAddr, "Contract after");
    expect(contractAfter).to.not.equal(undefined);
  });
});

async function impersonateAccount(deployerAddr: string) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [deployerAddr],
  });
}

async function getBytecode(address: `0x${string}`, logMessage: string) {
  const publicClient = await hre.viem.getPublicClient();
  const bytecode = await publicClient.getBytecode({ address });
  console.log(logMessage, bytecode);
  return bytecode;
}

async function createProxyWithNonce(
  safeProxyContract: any,
  singletonAddr: string,
  initializerData: string
) {
  const hash = await safeProxyContract.write.createProxyWithNonce([
    singletonAddr,
    initializerData,
    1697154183832n,
  ]);
  console.log("Deploying multisig wallet...", hash);
  return hash;
}

async function waitForTransactionReceipt(publicClient: any, hash: string) {
  return await publicClient.waitForTransactionReceipt({ hash });
}

function getFirstLogAddress(deployMultisigWalletTxReceipt: any) {
  const logs = deployMultisigWalletTxReceipt.logs;
  if (logs.length > 0) {
    const firstLogAddress = logs[0].address;
    console.log("First log address:", firstLogAddress);
    return firstLogAddress;
  } else {
    throw new Error("No logs found in transaction receipt");
  }
}

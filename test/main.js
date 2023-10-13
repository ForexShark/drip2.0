const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, network, upgrades } = require("hardhat");
const { Contract, provider } = ethers;

const snapshots = require("../results/snapshot.json");

async function impersonate(address) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}

const FOREX = "0x8dcfff204167e61fc414c8dc4d5ffcad7cc1b6c2";
const DRIPADDRESS = "0x20f663CEa80FaCE82ACDFA3aAE6862d246cE0333";
const VAULTADDRESS = "0xBFF8a1F9B5165B787a00659216D7313354D25472";
const FAUCETPROXY = "0xFFE811714ab35360b67eE195acE7C10D93f89D8C";
const FAUCETPROXYADMIN = "0x39812E5D1a73Cb9525EE282eD5200D8ba8782b4b";

const DRIP_ABI = require("../abi/DRIP.json");
const VAULT_ABI = require("../abi/VAULT.json");

const DRIP = new Contract(DRIPADDRESS, DRIP_ABI, provider);
const VAULT = new Contract(VAULTADDRESS, VAULT_ABI, provider);

describe("Faucet Killer Testing Suite", function () {
  async function upgradeFaucet() {
    const deployer = await impersonate(FOREX);

    // contract factories
    const FaucetV6Factory = await ethers.getContractFactory("FaucetV6", deployer);
    const FaucetBankFactory = await ethers.getContractFactory("FaucetBank", deployer);
    const FaucetProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin", deployer);

    // deploy new implementation
    const FaucetImplementation = await FaucetV6Factory.deploy();
    await FaucetImplementation.waitForDeployment();
    const FaucetImplementationAddress = await FaucetImplementation.getAddress();

    // upgrade to new implementation
    const proxyAdmin = FaucetProxyAdminFactory.attach(FAUCETPROXYADMIN);
    await proxyAdmin.upgrade(FAUCETPROXY, FaucetImplementationAddress);
    const Faucet = FaucetV6Factory.attach(FAUCETPROXY);

    // deploy new faucet bank
    const FaucetBank = await upgrades.deployProxy(FaucetBankFactory);
    await FaucetBank.waitForDeployment();
    const FaucetBankAddress = await FaucetBank.getAddress();

    // whitelist
    await DRIP.connect(deployer).addAddressToWhitelist(FaucetBankAddress); // to mint
    await DRIP.connect(deployer).excludeAccount(FaucetBankAddress); // don't tax drip sent from contract
    await VAULT.connect(deployer).addAddressToWhitelist(FaucetBankAddress); // to withdraw

    return { Faucet, FaucetBank };
  }
  it("Should Deploy New Faucet Implementation & Bank", async function () {
    const { Faucet, FaucetBank } = await loadFixture(upgradeFaucet);
    const FaucetAddress = await Faucet.getAddress();
    const FaucetBankAddress = await FaucetBank.getAddress();
    expect(FaucetAddress).to.be.properAddress;
    expect(FaucetBankAddress).to.be.properAddress;
  });
  it("Should Write Balance To Faucet Bank", async function () {
    const { FaucetBank } = await loadFixture(upgradeFaucet);
    const balanceWei = ethers.parseEther(snapshots[0].balance);
    // TODO we could use a merkle tree here to do the lookup / state transfer in batches?
    await FaucetBank.setBalance(snapshots[0].player, balanceWei);
    const balance = await FaucetBank.getBalance(snapshots[0].player);
    expect(balance).to.be.equal(balanceWei);
  });
  it.only("Tests Max Payout of Two Wallets", async function () {
    const { Faucet } = await loadFixture(upgradeFaucet);
    const wallets = [
      "0xeED3cda1BaC0D8C6a6ea11acb732c1b3E8601Cd1",
      "0xb9bd1c0770ef5d5a0db55cd1bf6716ee849b053e",
    ];

    for await (const wallet of wallets) {
      // player stats
      console.log(wallet);
      const payoutOf = await Faucet.payoutOf(wallet);
      const max = payoutOf[1];
      console.log("max: ", parseInt(ethers.formatEther(max)));
    }
  });
  it("Should Claim Balance", async function () {
    const { FaucetBank } = await loadFixture(upgradeFaucet);
    const balanceWei = ethers.parseEther(snapshots[0].balance);
    await FaucetBank.setBalance(snapshots[0].player, balanceWei);
    const player = await impersonate(snapshots[0].player);
    const dripBefore = await DRIP.balanceOf(player.address);
    await FaucetBank.connect(player).claim();
    const dripAfter = await DRIP.balanceOf(player.address);
    console.log("PLAYER RECEIVED: ", parseInt(ethers.formatEther(dripAfter - dripBefore)));
  });
});

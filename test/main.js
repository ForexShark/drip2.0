const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

async function impersonate(address) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}
const PLAYER = "0x434f439ff77ef17daf247f1f089c44b0318f26ba";
const FOREX = "0x8dcfff204167e61fc414c8dc4d5ffcad7cc1b6c2";
const FAUCETPROXY = "0xFFE811714ab35360b67eE195acE7C10D93f89D8C";
const FAUCETPROXYADMIN = "0x39812E5D1a73Cb9525EE282eD5200D8ba8782b4b";

describe("Faucet Killer Testing Suite", function () {
  async function deployFixture() {
    const deployer = await impersonate(FOREX);

    // contract factories
    const FaucetV6Factory = await ethers.getContractFactory("FaucetV6", deployer);
    const FaucetProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin", deployer);

    // deploy new implementation
    const FaucetImplementation = await FaucetV6Factory.deploy();
    await FaucetImplementation.waitForDeployment();
    const FaucetImplementationAddress = await FaucetImplementation.getAddress();

    // upgrade to new implementation
    const proxyAdmin = FaucetProxyAdminFactory.attach(FAUCETPROXYADMIN);
    await proxyAdmin.upgrade(FAUCETPROXY, FaucetImplementationAddress);
    const Faucet = FaucetV6Factory.attach(FAUCETPROXY);

    await Faucet.updateDepositMultiplier(100);
    console.log("FAUCET IMPLEMENTATION: ", FaucetImplementationAddress);

    return { Faucet };
  }
  it("Should Deploy New Faucet Implementation", async function () {
    const { Faucet } = await loadFixture(deployFixture);
    const FaucetAddress = await Faucet.getAddress();
    expect(FaucetAddress).to.be.properAddress;
  });
  it("Should Have Max Payout Equal To Deposit", async function () {
    const { Faucet } = await loadFixture(deployFixture);
    const depositAmount = ethers.parseEther("27398");
    const maxPayout = await Faucet.maxPayoutOf(depositAmount);
    expect(depositAmount).to.be.equal(maxPayout);
  });
  it("Tests Available Actions After Upgrade", async function () {
    const { Faucet } = await loadFixture(deployFixture);

    // const info = await Faucet.userInfo(PLAYER);
    // console.log("INFO: ", info);

    // upline
    // deposit time,
    // deposits,
    // claimed
    const player = "0xe4FD210236D8Ba17663997097B832e8e0D262ceE";
    const maxedPlayer = await impersonate(player);
    const info = await Faucet.userInfo(maxedPlayer.address);

    const available = await Faucet.claimsAvailable(maxedPlayer.address);
    console.log("available: ", ethers.formatEther(available));

    // await Faucet.updateMaxPayoutCap(ethers.parseEther("200000"))
    // const player = await impersonate(PLAYER);
    // const tx = await Faucet.connect(player).roll();
    // const rec = await tx.wait();

    // const depositAmount = ethers.parseEther("27398");
    // const maxPayout = await Faucet.maxPayoutOf(depositAmount);
    // expect(depositAmount).to.be.equal(maxPayout);
  });
});

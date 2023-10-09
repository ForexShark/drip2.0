const { ethers, network, upgrades } = require("hardhat");
const { Contract, provider } = ethers;
const fs = require("fs");

async function impersonate(address) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}

const DRIPADDRESS = "0x20f663CEa80FaCE82ACDFA3aAE6862d246cE0333";
const VAULTADDRESS = "0xBFF8a1F9B5165B787a00659216D7313354D25472";

const DRIP_ABI = require("../abi/DRIP.json");
const VAULT_ABI = require("../abi/VAULT.json");

const DRIP = new Contract(DRIPADDRESS, DRIP_ABI, provider);
const VAULT = new Contract(VAULTADDRESS, VAULT_ABI, provider);

const FOREX = "0x8dcfff204167e61fc414c8dc4d5ffcad7cc1b6c2";
const FAUCETPROXY = "0xFFE811714ab35360b67eE195acE7C10D93f89D8C";
const FAUCETPROXYADMIN = "0x39812E5D1a73Cb9525EE282eD5200D8ba8782b4b";

async function main() {
  let deployer;
  switch (network.name) {
    case "hardhat":
      deployer = await impersonate(FOREX);
      break;
    case "local":
      deployer = await impersonate(FOREX);
      break;
    case "mainnet":
      [deployer] = await ethers.getSigners();
      break;
  }

  console.log("DEPLOYER: ", deployer.address);

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

  // deploy faucet bank
  const FaucetBankProxy = await upgrades.deployProxy(FaucetBankFactory);
  await FaucetBankProxy.waitForDeployment();
  const FaucetBankProxyAddress = await FaucetBankProxy.getAddress();
  const FaucetBankProxyAdminAddress = await upgrades.erc1967.getAdminAddress(
    FaucetBankProxyAddress
  );
  const FaucetBankImplementationAddress = await upgrades.erc1967.getImplementationAddress(
    FaucetBankProxyAddress
  );

  // whitelist
  await DRIP.connect(deployer).addAddressToWhitelist(FaucetBankProxyAddress); // to mint
  await DRIP.connect(deployer).excludeAccount(FaucetBankProxyAddress); // don't tax drip sent from contract
  await VAULT.connect(deployer).addAddressToWhitelist(FaucetBankProxyAddress); // to withdraw

  console.log("FAUCET IMPLEMENTATION: ", FaucetImplementationAddress);
  console.log("FAUCET BANK IMPLEMENTATION: ", FaucetBankImplementationAddress);
  console.log("FAUCET BANK PROXY: ", FaucetBankProxyAddress);
  console.log("FAUCET BANK PROXY ADMIN: ", FaucetBankProxyAdminAddress);

  fs.writeFileSync(
    `results/deployment.json`,
    JSON.stringify({
      FaucetImplementation: FaucetImplementationAddress,
      FaucetBankProxy: FaucetBankProxyAddress,
      FaucetBankImplementation: FaucetBankImplementationAddress,
      FaucetBankProxyAdmin: FaucetBankProxyAdminAddress,
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

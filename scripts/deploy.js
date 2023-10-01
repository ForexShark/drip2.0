const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");

async function impersonate(address) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}

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

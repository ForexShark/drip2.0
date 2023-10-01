const { ethers } = require("hardhat");
const deployments = require("../results/deployment.json");
const snapshots = require("../results/snapshot.json");

async function impersonate(address) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}

const FOREX = "0x8dcfff204167e61fc414c8dc4d5ffcad7cc1b6c2";

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

  const FaucetBankFactory = await ethers.getContractFactory("FaucetBank", deployer);
  const FaucetBank = FaucetBankFactory.attach(deployments.FaucetBankProxy);

  let i = 1;
  for await (const snapshot of snapshots) {
    console.log(`player ${i}: ${snapshot.player}, balance: ${snapshot.balance}`);
    await FaucetBank.setBalance(snapshot.player, ethers.parseEther(snapshot.balance));
    i++;

    // if (i == 100) break;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const fs = require('fs');
const path = require('path');
// const { ethers } = require("hardhat");
const hre = require("hardhat");
const { ethers, upgrades, network } = hre;
const deployments = require("../results/deployment.json");
// const snapshots = require("../results/snapshot.json");

async function impersonate(address) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  const signer = await hre.ethers.getSigner(address);
  return signer;
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
  // console.log(FaucetBank)

  // let i = 1;
  // for await (const snapshot of snapshots) {
  //   console.log(`player ${i}: ${snapshot.player}, balance: ${snapshot.balance}`);
  //   await FaucetBank.setBalance(snapshot.player, ethers.parseEther(snapshot.balance));
  //   i++;

  //   // if (i == 100) break;
  // }


  const batchDirectory = 'batch'; // Adjust the folder name as needed

  // Read all JSON files in the "batch" folder
  const batchFiles = fs.readdirSync(batchDirectory);


  // Iterate through each batch file
  for (const batchFile of batchFiles) {
    const users = [];
    const newBalances = [];
    const filePath = path.join(batchDirectory, batchFile);
    console.log(filePath)

    // Read the JSON data from the batch file
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const batchData = JSON.parse(jsonData);

    // Iterate through each snapshot in the batch
    for (const snapshot of batchData) {
      // console.log(`Player: ${snapshot.player}, Balance: ${snapshot.balance}`);

      // Add the user and balance to the respective arrays
      users.push(snapshot.player);
      newBalances.push(ethers.parseEther(snapshot.balance));
    }

    console.log(`Processed batch file: ${filePath}`);
    console.log(`Number of users in array: ${users.length}`);

      // Call the setBalances function in your contract with the arrays
    // console.log(users, newBalances);
    const tx = await FaucetBank.setBalances(users, newBalances, {
      gasLimit: 30000000 // Replace with your desired gas limit
    });
    
    const receipt = await tx.wait();

    console.log('Transaction Receipt:', receipt);
    fs.unlinkSync(filePath);
  }
  

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

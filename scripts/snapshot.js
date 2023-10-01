const { ethers } = require("hardhat");
const players = require("../results/players.json");
const fs = require("fs");

const FAUCETPROXY = "0xFFE811714ab35360b67eE195acE7C10D93f89D8C";
const THRESHOLD = 10; // drip

async function main() {
  const FaucetV6Factory = await ethers.getContractFactory("FaucetV6");
  const Faucet = FaucetV6Factory.attach(FAUCETPROXY);

  let i = 1;
  let results = [];
  for await (const player of players) {
    // player stats
    const userInfo = await Faucet.users(player.ADDRESS);
    const deposits = userInfo[5];
    const claimed = userInfo[7];
    const rolls = userInfo[8];
    const available = await Faucet.claimsAvailable(player.ADDRESS);
    const maxPayout = deposits + rolls;

    let owed = 0;
    const leftToClaim = maxPayout - claimed;

    if (leftToClaim > 0 && available > leftToClaim) {
      owed = available - leftToClaim;
    } else if (leftToClaim <= 0 && available > 0) {
      owed = available;
    }

    if (parseInt(ethers.formatEther(owed)) > THRESHOLD) {
      console.log(`player ${i}, ${player.ADDRESS} owed ${parseInt(ethers.formatEther(owed))} Drip`);
      results.push({ player: player.ADDRESS, balance: ethers.formatEther(owed) });
    }
    i++;

    // if (i == 1000) break;
  }

  const output = JSON.stringify(results);
  fs.writeFileSync(`results/snapshot.json`, output);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

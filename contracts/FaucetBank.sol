// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "hardhat/console.sol";

interface IVault {
    function withdraw(uint256 tokenAmount) external;
}

interface IERC20UpgradeableMintable is IERC20Upgradeable {
    function mint(
        address beneficiary,
        uint256 tokenAmount
    ) external returns (uint256);
}

contract FaucetBank is OwnableUpgradeable {
    IVault private constant VAULT =
        IVault(0xBFF8a1F9B5165B787a00659216D7313354D25472);

    IERC20UpgradeableMintable private constant DRIP =
        IERC20UpgradeableMintable(0x20f663CEa80FaCE82ACDFA3aAE6862d246cE0333);

    mapping(address => uint256) public balances;

    function initialize() external initializer {
        __Ownable_init();
    }

    function setBalance(address _user, uint256 _balance) external onlyOwner {
        balances[_user] = _balance;
    }

    function getBalance(address _user) public view returns (uint256 balance) {
        balance = balances[_user];
    }

    // TODO make non-reentrant?
    function claim() external {
        uint256 balance = balances[msg.sender];
        console.log("BALANCE OWED: ", balance / 1 ether);
        require(balance > 0, "User Has No Claimable Balance");
        uint256 vaultBalance = DRIP.balanceOf(address(VAULT));
        console.log("VAULT BALANCE: ", vaultBalance / 1 ether);
        if (vaultBalance < balance) {
            uint256 differenceToMint = balance - vaultBalance;
            console.log("MINTING DRIP: ", differenceToMint / 1 ether);
            DRIP.mint(address(VAULT), differenceToMint);
        }

        VAULT.withdraw(balance); //  "claim" tax being taken here via typ. transfer tax
        console.log(
            "BANK DRIP BALANCE: ",
            DRIP.balanceOf(address(this)) / 1 ether
        );
        uint256 dripToSend = ((balance * 90) / 100);
        require(DRIP.transfer(address(msg.sender), dripToSend));
        balances[msg.sender] = 0;
    }
}

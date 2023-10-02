// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

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

// TODO have people be able to lock up liquidity
// TODO time period to determine the weighting
// TODO emmision rate is set

// 90% of the drip that goes to tax vault burns
// 10% adds to vault, which goes toward LP payout

contract DripLP is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IVault private constant VAULT =
        IVault(0xBFF8a1F9B5165B787a00659216D7313354D25472);

    IERC20UpgradeableMintable private constant DRIP =
        IERC20UpgradeableMintable(0x20f663CEa80FaCE82ACDFA3aAE6862d246cE0333);

    function initialize() external initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
    }
}

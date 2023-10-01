// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IToken {
    function calculateTransferTaxes(
        address _from,
        uint256 _value
    ) external view returns (uint256 adjustedValue, uint256 taxAmount);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function balanceOf(address who) external view returns (uint256);

    function mintedSupply() external returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);
}

interface ITokenMint {
    function mint(
        address beneficiary,
        uint256 tokenAmount
    ) external returns (uint256);
}

interface IDripVault {
    function withdraw(uint256 tokenAmount) external;
}

contract FaucetBank is OwnableUpgradeable {
    using SafeMath for uint256;

    IToken private dripToken;
    ITokenMint private tokenMint;
    IDripVault private dripVault;

    address public constant dripVaultAddress =
        0xBFF8a1F9B5165B787a00659216D7313354D25472;

    mapping(address => uint256) public balances;

    function initialize() external initializer {
        __Ownable_init();
    }

    function setBalance(address _user, uint256 _balance) public onlyOwner {
        balances[_user] = _balance;
    }

    // TODO make non-reentrant
    // TODO whitelist to mint and whitelist to take from the tax wallet
    function claim() public {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "User Has No Claimable Balance");
        uint256 vaultBalance = dripToken.balanceOf(dripVaultAddress);

        if (vaultBalance < balance) {
            uint256 differenceToMint = balance.sub(vaultBalance);
            tokenMint.mint(dripVaultAddress, differenceToMint);
        }

        dripVault.withdraw(balance);
        uint256 realizedPayout = balance.mul(90).div(100); // 10% tax on withdraw
        require(dripToken.transfer(address(msg.sender), realizedPayout));
        balances[msg.sender] = 0;
    }
}

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
    /**
     * @dev Multiplies two numbers, throws on overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
        if (a == 0) {
            return 0;
        }
        c = a * b;
        assert(c / a == b);
        return c;
    }

    /**
     * @dev Integer division of two numbers, truncating the quotient.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        // uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return a / b;
    }

    /**
     * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    /* @dev Subtracts two numbers, else returns zero */
    function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b > a) {
            return 0;
        } else {
            return a - b;
        }
    }

    /**
     * @dev Adds two numbers, throws on overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a + b;
        assert(c >= a);
        return c;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

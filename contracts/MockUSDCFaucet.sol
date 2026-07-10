// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  MockUSDCFaucet
//
//  Extends MockUSDC with a rate-limited public faucet so that
//  any user can get test USDC without contacting the deployer.
//
//  Rules:
//  - FAUCET_AMOUNT = 10,000 USDC per drip
//  - COOLDOWN = 24 hours between drips per address
//  - Owner can drip unlimited amounts (for operators / testing)
//  - Owner can update faucet amount and cooldown
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDCFaucet is ERC20, Ownable {

    uint256 public faucetAmount = 10_000 * 10**18;  // 10,000 USDC
    uint256 public cooldown     = 24 hours;

    mapping(address => uint256) public lastDrip;

    event Drip(address indexed to, uint256 amount);
    event FaucetConfigUpdated(uint256 amount, uint256 cooldown);

    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        // Mint 10M to deployer for seeding pools
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    /*//////////////////////////////////////////////////////////////
                        PUBLIC FAUCET
    //////////////////////////////////////////////////////////////*/

    /// @notice Anyone can call this once per cooldown period
    function drip() external {
        require(
            block.timestamp >= lastDrip[msg.sender] + cooldown,
            unicode"Cooldown active — try again in 24h"
        );

        lastDrip[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);

        emit Drip(msg.sender, faucetAmount);
    }

    /// @notice Check seconds until next drip for an address
    function timeUntilNextDrip(address user) external view returns (uint256) {
        uint256 next = lastDrip[user] + cooldown;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                        OWNER MINT (unlimited)
    //////////////////////////////////////////////////////////////*/

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function batchMint(address[] calldata recipients, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amount);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN CONFIG
    //////////////////////////////////////////////////////////////*/

    function setFaucetConfig(uint256 _amount, uint256 _cooldown) external onlyOwner {
        faucetAmount = _amount;
        cooldown     = _cooldown;
        emit FaucetConfigUpdated(_amount, _cooldown);
    }
}

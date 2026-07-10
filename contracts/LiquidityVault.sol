// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LiquidityVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;
    address public liquidityManager;

    event LiquidityManagerSet(address indexed liquidityManager);
    event Deposited(address indexed from, uint256 amount);
    event FundsRequested(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyLiquidityManager() {
        require(msg.sender == liquidityManager, "!manager");
        _;
    }

    constructor(address _stablecoin) Ownable(msg.sender) {
        require(_stablecoin != address(0), "!stablecoin");
        stablecoin = IERC20(_stablecoin);
    }

    function setLiquidityManager(address _liquidityManager) external onlyOwner {
        liquidityManager = _liquidityManager;
        emit LiquidityManagerSet(_liquidityManager);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "!amount");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function depositFrom(address from, uint256 amount) external {
        require(from != address(0) && amount > 0, "!amount");
        stablecoin.safeTransferFrom(from, address(this), amount);
        emit Deposited(from, amount);
    }

    function requestFunds(uint256 amount) external onlyLiquidityManager {
        require(amount > 0, "!amount");
        stablecoin.safeTransfer(msg.sender, amount);
        emit FundsRequested(msg.sender, amount);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "!to");
        require(amount > 0, "!amount");
        stablecoin.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    function balance() external view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }
}

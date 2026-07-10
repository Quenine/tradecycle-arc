// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IProductionCycleOperatorReader {
    function operator() external view returns (address);
}

/// @title  CollateralVault
/// @notice Holds operator collateral.
///         On success: trusted cycle or protocol owner can release collateral to the operator.
///         On default: trusted cycle or protocol owner can slash collateral into the cycle
///                     so investors can recover from the remaining on-chain balance.
contract CollateralVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;
    address public factory;

    mapping(address => uint256) public collateralBalance;
    mapping(address => bool) public trustedCycles;

    event FactorySet(address indexed factory);
    event TrustedCycleUpdated(address indexed cycle, bool allowed);
    event CollateralDeposited(address indexed operator, uint256 amount);
    event CollateralSlashed(address indexed operator, uint256 amount, address indexed recipient);
    event CollateralWithdrawn(address indexed operator, uint256 amount);

    constructor(address _stablecoin) Ownable(msg.sender) {
        require(_stablecoin != address(0), "Invalid stablecoin");
        stablecoin = IERC20(_stablecoin);
    }

    function setFactory(address _factory) external onlyOwner {
        require(_factory != address(0), "Invalid factory");
        factory = _factory;
        emit FactorySet(_factory);
    }

    function registerTrustedCycle(address cycle, bool allowed) external {
        require(msg.sender == owner() || msg.sender == factory, "Not authorized");
        require(cycle != address(0), "Invalid cycle");
        trustedCycles[cycle] = allowed;
        emit TrustedCycleUpdated(cycle, allowed);
    }

    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Zero amount");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        collateralBalance[msg.sender] += amount;
        emit CollateralDeposited(msg.sender, amount);
    }

    function slashCollateral(address operator, uint256 amount) external onlyOwner {
        require(collateralBalance[operator] >= amount, "Insufficient collateral");
        collateralBalance[operator] -= amount;
        stablecoin.safeTransfer(owner(), amount);
        emit CollateralSlashed(operator, amount, owner());
    }

    function slashToRecipient(address operator, uint256 amount, address recipient) external {
        require(collateralBalance[operator] >= amount, "Insufficient collateral");
        require(recipient != address(0), "Invalid recipient");

        if (msg.sender != owner()) {
            require(trustedCycles[msg.sender], "Not trusted cycle");
            require(recipient == msg.sender, "Recipient must be cycle");
            require(IProductionCycleOperatorReader(msg.sender).operator() == operator, "Operator mismatch");
        }

        collateralBalance[operator] -= amount;
        stablecoin.safeTransfer(recipient, amount);
        emit CollateralSlashed(operator, amount, recipient);
    }

    function withdrawCollateral(uint256 amount) external {
        require(collateralBalance[msg.sender] >= amount, "Insufficient");
        collateralBalance[msg.sender] -= amount;
        stablecoin.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function releaseCollateral(address operator, uint256 amount) external {
        require(collateralBalance[operator] >= amount, "Insufficient collateral");

        if (msg.sender != owner()) {
            require(trustedCycles[msg.sender], "Not trusted cycle");
            require(IProductionCycleOperatorReader(msg.sender).operator() == operator, "Operator mismatch");
        }

        collateralBalance[operator] -= amount;
        stablecoin.safeTransfer(operator, amount);
        emit CollateralWithdrawn(operator, amount);
    }
}

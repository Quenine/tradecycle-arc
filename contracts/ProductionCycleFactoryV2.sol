// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProductionCycle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ICollateralVault2 {
    function collateralBalance(address operator) external view returns (uint256);
    function registerTrustedCycle(address cycle, bool allowed) external;
}

interface ILiquidityManagerFactory {
    function registerCycle(address cycle, uint256 capitalRequired) external;
}

interface ILiquidityVaultDepositor {
    function depositFrom(address from, uint256 amount) external;
}

contract ProductionCycleFactoryV2 is Ownable {
    enum ApprovalMode      { MANUAL, OPEN, COLLATERAL_GATE }
    enum ApplicationStatus { NONE, PENDING, APPROVED, REJECTED }

    uint8 public constant DEFAULT_RESERVE_PERCENT = 1;
    uint8 public constant DEFAULT_PROTOCOL_FEE_PERCENT = 1;

    error ZeroAddress();
    error AlreadyPending();
    error AlreadyApproved();
    error NotApproved();
    error InvalidCapital();
    error InvalidDuration();
    error InvalidRevenue();
    error FeesTooHigh();
    error MissingLiquidityVault();

    struct OperatorApplication {
        address applicant;
        string name;
        string businessType;
        string location;
        string description;
        uint256 appliedAt;
        ApplicationStatus status;
    }

    address public immutable stablecoin;
    address public immutable verifierRegistry;
    address public immutable collateralVault;
    address public immutable reservePool;
    address public immutable treasury;
    address public immutable liquidityVault;
    address public immutable liquidityManager;

    ApprovalMode public approvalMode;
    uint256 public minCollateralForAutoApproval;

    mapping(address => bool) public approvedOperators;
    mapping(address => OperatorApplication) public applications;
    address[] public applicants;
    address[] public allCycles;

    event OperatorApplied(address indexed operator, string name);
    event OperatorApproved(address indexed operator);
    event OperatorRejected(address indexed operator);
    event ApprovalModeChanged(ApprovalMode mode);
    event CycleCreated(address indexed operator, address indexed cycle, string name);

    constructor(
        address _stablecoin,
        address _verifierRegistry,
        address _collateralVault,
        address _reservePool,
        address _treasury,
        address _liquidityVault,
        address _liquidityManager
    ) Ownable(msg.sender) {
        if (
            _stablecoin == address(0) ||
            _verifierRegistry == address(0) ||
            _collateralVault == address(0) ||
            _reservePool == address(0) ||
            _treasury == address(0)
        ) revert ZeroAddress();
        stablecoin = _stablecoin;
        verifierRegistry = _verifierRegistry;
        collateralVault = _collateralVault;
        reservePool = _reservePool;
        treasury = _treasury;
        liquidityVault = _liquidityVault;
        liquidityManager = _liquidityManager;
        approvalMode = ApprovalMode.MANUAL;
        minCollateralForAutoApproval = 0;
    }

    function applyAsOperator(
        string calldata name,
        string calldata businessType,
        string calldata location,
        string calldata description
    ) external {
        if (applications[msg.sender].status == ApplicationStatus.PENDING) revert AlreadyPending();
        if (approvedOperators[msg.sender]) revert AlreadyApproved();

        applications[msg.sender] = OperatorApplication({
            applicant: msg.sender,
            name: name,
            businessType: businessType,
            location: location,
            description: description,
            appliedAt: block.timestamp,
            status: ApplicationStatus.PENDING
        });

        applicants.push(msg.sender);
        emit OperatorApplied(msg.sender, name);

        if (approvalMode == ApprovalMode.OPEN) {
            _approve(msg.sender);
            return;
        }

        if (approvalMode == ApprovalMode.COLLATERAL_GATE) {
            if (ICollateralVault2(collateralVault).collateralBalance(msg.sender) >= minCollateralForAutoApproval) {
                _approve(msg.sender);
            }
        }
    }

    function approveOperator(address operator) external onlyOwner { _approve(operator); }

    function rejectOperator(address operator) external onlyOwner {
        applications[operator].status = ApplicationStatus.REJECTED;
        emit OperatorRejected(operator);
    }

    function setApprovalMode(ApprovalMode mode, uint256 minCollateral) external onlyOwner {
        approvalMode = mode;
        if (mode == ApprovalMode.COLLATERAL_GATE) minCollateralForAutoApproval = minCollateral;
        emit ApprovalModeChanged(mode);
    }

    function _approve(address operator) internal {
        approvedOperators[operator] = true;
        applications[operator].status = ApplicationStatus.APPROVED;
        emit OperatorApproved(operator);
    }

    function createCycle(
        uint256 capitalRequired,
        uint256 collateralAmount,
        uint256 expectedRevenue,
        uint256 duration,
        uint8 reservePercent,
        uint8 protocolFeePercent,
        uint256 operatorLiquidityContribution,
        string calldata cycleName,
        string calldata cycleSymbol,
        string calldata category,
        string calldata location,
        string calldata description
    ) external returns (address) {
        if (!approvedOperators[msg.sender]) revert NotApproved();
        if (capitalRequired == 0) revert InvalidCapital();
        if (duration == 0) revert InvalidDuration();
        if (expectedRevenue <= capitalRequired) revert InvalidRevenue();
        if (
            reservePercent != DEFAULT_RESERVE_PERCENT ||
            protocolFeePercent != DEFAULT_PROTOCOL_FEE_PERCENT
        ) revert FeesTooHigh();
        if (operatorLiquidityContribution > 0 && liquidityVault == address(0)) revert MissingLiquidityVault();

        ProductionCycle cycle = new ProductionCycle(
            msg.sender,
            stablecoin,
            capitalRequired,
            collateralAmount,
            expectedRevenue,
            duration,
            reservePercent,
            protocolFeePercent,
            reservePool,
            treasury,
            verifierRegistry,
            collateralVault,
            liquidityManager,
            cycleName,
            cycleSymbol,
            category,
            location,
            description
        );

        address cycleAddr = address(cycle);
        allCycles.push(cycleAddr);

        try ICollateralVault2(collateralVault).registerTrustedCycle(cycleAddr, true) {} catch {}
        if (operatorLiquidityContribution > 0) {
            try ILiquidityVaultDepositor(liquidityVault).depositFrom(msg.sender, operatorLiquidityContribution) {} catch {}
        }
        if (liquidityManager != address(0)) {
            try ILiquidityManagerFactory(liquidityManager).registerCycle(cycleAddr, capitalRequired) {} catch {}
        }

        emit CycleCreated(msg.sender, cycleAddr, cycleName);
        return cycleAddr;
    }

    function getAllCycles() external view returns (address[] memory) { return allCycles; }
    function totalApplicants() external view returns (uint256) { return applicants.length; }
}

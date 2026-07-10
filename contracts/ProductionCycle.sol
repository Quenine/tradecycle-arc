// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CycleShareToken.sol";

interface IVerifierRegistry {
    function quorumReached(address cycle, uint8 milestoneId) external view returns (bool);
    function receiveVerifierReward(address cycle, uint256 totalAmount) external;
}

interface ICollateralVault {
    function slashCollateral(address operator, uint256 amount) external;
    function slashToRecipient(address operator, uint256 amount, address recipient) external;
    function releaseCollateral(address operator, uint256 amount) external;
    function collateralBalance(address operator) external view returns (uint256);
}

interface ILiquidityManager {
    function onFundingComplete(address cycle) external;
}

contract ProductionCycle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error Unauthorized();
    error InvalidState();
    error InvalidParams();
    error InvalidEvidence();
    error MissingEvidence();
    error MissingQuorum();
    error InvalidRepay();
    error InsufficientBalance();
    error NoSupply();
    error NoBalance();
    error NotExpired();
    error NoRecovery();

    enum State { FUNDING, ACTIVE, HARVEST_SUBMITTED, DISTRIBUTED, DEFAULTED }
    State public state;

    address  public immutable operator;
    IERC20   public immutable stablecoin;
    uint256  public immutable capitalRequired;
    uint256  public immutable collateralAmount;
    uint256  public immutable expectedRevenue;
    uint256  public immutable duration;
    uint256  public immutable startTime;
    uint8    public immutable reservePercent;
    uint8    public immutable protocolFeePercent;
    address  public immutable reservePool;
    address  public immutable treasury;
    address  public immutable verifierRegistry;
    address  public immutable collateralVault;
    address  public immutable liquidityManager;
    uint16   public constant  VERIFIER_REWARD_BPS = 50; // 0.5%

    string public cycleName;
    string public cycleSymbol;
    string public category;
    string public location;
    string public description;

    CycleShareToken public cycleToken;
    uint256 public totalRaised;
    uint256 public profitPerToken; // x1e18; payout = shares + shares*ppt/1e18

    // Evidence: operator submits keccak256(cid). Full CID emitted in event for UI.
    mapping(uint8 => bytes32) public milestoneEvidenceHash;
    mapping(uint8 => string)  public evidenceCID;
    mapping(uint8 => uint256) public evidenceTimestamp;
    mapping(uint8 => bool)    public milestoneReleased;
    uint8 public constant MILESTONE_COUNT = 4;

    event Invest(address indexed investor, uint256 amount);
    event EvidenceSubmitted(uint8 indexed milestoneId, string cid, bytes32 hash);
    event MilestoneReleased(uint8 milestone, uint256 amount);
    event HarvestSubmitted();
    event Repaid(address indexed operator, uint256 amount);
    event Distributed(uint256 total, uint256 ppt, uint256 verifierReward);
    event CollateralRefunded(address indexed op, uint256 amount);
    event Withdraw(address indexed investor, uint256 payout);
    event DefaultTriggered(uint256 recoverable);
    event DefaultRecovery(address indexed investor, uint256 amount);
    event ReserveCompensationApplied(uint256 amount, uint256 profitPerTokenAdded);

    modifier onlyOp()      { if (msg.sender != operator) revert Unauthorized(); _; }
    modifier only(State s) { if (state != s) revert InvalidState(); _; }

    constructor(
        address _operator, address _stablecoin,
        uint256 _capitalRequired, uint256 _collateralAmount, uint256 _expectedRevenue,
        uint256 _duration, uint8 _reservePercent, uint8 _protocolFeePercent,
        address _reservePool, address _treasury, address _verifierRegistry, address _collateralVault, address _liquidityManager,
        string memory _cycleName, string memory _cycleSymbol,
        string memory _category, string memory _location, string memory _description
    ) {
        if (_operator == address(0) || _stablecoin == address(0)) revert InvalidParams();
        if (_capitalRequired == 0 || _duration == 0) revert InvalidParams();
        if (_expectedRevenue <= _capitalRequired) revert InvalidParams();
        if (uint16(_reservePercent) + _protocolFeePercent > 19) revert InvalidParams();

        operator = _operator;
        stablecoin = IERC20(_stablecoin);
        capitalRequired = _capitalRequired;
        collateralAmount = _collateralAmount;
        expectedRevenue = _expectedRevenue;
        duration = _duration;
        reservePercent = _reservePercent;
        protocolFeePercent = _protocolFeePercent;
        reservePool = _reservePool;
        treasury = _treasury;
        verifierRegistry = _verifierRegistry;
        collateralVault = _collateralVault;
        liquidityManager = _liquidityManager;
        cycleName = _cycleName;
        cycleSymbol = _cycleSymbol;
        category = _category;
        location = _location;
        description = _description;
        startTime = block.timestamp;
        state = State.FUNDING;
        cycleToken = new CycleShareToken(_cycleName, _cycleSymbol, address(this), IERC20Metadata(_stablecoin).decimals());
    }

    function invest(uint256 amount) external nonReentrant only(State.FUNDING) {
        if (amount == 0 || totalRaised + amount > capitalRequired) revert InvalidParams();
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        cycleToken.mint(msg.sender, amount);
        totalRaised += amount;
        emit Invest(msg.sender, amount);
        if (totalRaised == capitalRequired) {
            state = State.ACTIVE;
            if (liquidityManager != address(0)) {
                try ILiquidityManager(liquidityManager).onFundingComplete(address(this)) {} catch {}
            }
        }
    }

    function submitMilestoneEvidence(uint8 id, string calldata cid) external onlyOp only(State.ACTIVE) {
        if (id >= MILESTONE_COUNT || milestoneReleased[id] || bytes(cid).length == 0) revert InvalidEvidence();
        milestoneEvidenceHash[id] = keccak256(abi.encodePacked(cid));
        evidenceCID[id] = cid;
        evidenceTimestamp[id] = block.timestamp;
        emit EvidenceSubmitted(id, cid, milestoneEvidenceHash[id]);
    }

    function submitHarvestEvidence(string calldata cid) external onlyOp only(State.ACTIVE) {
        if (bytes(cid).length == 0) revert InvalidEvidence();
        milestoneEvidenceHash[99] = keccak256(abi.encodePacked(cid));
        evidenceCID[99] = cid;
        evidenceTimestamp[99] = block.timestamp;
        emit EvidenceSubmitted(99, cid, milestoneEvidenceHash[99]);
    }

    function releaseMilestone(uint8 id) external onlyOp only(State.ACTIVE) {
        if (id >= MILESTONE_COUNT || milestoneReleased[id]) revert InvalidParams();
        if (milestoneEvidenceHash[id] == bytes32(0)) revert MissingEvidence();
        if (!IVerifierRegistry(verifierRegistry).quorumReached(address(this), id)) revert MissingQuorum();

        milestoneReleased[id] = true;
        uint256 amt = id == 0
            ? capitalRequired * 40 / 100
            : id == 1
                ? capitalRequired * 30 / 100
                : id == 2
                    ? capitalRequired * 20 / 100
                    : capitalRequired * 10 / 100;

        stablecoin.safeTransfer(operator, amt);
        emit MilestoneReleased(id, amt);
    }

    function submitHarvest() external only(State.ACTIVE) {
        if (
            !milestoneReleased[0] ||
            !milestoneReleased[1] ||
            !milestoneReleased[2] ||
            !milestoneReleased[3]
        ) revert InvalidState();
        if (milestoneEvidenceHash[99] == bytes32(0)) revert MissingEvidence();
        if (!IVerifierRegistry(verifierRegistry).quorumReached(address(this), 99)) revert MissingQuorum();
        state = State.HARVEST_SUBMITTED;
        emit HarvestSubmitted();
    }

    function _finalizeDistribution() internal {
        uint256 bal = stablecoin.balanceOf(address(this));
        if (bal < capitalRequired) revert InsufficientBalance();

        uint256 profit = bal - capitalRequired;
        uint256 rCut = profit * reservePercent / 100;
        uint256 pCut = profit * protocolFeePercent / 100;
        uint256 vCut = profit * VERIFIER_REWARD_BPS / 10000;
        uint256 invP = profit - rCut - pCut - vCut;

        if (rCut > 0) stablecoin.safeTransfer(reservePool, rCut);
        if (pCut > 0) stablecoin.safeTransfer(treasury, pCut);
        if (vCut > 0) {
            stablecoin.safeTransfer(verifierRegistry, vCut);
            try IVerifierRegistry(verifierRegistry).receiveVerifierReward(address(this), vCut) {} catch {}
        }

        uint256 supply = cycleToken.totalSupply();
        if (supply == 0) revert NoSupply();

        profitPerToken = invP * 1e18 / supply;
        state = State.DISTRIBUTED;

        uint256 col = ICollateralVault(collateralVault).collateralBalance(operator);
        if (col > 0) {
            try ICollateralVault(collateralVault).releaseCollateral(operator, col) {
                emit CollateralRefunded(operator, col);
            } catch {}
        }

        emit Distributed(bal, profitPerToken, vCut);
    }

    function repayAndDistribute(uint256 amount) external nonReentrant onlyOp only(State.HARVEST_SUBMITTED) {
        if (amount != expectedRevenue) revert InvalidRepay();
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        emit Repaid(msg.sender, amount);
        _finalizeDistribution();
    }

    function distribute() external nonReentrant only(State.HARVEST_SUBMITTED) {
        _finalizeDistribution();
    }

    function withdraw() external nonReentrant only(State.DISTRIBUTED) {
        uint256 shares = cycleToken.balanceOf(msg.sender);
        if (shares == 0) revert NoBalance();
        cycleToken.burn(msg.sender, shares);
        uint256 payout = shares + shares * profitPerToken / 1e18;
        stablecoin.safeTransfer(msg.sender, payout);
        emit Withdraw(msg.sender, payout);
    }

    function triggerDefault() external nonReentrant only(State.ACTIVE) {
        if (block.timestamp <= startTime + duration) revert NotExpired();

        uint256 col = ICollateralVault(collateralVault).collateralBalance(operator);
        if (col > 0) {
            try ICollateralVault(collateralVault).slashToRecipient(operator, col, address(this)) {} catch {}
        }

        uint256 remaining = stablecoin.balanceOf(address(this));
        emit DefaultTriggered(remaining);

        uint256 supply = cycleToken.totalSupply();
        if (supply > 0 && remaining > 0) {
            profitPerToken = remaining * 1e18 / supply;
        }
        state = State.DEFAULTED;
    }

    function onReserveCompensation(uint256 amount) external nonReentrant {
        if (msg.sender != reservePool) revert Unauthorized();
        if (state != State.ACTIVE && state != State.DEFAULTED) revert InvalidState();
        uint256 addedPerToken;
        if (state == State.DEFAULTED) {
            uint256 supply = cycleToken.totalSupply();
            if (supply == 0) revert NoSupply();
            addedPerToken = amount * 1e18 / supply;
            profitPerToken += addedPerToken;
        }
        emit ReserveCompensationApplied(amount, addedPerToken);
    }

    function withdrawAfterDefault() external nonReentrant only(State.DEFAULTED) {
        uint256 shares = cycleToken.balanceOf(msg.sender);
        if (shares == 0 || profitPerToken == 0) revert NoRecovery();
        cycleToken.burn(msg.sender, shares);
        uint256 rec = shares * profitPerToken / 1e18;
        if (rec > 0) {
            stablecoin.safeTransfer(msg.sender, rec);
            emit DefaultRecovery(msg.sender, rec);
        }
    }

    function evidenceSubmitted(uint8 id) external view returns (bool) {
        return milestoneEvidenceHash[id] != bytes32(0);
    }

    function grossROIBps() external view returns (uint256) {
        if (capitalRequired == 0 || expectedRevenue <= capitalRequired) return 0;
        return (expectedRevenue - capitalRequired) * 10000 / capitalRequired;
    }

    function secondsUntilDefault() external view returns (uint256) {
        uint256 e = startTime + duration;
        return block.timestamp >= e ? 0 : e - block.timestamp;
    }
}

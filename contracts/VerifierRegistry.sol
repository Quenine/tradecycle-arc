// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICycleFactoryReader {
    function getAllCycles() external view returns (address[] memory);
}

interface ICycleStateReader {
    function state() external view returns (uint8);
}

contract VerifierRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20  public immutable stablecoin;
    uint256 public minimumStake;
    uint256 public quorum = 2;
    address public factory;
    uint256 public totalStaked;
    uint256 public totalPendingRewards;

    struct Verifier {
        bool    active;
        uint256 stake;
        uint256 pendingReward;
        uint256 totalEarned;
        uint256 approvalsGiven;
    }
    mapping(address => Verifier) public verifiers;
    address[] public verifierList;

    mapping(address => mapping(uint8 => mapping(address => bool))) public approvals;
    mapping(address => mapping(uint8 => uint256))                  public approvalCount;

    event VerifierRegistered(address indexed v, uint256 stake);
    event VerifierUnstaked(address indexed v, uint256 amount);
    event StakeSlashed(address indexed v, uint256 amount);
    event MilestoneApproved(address indexed cycle, uint8 milestone, address indexed v);
    event RewardReceived(uint256 total, uint256 perVerifier, uint256 count);
    event RewardClaimed(address indexed v, uint256 amount);
    event FactoryUpdated(address indexed factory);

    constructor(address _stablecoin, uint256 _minimumStake) Ownable(msg.sender) {
        stablecoin   = IERC20(_stablecoin);
        minimumStake = _minimumStake;
    }

    function registerVerifier(uint256 amount) external nonReentrant {
        require(amount >= minimumStake, "!stake");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        Verifier storage v = verifiers[msg.sender];
        if (!v.active) { verifierList.push(msg.sender); v.active = true; }
        v.stake += amount;
        totalStaked += amount;
        emit VerifierRegistered(msg.sender, amount);
    }

    function unstake() external nonReentrant {
        Verifier storage v = verifiers[msg.sender];
        require(v.active && v.stake > 0, "!verifier");
        require(canUnstake(msg.sender), "!active-cycle");
        uint256 total = v.stake + v.pendingReward;
        if (v.pendingReward > 0) emit RewardClaimed(msg.sender, v.pendingReward);
        totalStaked -= v.stake;
        totalPendingRewards -= v.pendingReward;
        v.stake = 0; v.pendingReward = 0; v.active = false;
        stablecoin.safeTransfer(msg.sender, total);
        emit VerifierUnstaked(msg.sender, total);
    }

    function claimRewards() external nonReentrant {
        Verifier storage v = verifiers[msg.sender];
        require(v.pendingReward > 0, "!reward");
        uint256 r = v.pendingReward; v.pendingReward = 0;
        totalPendingRewards -= r;
        stablecoin.safeTransfer(msg.sender, r);
        emit RewardClaimed(msg.sender, r);
    }

    function approveMilestone(address cycle, uint8 milestoneId) external {
        Verifier storage v = verifiers[msg.sender];
        require(v.active, "!verifier");
        require(ICycleStateReader(cycle).state() == 1, "!cycle");
        require(!approvals[cycle][milestoneId][msg.sender], "dup");
        approvals[cycle][milestoneId][msg.sender] = true;
        approvalCount[cycle][milestoneId]++;
        v.approvalsGiven++;
        emit MilestoneApproved(cycle, milestoneId, msg.sender);
    }

    /// Called by ProductionCycle.distribute() — USDC already transferred here.
    function receiveVerifierReward(address cycle, uint256 totalAmount) external nonReentrant {
        require(msg.sender == cycle, "!cycle");
        uint256 availableRewards = stablecoin.balanceOf(address(this)) - totalStaked - totalPendingRewards;
        require(totalAmount <= availableRewards, "!funded");
        uint256 activeStake;
        uint256 count;
        for (uint256 i = 0; i < verifierList.length; i++) {
            address addr = verifierList[i];
            Verifier storage v = verifiers[addr];
            if (v.active && v.stake > 0 && _participatedInCycle(cycle, addr)) {
                activeStake += v.stake;
                count++;
            }
        }
        if (activeStake == 0 || count == 0) return;
        for (uint256 i = 0; i < verifierList.length; i++) {
            address addr = verifierList[i];
            Verifier storage v = verifiers[addr];
            if (v.active && v.stake > 0 && _participatedInCycle(cycle, addr)) {
                uint256 share = totalAmount * v.stake / activeStake;
                if (share == 0) continue;
                v.pendingReward += share;
                v.totalEarned   += share;
                totalPendingRewards += share;
            }
        }
        emit RewardReceived(totalAmount, activeStake, count);
    }

    function _participatedInCycle(address cycle, address verifier) internal view returns (bool) {
        for (uint8 m = 0; m < 4; m++) {
            if (approvals[cycle][m][verifier]) return true;
        }
        return approvals[cycle][99][verifier];
    }

    function quorumReached(address cycle, uint8 milestoneId) external view returns (bool) {
        return approvalCount[cycle][milestoneId] >= quorum;
    }

    function slashVerifier(address verifier) external onlyOwner {
        Verifier storage v = verifiers[verifier];
        require(v.stake > 0, "!stake");
        uint256 a = v.stake; v.stake = 0; v.active = false;
        totalStaked -= a;
        stablecoin.safeTransfer(owner(), a);
        emit StakeSlashed(verifier, a);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
        emit FactoryUpdated(_factory);
    }

    function setQuorum(uint256 q)       external onlyOwner { require(q > 0); quorum = q; }
    function setMinimumStake(uint256 m) external onlyOwner { minimumStake = m; }
    function verifierActive(address v)  external view returns (bool)              { return verifiers[v].active; }
    function getVerifierList()          external view returns (address[] memory)  { return verifierList; }
    function canUnstake(address verifier) public view returns (bool) {
        Verifier storage v = verifiers[verifier];
        if (!v.active || v.stake == 0) return false;
        return activeCycleApprovalsCount(verifier) == 0;
    }

    function activeCycleApprovalsCount(address verifier) public view returns (uint256 count) {
        if (factory == address(0)) return 0;
        address[] memory cycles = ICycleFactoryReader(factory).getAllCycles();
        for (uint256 i = 0; i < cycles.length; i++) {
            uint8 cycleState = ICycleStateReader(cycles[i]).state();
            if (cycleState >= 3) continue;
            for (uint8 m = 0; m < 4; m++) {
                if (approvals[cycles[i]][m][verifier]) {
                    count++;
                    break;
                }
            }
            if (approvals[cycles[i]][99][verifier]) count++;
        }
    }

    function activeVerifierCount()      external view returns (uint256 count) {
        for (uint256 i = 0; i < verifierList.length; i++)
            if (verifiers[verifierList[i]].active) count++;
    }
}

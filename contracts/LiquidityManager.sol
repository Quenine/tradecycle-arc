// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IProductionCycleFunding {
    function invest(uint256 amount) external;
    function state() external view returns (uint8);
    function cycleToken() external view returns (address);
}

interface IUniswapV2FactoryLike {
    function getPair(address tokenA, address tokenB) external view returns (address);
    function createPair(address tokenA, address tokenB) external returns (address);
}

interface IUniswapV2RouterLike {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
}

interface ILiquidityVaultLike {
    function requestFunds(uint256 amount) external;
}

contract LiquidityManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;
    address public factory;
    address public dexFactory;
    address public dexRouter;
    address public vault;

    uint16 public tokenSeedBps = 200;
    uint16 public stableSeedBps = 200;
    uint16 public constant MAX_SEED_BPS = 2000;

    struct LaunchConfig {
        uint256 tokenInvestmentAmount;
        uint256 stableLiquidityAmount;
        bool invested;
        bool launched;
        bool enabled;
    }

    mapping(address => LaunchConfig) public launches;

    event FactorySet(address indexed factory);
    event VaultSet(address indexed vault);
    event DexSet(address indexed dexFactory, address indexed dexRouter);
    event SeedConfigUpdated(uint16 tokenSeedBps, uint16 stableSeedBps);
    event CycleRegistered(address indexed cycle, uint256 tokenInvestmentAmount, uint256 stableLiquidityAmount);
    event SeedInvestmentExecuted(address indexed cycle, uint256 amount);
    event LiquidityLaunchFailed(address indexed cycle, string reason);
    event LiquidityLaunched(address indexed cycle, address indexed token, uint256 tokenAmount, uint256 stableAmount);
    event StablecoinFunded(address indexed from, uint256 amount);
    event AssetRescued(address indexed token, address indexed to, uint256 amount);

    modifier onlyFactory() {
        require(msg.sender == factory, "!factory");
        _;
    }

    constructor(address _stablecoin) Ownable(msg.sender) {
        require(_stablecoin != address(0), "!stablecoin");
        stablecoin = IERC20(_stablecoin);
    }

    function fund(uint256 amount) external onlyOwner {
        require(amount > 0, "!amount");
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        emit StablecoinFunded(msg.sender, amount);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
        emit FactorySet(_factory);
    }

    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultSet(_vault);
    }

    function setDex(address _dexFactory, address _dexRouter) external onlyOwner {
        dexFactory = _dexFactory;
        dexRouter = _dexRouter;
        emit DexSet(_dexFactory, _dexRouter);
    }

    function setSeedConfig(uint16 _tokenSeedBps, uint16 _stableSeedBps) external onlyOwner {
        require(_tokenSeedBps <= MAX_SEED_BPS && _stableSeedBps <= MAX_SEED_BPS, "!bps");
        tokenSeedBps = _tokenSeedBps;
        stableSeedBps = _stableSeedBps;
        emit SeedConfigUpdated(_tokenSeedBps, _stableSeedBps);
    }

    function registerCycle(address cycle, uint256 capitalRequired) external onlyFactory nonReentrant {
        require(cycle != address(0) && capitalRequired > 0, "!cycle");

        LaunchConfig storage cfg = launches[cycle];
        require(!cfg.enabled, "exists");

        uint256 tokenInvestmentAmount = capitalRequired * tokenSeedBps / 10000;
        uint256 stableLiquidityAmount = capitalRequired * stableSeedBps / 10000;

        cfg.enabled = tokenInvestmentAmount > 0 || stableLiquidityAmount > 0;
        cfg.tokenInvestmentAmount = tokenInvestmentAmount;
        cfg.stableLiquidityAmount = stableLiquidityAmount;

        emit CycleRegistered(cycle, tokenInvestmentAmount, stableLiquidityAmount);

        if (tokenInvestmentAmount == 0) return;
        _pullStablecoin(tokenInvestmentAmount);
        if (stablecoin.balanceOf(address(this)) < tokenInvestmentAmount) {
            emit LiquidityLaunchFailed(cycle, "insufficient-seed-stable");
            return;
        }

        stablecoin.forceApprove(cycle, tokenInvestmentAmount);
        try IProductionCycleFunding(cycle).invest(tokenInvestmentAmount) {
            cfg.invested = true;
            emit SeedInvestmentExecuted(cycle, tokenInvestmentAmount);
        } catch {
            emit LiquidityLaunchFailed(cycle, "seed-invest-failed");
        }
    }

    function onFundingComplete(address cycle) external nonReentrant {
        require(msg.sender == cycle, "!cycle");
        _launchLiquidity(cycle);
    }

    function retryLiquidityLaunch(address cycle) external onlyOwner nonReentrant {
        require(cycle != address(0), "!cycle");
        _launchLiquidity(cycle);
    }

    function _launchLiquidity(address cycle) internal {
        LaunchConfig storage cfg = launches[cycle];
        if (!cfg.enabled || cfg.launched) return;
        if (!cfg.invested) {
            emit LiquidityLaunchFailed(cycle, "seed-not-invested");
            return;
        }
        if (dexFactory == address(0) || dexRouter == address(0)) {
            emit LiquidityLaunchFailed(cycle, "dex-not-configured");
            return;
        }
        if (IProductionCycleFunding(cycle).state() != 1) {
            emit LiquidityLaunchFailed(cycle, "cycle-not-active");
            return;
        }

        address token = IProductionCycleFunding(cycle).cycleToken();
        uint256 tokenAmount = cfg.tokenInvestmentAmount;
        uint256 stableAmount = cfg.stableLiquidityAmount;
        _pullStablecoin(stableAmount);
        uint256 availableToken = IERC20(token).balanceOf(address(this));
        uint256 availableStable = stablecoin.balanceOf(address(this));

        if (availableToken < tokenAmount) tokenAmount = availableToken;
        if (availableStable < stableAmount) stableAmount = availableStable;

        if (tokenAmount == 0 || stableAmount == 0) {
            emit LiquidityLaunchFailed(cycle, "missing-liquidity-inventory");
            return;
        }

        address pair = IUniswapV2FactoryLike(dexFactory).getPair(token, address(stablecoin));
        if (pair == address(0)) {
            try IUniswapV2FactoryLike(dexFactory).createPair(token, address(stablecoin)) returns (address) {} catch {
                emit LiquidityLaunchFailed(cycle, "pair-create-failed");
                return;
            }
        }

        IERC20(token).forceApprove(dexRouter, tokenAmount);
        stablecoin.forceApprove(dexRouter, stableAmount);

        try IUniswapV2RouterLike(dexRouter).addLiquidity(
            token,
            address(stablecoin),
            tokenAmount,
            stableAmount,
            0,
            0,
            address(this),
            block.timestamp + 15 minutes
        ) returns (uint256 usedToken, uint256 usedStable, uint256) {
            cfg.launched = true;
            emit LiquidityLaunched(cycle, token, usedToken, usedStable);
        } catch {
            emit LiquidityLaunchFailed(cycle, "add-liquidity-failed");
        }
    }

    function rescueAsset(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0) && amount > 0, "!rescue");
        IERC20(token).safeTransfer(to, amount);
        emit AssetRescued(token, to, amount);
    }

    function _pullStablecoin(uint256 targetAmount) internal {
        if (vault == address(0)) return;
        uint256 bal = stablecoin.balanceOf(address(this));
        if (bal >= targetAmount) return;
        uint256 shortfall = targetAmount - bal;
        try ILiquidityVaultLike(vault).requestFunds(shortfall) {} catch {}
    }
}

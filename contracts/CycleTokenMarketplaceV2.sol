// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  CycleTokenMarketplace v2
//
//  Upgrade from v1:
//  ✓ Protocol trading fee (default 0.5%) → ProtocolTreasury
//  ✓ Fee configurable by owner (max 5%)
//  ✓ Partial fills: buyers can fill any fraction of an order
//  ✓ Seller receives payment minus fee
//  ✓ Treasury receives fee automatically
//
//  This contract is the PRIMARY revenue driver for secondary
//  liquidity — every token trade earns the protocol income.
// ============================================================

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICycleToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

contract CycleTokenMarketplaceV2 is Ownable, ReentrancyGuard {

    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;
    address public treasury;

    /*//////////////////////////////////////////////////////////////
                        FEE CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    // Basis points (10000 = 100%). Default: 50 = 0.5%
    uint256 public tradingFeeBps = 50;
    uint256 public constant MAX_FEE_BPS = 500; // 5% hard cap

    uint256 public totalFeesCollected;

    /*//////////////////////////////////////////////////////////////
                        ORDER BOOK
    //////////////////////////////////////////////////////////////*/

    struct Order {
        uint256 id;
        address seller;
        address token;
        uint256 amount;          // remaining fillable amount
        uint256 originalAmount;  // original listed amount
        uint256 pricePerToken;   // stablecoin units per one full cycle token
        bool active;
    }

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    // Track all order IDs per token for easy querying
    mapping(address => uint256[]) public tokenOrders;

    /*//////////////////////////////////////////////////////////////
                            EVENTS
    //////////////////////////////////////////////////////////////*/

    event OrderCreated(
        uint256 indexed orderId,
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 pricePerToken
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amountFilled,
        uint256 totalCost,
        uint256 feePaid
    );

    event OrderCancelled(uint256 indexed orderId);
    event TradingFeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address newTreasury);

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _stablecoin, address _treasury)
        Ownable(msg.sender)
    {
        require(_stablecoin != address(0), "Invalid stablecoin");
        require(_treasury != address(0), "Invalid treasury");

        stablecoin = IERC20(_stablecoin);
        treasury = _treasury;
    }

    /*//////////////////////////////////////////////////////////////
                        CREATE SELL ORDER
    //////////////////////////////////////////////////////////////*/

    function createSellOrder(
        address token,
        uint256 amount,
        uint256 pricePerToken
    )
        external
        nonReentrant
    {
        require(amount > 0, "Invalid amount");
        require(pricePerToken > 0, "Invalid price");

        // Pull tokens from seller into escrow
        ICycleToken(token).transferFrom(msg.sender, address(this), amount);

        orders[nextOrderId] = Order({
            id:             nextOrderId,
            seller:         msg.sender,
            token:          token,
            amount:         amount,
            originalAmount: amount,
            pricePerToken:  pricePerToken,
            active:         true
        });

        tokenOrders[token].push(nextOrderId);

        emit OrderCreated(nextOrderId, msg.sender, token, amount, pricePerToken);

        nextOrderId++;
    }

    /*//////////////////////////////////////////////////////////////
                        BUY ORDER (full or partial)
    //////////////////////////////////////////////////////////////*/

    function buyOrder(uint256 orderId, uint256 fillAmount)
        external
        nonReentrant
    {
        _buyOrder(orderId, fillAmount, msg.sender);
    }

    function _buyOrder(uint256 orderId, uint256 fillAmount, address buyer)
        internal
    {
        Order storage order = orders[orderId];

        require(order.active, "Order inactive");
        require(fillAmount > 0, "Zero fill");
        require(fillAmount <= order.amount, "Exceeds available");

        // Calculate costs
        uint256 grossCost = fillAmount * order.pricePerToken / (10 ** ICycleToken(order.token).decimals());
        uint256 fee       = (grossCost * tradingFeeBps) / 10000;
        uint256 netToSeller = grossCost - fee;

        // Collect USDC from buyer
        stablecoin.safeTransferFrom(buyer, order.seller, netToSeller);

        if (fee > 0) {
            stablecoin.safeTransferFrom(buyer, treasury, fee);
            totalFeesCollected += fee;
        }

        // Transfer tokens to buyer
        ICycleToken(order.token).transfer(buyer, fillAmount);

        // Update order
        order.amount -= fillAmount;
        if (order.amount == 0) {
            order.active = false;
        }

        emit OrderFilled(orderId, buyer, fillAmount, grossCost, fee);
    }

    // Convenience: buy entire order
    function buyOrderFull(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.active, "Order inactive");
        _buyOrder(orderId, order.amount, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                        CANCEL ORDER
    //////////////////////////////////////////////////////////////*/

    function cancelOrder(uint256 orderId)
        external
        nonReentrant
    {
        Order storage order = orders[orderId];

        require(order.seller == msg.sender, "Not seller");
        require(order.active, "Inactive");

        uint256 remaining = order.amount;
        order.active = false;
        order.amount = 0;

        // Return remaining tokens
        ICycleToken(order.token).transfer(msg.sender, remaining);

        emit OrderCancelled(orderId);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getTokenOrders(address token)
        external
        view
        returns (uint256[] memory)
    {
        return tokenOrders[token];
    }

    function getActiveOrders(address token)
        external
        view
        returns (Order[] memory)
    {
        uint256[] memory ids = tokenOrders[token];
        uint256 count;

        for (uint256 i = 0; i < ids.length; i++) {
            if (orders[ids[i]].active) count++;
        }

        Order[] memory active = new Order[](count);
        uint256 j;
        for (uint256 i = 0; i < ids.length; i++) {
            if (orders[ids[i]].active) {
                active[j++] = orders[ids[i]];
            }
        }
        return active;
    }

    function orderCost(uint256 orderId, uint256 fillAmount)
        external
        view
        returns (uint256 gross, uint256 fee, uint256 total)
    {
        Order storage order = orders[orderId];
        gross = fillAmount * order.pricePerToken / (10 ** ICycleToken(order.token).decimals());
        fee   = (gross * tradingFeeBps) / 10000;
        total = gross;
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN
    //////////////////////////////////////////////////////////////*/

    function setTradingFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= MAX_FEE_BPS, "Fee too high");
        tradingFeeBps = feeBps;
        emit TradingFeeUpdated(feeBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
}

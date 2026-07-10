// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICycleToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract CycleTokenMarketplace {

    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;

    struct Order {
        uint256 id;
        address seller;
        address token;
        uint256 amount;
        uint256 pricePerToken;
        bool active;
    }

    uint256 public nextOrderId;

    mapping(uint256 => Order) public orders;

    event OrderCreated(
        uint256 orderId,
        address seller,
        address token,
        uint256 amount,
        uint256 price
    );

    event OrderFilled(
        uint256 orderId,
        address buyer
    );

    event OrderCancelled(
        uint256 orderId
    );

    constructor(address _stablecoin) {
        require(_stablecoin != address(0), "Invalid stablecoin");

        stablecoin = IERC20(_stablecoin);
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
    {

        require(amount > 0, "Invalid amount");
        require(pricePerToken > 0, "Invalid price");

        ICycleToken(token).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        orders[nextOrderId] = Order({
            id: nextOrderId,
            seller: msg.sender,
            token: token,
            amount: amount,
            pricePerToken: pricePerToken,
            active: true
        });

        emit OrderCreated(
            nextOrderId,
            msg.sender,
            token,
            amount,
            pricePerToken
        );

        nextOrderId++;
    }

    /*//////////////////////////////////////////////////////////////
                        BUY ORDER
    //////////////////////////////////////////////////////////////*/

    function buyOrder(uint256 orderId)
        external
    {

        Order storage order = orders[orderId];

        require(order.active, "Order inactive");

        uint256 cost =
            order.amount *
            order.pricePerToken;

        stablecoin.safeTransferFrom(
            msg.sender,
            order.seller,
            cost
        );

        ICycleToken(order.token).transfer(
            msg.sender,
            order.amount
        );

        order.active = false;

        emit OrderFilled(orderId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                        CANCEL ORDER
    //////////////////////////////////////////////////////////////*/

    function cancelOrder(uint256 orderId)
        external
    {

        Order storage order = orders[orderId];

        require(order.seller == msg.sender, "Not seller");
        require(order.active, "Inactive");

        ICycleToken(order.token).transfer(
            msg.sender,
            order.amount
        );

        order.active = false;

        emit OrderCancelled(orderId);
    }
}
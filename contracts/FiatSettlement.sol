// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FiatSettlement is Ownable {

    using SafeERC20 for IERC20;

    IERC20 public stablecoin;

    mapping(bytes32 => bool) public processedPayments;

    event FiatPaymentConfirmed(
        bytes32 indexed paymentId,
        address indexed cycle,
        uint256 amount
    );

    constructor(address _stablecoin)
        Ownable(msg.sender)
    {
        stablecoin = IERC20(_stablecoin);
    }

    function confirmFiatPayment(
        bytes32 paymentId,
        address cycle,
        uint256 amount
    )
        external
        onlyOwner
    {
        require(!processedPayments[paymentId], "Payment already processed");

        processedPayments[paymentId] = true;

        stablecoin.safeTransfer(cycle, amount);

        emit FiatPaymentConfirmed(paymentId, cycle, amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IReserveCompensatedCycle {
    function onReserveCompensation(uint256 amount) external;
}

contract ReservePool is Ownable {

    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;

    uint256 public totalReserves;

    event ReserveAdded(uint256 amount);
    event CompensationPaid(address cycle, uint256 amount);

    constructor(address _stablecoin)
        Ownable(msg.sender)
    {
        require(_stablecoin != address(0), "Invalid stablecoin");

        stablecoin = IERC20(_stablecoin);
    }

    /*//////////////////////////////////////////////////////////////
                        ADD RESERVES
    //////////////////////////////////////////////////////////////*/

    function addReserves(uint256 amount)
        external
    {
        stablecoin.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        totalReserves += amount;

        emit ReserveAdded(amount);
    }

    /*//////////////////////////////////////////////////////////////
                        PAY COMPENSATION
    //////////////////////////////////////////////////////////////*/

    function compensate(
        address cycle,
        uint256 amount
    )
        external
        onlyOwner
    {

        uint256 currentBalance = stablecoin.balanceOf(address(this));
        require(amount <= currentBalance, "Insufficient reserves");

        totalReserves = currentBalance - amount;

        stablecoin.safeTransfer(cycle, amount);
        IReserveCompensatedCycle(cycle).onReserveCompensation(amount);

        emit CompensationPaid(cycle, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function reserveBalance()
        external
        view
        returns (uint256)
    {
        return stablecoin.balanceOf(address(this));
    }

    function syncReserves()
        external
        returns (uint256)
    {
        totalReserves = stablecoin.balanceOf(address(this));
        return totalReserves;
    }
}

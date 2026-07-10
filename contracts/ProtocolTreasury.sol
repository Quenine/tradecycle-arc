// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProtocolTreasury is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;

    event Withdraw(address indexed to, uint256 amount);

    constructor(address _stablecoin)
        Ownable(msg.sender)
    {
        require(_stablecoin != address(0), "Invalid stablecoin");
        stablecoin = IERC20(_stablecoin);
    }

    function withdraw(address to, uint256 amount)
        external
        onlyOwner
    {
        require(to != address(0), "Invalid address");
        stablecoin.safeTransfer(to, amount);

        emit Withdraw(to, amount);
    }
}
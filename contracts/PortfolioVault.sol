// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IProductionCycle {
    function invest(uint256 amount) external;
}

contract PortfolioVault is ERC20, Ownable {

    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;

    uint256 public totalDeposited;

    struct Allocation {
        address cycle;
        uint256 amount;
    }

    Allocation[] public allocations;

    event Deposited(address investor, uint256 amount);
    event Allocated(address cycle, uint256 amount);
    event Withdrawn(address investor, uint256 amount);

    constructor(address _stablecoin)
        ERC20("Portfolio Vault Share", "PVS")
        Ownable(msg.sender)
    {
        stablecoin = IERC20(_stablecoin);
    }

    /*//////////////////////////////////////////////////////////////
                        DEPOSIT
    //////////////////////////////////////////////////////////////*/

    function deposit(uint256 amount) external {

        require(amount > 0, "Invalid amount");

        stablecoin.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        _mint(msg.sender, amount);

        totalDeposited += amount;

        emit Deposited(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        ALLOCATE CAPITAL
    //////////////////////////////////////////////////////////////*/

    function allocate(
        address cycle,
        uint256 amount
    )
        external
        onlyOwner
    {

        require(amount <= stablecoin.balanceOf(address(this)), "Insufficient");

        stablecoin.forceApprove(cycle, amount);

        IProductionCycle(cycle).invest(amount);

        allocations.push(
            Allocation({
                cycle: cycle,
                amount: amount
            })
        );

        emit Allocated(cycle, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        WITHDRAW
    //////////////////////////////////////////////////////////////*/

    function withdraw(uint256 shares) external {

        require(shares > 0, "Invalid");

        uint256 payout =
            (shares * stablecoin.balanceOf(address(this))) /
            totalSupply();

        _burn(msg.sender, shares);

        stablecoin.safeTransfer(msg.sender, payout);

        emit Withdrawn(msg.sender, payout);
    }

    function totalAllocations()
        external
        view
        returns (uint256)
    {
        return allocations.length;
    }
}
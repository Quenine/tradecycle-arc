// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CycleShareToken is ERC20 {
    error InvalidCycle();
    error OnlyCycle();

    address public immutable cycle;
    uint8 private immutable tokenDecimals;

    constructor(
        string memory name_,
        string memory symbol_,
        address cycleAddress,
        uint8 decimals_
    ) ERC20(name_, symbol_) {

        if (cycleAddress == address(0)) revert InvalidCycle();

        cycle = cycleAddress;
        tokenDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return tokenDecimals;
    }

    modifier onlyCycle() {
        if (msg.sender != cycle) revert OnlyCycle();
        _;
    }

    function mint(address to, uint256 amount)
        external
        onlyCycle
    {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount)
        external
        onlyCycle
    {
        _burn(from, amount);
    }
}

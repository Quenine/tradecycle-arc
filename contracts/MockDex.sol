// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockDexFactory {
    mapping(address => mapping(address => address)) public getPair;

    event PairCreated(address indexed tokenA, address indexed tokenB, address pair);

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != address(0) && tokenB != address(0), "!token");
        pair = address(uint160(uint256(keccak256(abi.encodePacked(tokenA, tokenB, block.chainid)))));
        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair;
        emit PairCreated(tokenA, tokenB, pair);
    }
}

contract MockDexRouter {
    using SafeERC20 for IERC20;

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256,
        uint256,
        address,
        uint256
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountBDesired);
        return (amountADesired, amountBDesired, amountADesired + amountBDesired);
    }
}

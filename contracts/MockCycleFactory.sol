// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockCycleFactory {
    address[] internal cycles;

    function setCycles(address[] calldata _cycles) external {
        delete cycles;
        for (uint256 i = 0; i < _cycles.length; i++) {
            cycles.push(_cycles[i]);
        }
    }

    function getAllCycles() external view returns (address[] memory) {
        return cycles;
    }
}

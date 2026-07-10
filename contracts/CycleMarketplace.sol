// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProductionCycle {
    function cycleName() external view returns (string memory);
    function category() external view returns (string memory);
    function location() external view returns (string memory);
    function capitalRequired() external view returns (uint256);
    function totalRaised() external view returns (uint256);
    function duration() external view returns (uint256);
}

contract CycleMarketplace {

    struct CycleInfo {
        address cycle;
        address operator;
        string name;
        string category;
        string location;
        uint256 capitalRequired;
        uint256 duration;
    }

    CycleInfo[] public cycles;

    mapping(address => uint256[]) public operatorCycles;

    event CycleListed(
        address indexed cycle,
        address indexed operator
    );

    function listCycle(address cycleAddress, address operator)
        external
    {

        IProductionCycle cycle = IProductionCycle(cycleAddress);

        CycleInfo memory info = CycleInfo({
            cycle: cycleAddress,
            operator: operator,
            name: cycle.cycleName(),
            category: cycle.category(),
            location: cycle.location(),
            capitalRequired: cycle.capitalRequired(),
            duration: cycle.duration()
        });

        cycles.push(info);

        operatorCycles[operator].push(cycles.length - 1);

        emit CycleListed(cycleAddress, operator);
    }

    function getAllCycles()
        external
        view
        returns (CycleInfo[] memory)
    {
        return cycles;
    }

    function getOperatorCycles(address operator)
        external
        view
        returns (uint256[] memory)
    {
        return operatorCycles[operator];
    }

    function totalCycles()
        external
        view
        returns (uint256)
    {
        return cycles.length;
    }
}
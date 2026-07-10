// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldOracle is Ownable {

    struct YieldEstimate {
        uint256 expectedRevenue;
        uint256 estimatedCost;
        uint256 estimatedProfit;
        uint256 estimatedROI;
        uint8 riskScore;
        bool exists;
    }

    mapping(address => YieldEstimate) public estimates;

    event YieldUpdated(
        address indexed cycle,
        uint256 revenue,
        uint256 profit,
        uint256 roi,
        uint8 risk
    );

    constructor() Ownable(msg.sender) {}

    function updateEstimate(
        address cycle,
        uint256 expectedRevenue,
        uint256 estimatedCost,
        uint8 riskScore
    )
        external
        onlyOwner
    {

        uint256 profit = expectedRevenue - estimatedCost;

        uint256 roi = (profit * 100) / estimatedCost;

        estimates[cycle] = YieldEstimate({
            expectedRevenue: expectedRevenue,
            estimatedCost: estimatedCost,
            estimatedProfit: profit,
            estimatedROI: roi,
            riskScore: riskScore,
            exists: true
        });

        emit YieldUpdated(
            cycle,
            expectedRevenue,
            profit,
            roi,
            riskScore
        );
    }

    function getEstimate(address cycle)
        external
        view
        returns (
            uint256 revenue,
            uint256 cost,
            uint256 profit,
            uint256 roi,
            uint8 risk
        )
    {

        YieldEstimate memory e = estimates[cycle];

        require(e.exists, "No estimate");

        return (
            e.expectedRevenue,
            e.estimatedCost,
            e.estimatedProfit,
            e.estimatedROI,
            e.riskScore
        );
    }
}
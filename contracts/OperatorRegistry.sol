// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OperatorRegistry {

    struct OperatorStats {
        bool registered;
        uint256 cyclesCreated;
        uint256 cyclesCompleted;
        uint256 cyclesDefaulted;
        uint256 totalCapitalRaised;
    }

    mapping(address => OperatorStats) public operators;

    event OperatorRegistered(address operator);
    event CycleRecorded(address operator, uint256 capital);
    event CycleCompleted(address operator);
    event CycleDefaulted(address operator);

    /*//////////////////////////////////////////////////////////////
                        REGISTER OPERATOR
    //////////////////////////////////////////////////////////////*/

    function registerOperator(address operator) external {

        require(operator != address(0), "Invalid operator");

        OperatorStats storage stats = operators[operator];

        require(!stats.registered, "Already registered");

        stats.registered = true;

        emit OperatorRegistered(operator);
    }

    /*//////////////////////////////////////////////////////////////
                        RECORD CYCLE CREATION
    //////////////////////////////////////////////////////////////*/

    function recordCycle(address operator, uint256 capital)
        external
    {

        OperatorStats storage stats = operators[operator];

        require(stats.registered, "Operator not registered");

        stats.cyclesCreated += 1;
        stats.totalCapitalRaised += capital;

        emit CycleRecorded(operator, capital);
    }

    /*//////////////////////////////////////////////////////////////
                        RECORD SUCCESS
    //////////////////////////////////////////////////////////////*/

    function recordCompletion(address operator)
        external
    {

        OperatorStats storage stats = operators[operator];

        require(stats.registered, "Operator not registered");

        stats.cyclesCompleted += 1;

        emit CycleCompleted(operator);
    }

    /*//////////////////////////////////////////////////////////////
                        RECORD DEFAULT
    //////////////////////////////////////////////////////////////*/

    function recordDefault(address operator)
        external
    {

        OperatorStats storage stats = operators[operator];

        require(stats.registered, "Operator not registered");

        stats.cyclesDefaulted += 1;

        emit CycleDefaulted(operator);
    }

    /*//////////////////////////////////////////////////////////////
                        REPUTATION SCORE
    //////////////////////////////////////////////////////////////*/

    function reputationScore(address operator)
        external
        view
        returns (uint256)
    {

        OperatorStats memory stats = operators[operator];

        if (stats.cyclesCreated == 0) {
            return 0;
        }

        uint256 successRate =
            (stats.cyclesCompleted * 100) /
            stats.cyclesCreated;

        return successRate;
    }
}
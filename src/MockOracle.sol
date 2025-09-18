// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Interfaces.sol";

contract MockOracle is IAggregatorV3 {
    struct RoundData {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    mapping(uint80 => RoundData) public rounds;
    uint80 public latestRoundId;
    
    uint8 public constant override decimals = 8;
    string public constant override description = "Mock Oracle ETH/USD";
    uint256 public constant override version = 1;
    
    address public owner;
    
    event AnswerUpdated(int256 indexed current, uint80 indexed roundId, uint256 updatedAt);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        // Initialize with a default round
        latestRoundId = 1;
        rounds[1] = RoundData({
            answer: 200000000000, // $2000 with 8 decimals
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
    }
    
    function updateAnswer(int256 newAnswer) external onlyOwner {
        require(newAnswer > 0, "Answer must be positive");
        
        latestRoundId++;
        rounds[latestRoundId] = RoundData({
            answer: newAnswer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: latestRoundId
        });
        
        emit AnswerUpdated(newAnswer, latestRoundId, block.timestamp);
    }
    
    function latestRoundData() external view override returns (
        uint80,
        int256,
        uint256,
        uint256,
        uint80
    ) {
        return getRoundData(latestRoundId);
    }
    
    function getRoundData(uint80 roundId) public view override returns (
        uint80,
        int256,
        uint256,
        uint256,
        uint80
    ) {
        RoundData memory round = rounds[roundId];
        require(round.answeredInRound != 0, "Round not found");
        
        return (
            roundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            round.answeredInRound
        );
    }
}

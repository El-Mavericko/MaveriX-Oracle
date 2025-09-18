// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MockOracle.sol";

contract MockOracleTest is Test {
    MockOracle public oracle;
    
    function setUp() public {
        oracle = new MockOracle();
    }
    
    function testInitialValues() public view {
        assertEq(oracle.decimals(), 8);
        assertEq(oracle.version(), 1);
        assertEq(oracle.latestRoundId(), 1);
        
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();
        assertEq(roundId, 1);
        assertEq(answer, 200000000000);
        assertEq(answeredInRound, 1);
        
        // Check that timestamps are valid (greater than 0)
        assertTrue(startedAt > 0, "startedAt should be greater than 0");
        assertTrue(updatedAt > 0, "updatedAt should be greater than 0");
        
        // Check that startedAt and updatedAt are equal for initial round (created at same time)
        assertEq(startedAt, updatedAt, "startedAt and updatedAt should be equal for initial round");
    }
    
    function testUpdateAnswer() public {
        int256 newAnswer = 250000000000; // $2500
        
        // Record the timestamp before the update
        uint256 timestampBeforeUpdate = block.timestamp;
        
        oracle.updateAnswer(newAnswer);
        
        assertEq(oracle.latestRoundId(), 2);
        
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();
        assertEq(roundId, 2);
        assertEq(answer, newAnswer);
        assertEq(answeredInRound, 2);
        
        // Check that timestamps are valid
        assertTrue(startedAt > 0, "startedAt should be greater than 0");
        assertTrue(updatedAt > 0, "updatedAt should be greater than 0");
        
        // Check that timestamps are reasonable (not too far in the past or future)
        assertTrue(startedAt >= timestampBeforeUpdate, "startedAt should be >= timestamp before update");
        assertTrue(updatedAt >= timestampBeforeUpdate, "updatedAt should be >= timestamp before update");
        
        // Check that startedAt and updatedAt are equal for the new round (created at same time)
        assertEq(startedAt, updatedAt, "startedAt and updatedAt should be equal for new round");
    }
    
    function testLatestRoundData() public view {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();
        
        assertEq(roundId, 1);
        assertEq(answer, 200000000000);
        assertTrue(startedAt > 0, "startedAt should be greater than 0");
        assertTrue(updatedAt > 0, "updatedAt should be greater than 0");
        assertEq(answeredInRound, 1);
        
        // Check that startedAt and updatedAt are equal for the initial round
        assertEq(startedAt, updatedAt, "startedAt and updatedAt should be equal for initial round");
        
        // Check that timestamps are reasonable (not too far in the past)
        assertTrue(startedAt <= block.timestamp, "startedAt should not be in the future");
        assertTrue(updatedAt <= block.timestamp, "updatedAt should not be in the future");
    }
    
    function testGetRoundData() public {
        // Record timestamp before update
        uint256 timestampBeforeUpdate = block.timestamp;
        
        oracle.updateAnswer(300000000000); // $3000
        
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = oracle.getRoundData(2);
        
        assertEq(roundId, 2);
        assertEq(answer, 300000000000);
        assertTrue(startedAt > 0, "startedAt should be greater than 0");
        assertTrue(updatedAt > 0, "updatedAt should be greater than 0");
        assertEq(answeredInRound, 2);
        
        // Check that timestamps are reasonable
        assertTrue(startedAt >= timestampBeforeUpdate, "startedAt should be >= timestamp before update");
        assertTrue(updatedAt >= timestampBeforeUpdate, "updatedAt should be >= timestamp before update");
        assertTrue(startedAt <= block.timestamp, "startedAt should not be in the future");
        assertTrue(updatedAt <= block.timestamp, "updatedAt should not be in the future");
        
        // Check that startedAt and updatedAt are equal for the new round
        assertEq(startedAt, updatedAt, "startedAt and updatedAt should be equal for new round");
    }
    
    function testOnlyOwnerCanUpdate() public {
        vm.prank(address(0x1));
        vm.expectRevert("Only owner can call this function");
        oracle.updateAnswer(100000000000);
    }
    
    function testCannotUpdateWithZeroAnswer() public {
        vm.expectRevert("Answer must be positive");
        oracle.updateAnswer(0);
    }
    
    function testCannotGetNonExistentRound() public {
        vm.expectRevert("Round not found");
        oracle.getRoundData(999);
    }
}

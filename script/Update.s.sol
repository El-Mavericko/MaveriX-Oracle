// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MockOracle.sol";

contract UpdateScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        int256 newAnswer = int256(vm.envUint("NEW_ANSWER"));
        
        vm.startBroadcast(deployerPrivateKey);
        
        MockOracle oracle = MockOracle(oracleAddress);
        oracle.updateAnswer(newAnswer);
        
        vm.stopBroadcast();
        
        console.log("Updated oracle with new answer:", newAnswer);
    }
}

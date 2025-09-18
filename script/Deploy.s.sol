// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import 'forge-std/Script.sol';
import '../src/MockOracle.sol';

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        vm.startBroadcast(deployerPrivateKey);

        MockOracle oracle = new MockOracle();

        vm.stopBroadcast();

        console.log('MockOracle deployed at:', address(oracle));
    }
}

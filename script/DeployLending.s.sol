// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MXT.sol";
import "../src/PriceOracle.sol";
import "../src/LendingPool.sol";

/// @notice Deploys the MaveriX Lending Protocol to Sepolia.
///
/// Usage:
///   forge script script/DeployLending.s.sol \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     --verify \
///     -vvvv
///
/// Required env vars:
///   PRIVATE_KEY      — deployer private key (0x-prefixed)
///   SEPOLIA_RPC_URL  — e.g. https://sepolia.infura.io/v3/<key>
///   ETHERSCAN_API_KEY (optional) — for --verify
contract DeployLending is Script {

    // Sepolia contract addresses
    address constant CHAINLINK_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address constant WETH_SEPOLIA      = 0xdd13E55209Fd76AfE204dBda4007C227904f0a81;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // 1. Price oracle (wraps Chainlink ETH/USD)
        PriceOracle oracle = new PriceOracle(CHAINLINK_ETH_USD);
        console.log("PriceOracle:", address(oracle));

        // 2. MXT token (minter will be set to LendingPool)
        MXT mxt = new MXT();
        console.log("MXT:        ", address(mxt));

        // 3. LendingPool
        LendingPool pool = new LendingPool(
            WETH_SEPOLIA,
            address(mxt),
            address(oracle)
        );
        console.log("LendingPool:", address(pool));

        // 4. Grant LendingPool minting rights
        mxt.setMinter(address(pool));
        console.log("Minter set to LendingPool");

        vm.stopBroadcast();

        // Summary
        console.log("\n=== MaveriX Lending Protocol deployed to Sepolia ===");
        console.log("PriceOracle:", address(oracle));
        console.log("MXT Token:  ", address(mxt));
        console.log("LendingPool:", address(pool));
        console.log("WETH:       ", WETH_SEPOLIA);
        console.log("Chainlink:  ", CHAINLINK_ETH_USD);
        console.log("\nNext: paste these addresses into MaveriX-Treasury/App.tsx");
    }
}

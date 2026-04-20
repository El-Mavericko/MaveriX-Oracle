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

    address constant CHAINLINK_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address constant WETH_SEPOLIA      = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // WETH9 — supports deposit() payable

    // Price bounds for ETH/USD (Chainlink uses 8 decimals)
    int256 constant ETH_MIN_PRICE = 100e8;      // $100
    int256 constant ETH_MAX_PRICE = 50_000e8;   // $50,000

    // Initial protocol caps — adjust before mainnet
    uint256 constant INITIAL_COLLATERAL_CAP = 1_000e18;  // 1,000 WETH
    uint256 constant INITIAL_BORROW_CAP     = 1_000_000e18; // $1M MXT

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // 1. Price oracle (wraps Chainlink ETH/USD with bounds checks)
        PriceOracle oracle = new PriceOracle(
            CHAINLINK_ETH_USD,
            ETH_MIN_PRICE,
            ETH_MAX_PRICE
        );
        console.log("PriceOracle:", address(oracle));

        // 2. MXT token
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
        mxt.grantRole(mxt.MINTER_ROLE(), address(pool));
        console.log("MINTER_ROLE granted to LendingPool");

        // 5. Set initial caps
        pool.setCaps(INITIAL_COLLATERAL_CAP, INITIAL_BORROW_CAP);
        console.log("Caps set: collateral=1000 WETH, borrow=$1M MXT");

        vm.stopBroadcast();

        console.log("\n=== MaveriX Lending Protocol deployed to Sepolia ===");
        console.log("PriceOracle:", address(oracle));
        console.log("MXT Token:  ", address(mxt));
        console.log("LendingPool:", address(pool));
        console.log("WETH:       ", WETH_SEPOLIA);
        console.log("Chainlink:  ", CHAINLINK_ETH_USD);
    }
}

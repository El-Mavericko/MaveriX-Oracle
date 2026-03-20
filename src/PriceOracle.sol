// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Chainlink AggregatorV3 interface
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80  roundId,
            int256  answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80  answeredInRound
        );
}

/// @title PriceOracle
/// @notice Thin wrapper around a Chainlink price feed.
///         Returns the price normalised to 18 decimal places.
contract PriceOracle {
    AggregatorV3Interface public immutable feed;

    /// @param _feed Chainlink aggregator address (e.g. ETH/USD on Sepolia:
    ///              0x694AA1769357215DE4FAC081bf1f309aDC325306)
    constructor(address _feed) {
        require(_feed != address(0), "PriceOracle: zero address");
        feed = AggregatorV3Interface(_feed);
    }

    /// @notice Returns the latest asset price in 18-decimal USD.
    ///         Chainlink ETH/USD uses 8 decimals, so we scale up by 1e10.
    function getPrice() external view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
        require(answer > 0,                          "PriceOracle: invalid price");
        require(block.timestamp - updatedAt < 3600,  "PriceOracle: stale price"); // 1 h max age
        uint8 dec = feed.decimals();
        // Normalise to 18 decimals
        if (dec < 18) {
            return uint256(answer) * 10 ** (18 - dec);
        } else {
            return uint256(answer) / 10 ** (dec - 18);
        }
    }
}

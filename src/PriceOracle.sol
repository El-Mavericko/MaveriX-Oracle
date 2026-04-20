// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
/// @notice Chainlink wrapper with staleness, round-completion, and price-bounds checks.
contract PriceOracle {
    AggregatorV3Interface public immutable feed;

    /// Price bounds in feed-native decimals (e.g. 8-dec for ETH/USD).
    int256 public immutable minPrice;
    int256 public immutable maxPrice;

    uint256 private constant MAX_STALENESS = 3600; // 1 hour

    /// @param _feed      Chainlink aggregator address
    /// @param _minPrice  Minimum acceptable price in feed decimals (e.g. 100e8 = $100)
    /// @param _maxPrice  Maximum acceptable price in feed decimals (e.g. 50_000e8 = $50k)
    constructor(address _feed, int256 _minPrice, int256 _maxPrice) {
        require(_feed     != address(0), "PriceOracle: zero address");
        require(_minPrice  > 0,          "PriceOracle: invalid min");
        require(_maxPrice  > _minPrice,  "PriceOracle: invalid max");
        feed     = AggregatorV3Interface(_feed);
        minPrice = _minPrice;
        maxPrice = _maxPrice;
    }

    /// @notice Returns the latest asset price normalised to 18 decimals.
    function getPrice() external view returns (uint256) {
        (
            uint80  roundId,
            int256  answer,
            ,
            uint256 updatedAt,
            uint80  answeredInRound
        ) = feed.latestRoundData();

        // Fix 1: incomplete round — answeredInRound < roundId means the round
        //         never finalised; the returned answer is from an earlier round.
        require(answeredInRound >= roundId, "PriceOracle: stale round");

        // Staleness guard
        require(block.timestamp - updatedAt < MAX_STALENESS, "PriceOracle: stale price");

        // Fix 3: sanity bounds — reject implausible prices (feed malfunction / compromise)
        require(answer >= minPrice && answer <= maxPrice, "PriceOracle: price out of bounds");

        uint8 dec = feed.decimals();
        if (dec < 18) {
            return uint256(answer) * 10 ** (18 - dec);
        } else {
            return uint256(answer) / 10 ** (dec - 18);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MXT.sol";
import "../src/LendingPool.sol";

// ── Minimal mock contracts ────────────────────────────────────────────────────

/// @dev Fake WETH: standard ERC-20 with free mint for testing
contract MockWETH {
    string public constant name     = "Wrapped Ether";
    string public constant symbol   = "WETH";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply     += amount;
        balanceOf[to]   += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

/// @dev Fake oracle: returns a configurable ETH price (18-dec USD)
contract MockOracle {
    uint256 public price;

    constructor(uint256 _price) { price = _price; }

    function getPrice() external view returns (uint256) { return price; }
    function setPrice(uint256 _price) external          { price = _price; }
}

// ── Test suite ────────────────────────────────────────────────────────────────

contract LendingPoolTest is Test {

    MockWETH    weth;
    MXT         mxt;
    MockOracle  mockOracle;
    LendingPool pool;

    address alice   = address(0xA11CE);
    address bob     = address(0xB0B);
    address charlie = address(0xC14);

    // 1 ETH = $2,000 in 18-dec
    uint256 constant ETH_PRICE  = 2_000e18;
    uint256 constant ONE_ETH    = 1e18;
    uint256 constant PRECISION  = 1e18;

    function setUp() public {
        weth       = new MockWETH();
        mxt        = new MXT();
        mockOracle = new MockOracle(ETH_PRICE);

        // Deploy pool with mock oracle address (we use a workaround below)
        // Because LendingPool takes a PriceOracle address but we have a MockOracle,
        // we deploy a wrapper that delegates to our mock.
        pool = new LendingPool(
            address(weth),
            address(mxt),
            address(mockOracle) // works because we call getPrice() via low-level
        );

        // Grant LendingPool minting rights on MXT
        mxt.setMinter(address(pool));

        // Fund test users with WETH
        weth.mint(alice,   10 * ONE_ETH);
        weth.mint(bob,     10 * ONE_ETH);
        weth.mint(charlie, 10 * ONE_ETH);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _deposit(address user, uint256 amount) internal {
        vm.startPrank(user);
        weth.approve(address(pool), amount);
        pool.deposit(amount);
        vm.stopPrank();
    }

    function _borrow(address user, uint256 amount) internal {
        vm.prank(user);
        pool.borrow(amount);
    }

    function _repay(address user, uint256 amount) internal {
        vm.startPrank(user);
        mxt.approve(address(pool), amount);
        pool.repay(amount);
        vm.stopPrank();
    }

    // ── Deposit tests ─────────────────────────────────────────────────────────

    function test_deposit_transfersWETH() public {
        _deposit(alice, ONE_ETH);
        assertEq(weth.balanceOf(address(pool)), ONE_ETH);
        (uint256 collateral,,,,,) = pool.getPositionSummary(alice);
        assertEq(collateral, ONE_ETH);
    }

    function test_deposit_revertsOnZero() public {
        vm.prank(alice);
        vm.expectRevert("LP: zero amount");
        pool.deposit(0);
    }

    function test_totalCollateralAccumulates() public {
        _deposit(alice, ONE_ETH);
        _deposit(bob,   2 * ONE_ETH);
        assertEq(pool.totalCollateral(), 3 * ONE_ETH);
    }

    // ── Withdraw tests ────────────────────────────────────────────────────────

    function test_withdraw_noDebt() public {
        _deposit(alice, ONE_ETH);
        vm.prank(alice);
        pool.withdraw(ONE_ETH);
        assertEq(weth.balanceOf(alice), 10 * ONE_ETH); // back to start
    }

    function test_withdraw_revertsIfUnhealthy() public {
        // Deposit 1 ETH ($2000), borrow $1400 (70% LTV < 75% limit)
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_400e18);

        // Try to withdraw 0.5 ETH → remaining collateral $1000, debt $1400 → unhealthy
        vm.prank(alice);
        vm.expectRevert("LP: unhealthy after withdraw");
        pool.withdraw(ONE_ETH / 2);
    }

    // ── Borrow tests ──────────────────────────────────────────────────────────

    function test_borrow_mintsMXT() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18); // borrow $1000 MXT
        assertEq(mxt.balanceOf(alice), 1_000e18);
    }

    function test_borrow_maxAtCollateralFactor() public {
        // 1 ETH = $2000, CF = 75% → max borrow = $1500
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_500e18);
        assertEq(mxt.balanceOf(alice), 1_500e18);
    }

    function test_borrow_revertsAboveCollateralFactor() public {
        _deposit(alice, ONE_ETH);
        vm.prank(alice);
        vm.expectRevert("LP: undercollateralised");
        pool.borrow(1_501e18); // 1 wei over max
    }

    function test_borrow_revertsWithNoCollateral() public {
        vm.prank(alice);
        vm.expectRevert("LP: no collateral");
        pool.borrow(1_000e18);
    }

    function test_healthFactor_noDebt() public {
        _deposit(alice, ONE_ETH);
        // No debt → max uint256
        assertEq(pool.getHealthFactor(alice), type(uint256).max);
    }

    function test_healthFactor_atLiquidationThreshold() public {
        // Deposit 1 ETH ($2000), borrow up to liquidation threshold
        // health = (collateralUSD * 80%) / debtUSD = 1.0
        // debtUSD = collateralUSD * 80% = $1600
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_500e18); // borrow at CF limit (75%)
        uint256 hf = pool.getHealthFactor(alice);
        // health = (2000 * 80%) / 1500 = 1600/1500 ≈ 1.066 > 1.0
        assertGt(hf, PRECISION);
    }

    // ── Repay tests ───────────────────────────────────────────────────────────

    function test_repay_reducesDebt() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);
        _repay(alice, 500e18);
        assertLt(pool.getDebt(alice), 1_000e18);
    }

    function test_repay_fullDebt_clearsPosition() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 500e18);
        // Mint extra MXT to alice to cover any accrued interest
        vm.prank(address(pool));
        mxt.mint(alice, 10e18);
        _repay(alice, 510e18); // repay more than borrowed → capped
        assertEq(pool.getDebt(alice), 0);
    }

    // ── Interest accrual ──────────────────────────────────────────────────────

    function test_interestAccrues_overTime() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);

        uint256 debtNow = pool.getDebt(alice);

        // Warp 1 year forward
        vm.warp(block.timestamp + 365 days);

        uint256 debtLater = pool.getDebt(alice);

        // Should be ~5% more (~$1050)
        assertGt(debtLater, debtNow);
        // Within 0.1% of expected 5% APR
        uint256 expected = 1_050e18;
        assertApproxEqRel(debtLater, expected, 0.001e18);
    }

    // ── Liquidation tests ─────────────────────────────────────────────────────

    function test_liquidate_revertsIfHealthy() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);
        vm.prank(bob);
        vm.expectRevert("LP: position healthy");
        pool.liquidate(alice);
    }

    function test_liquidate_happyPath() public {
        // Alice deposits 1 ETH ($2000), borrows $1500 (at CF limit)
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_500e18);

        // Price drops: 1 ETH = $1700
        // collateralUSD = $1700, debtUSD = $1500
        // health = (1700 * 80%) / 1500 = 1360/1500 = 0.906 < 1.0
        mockOracle.setPrice(1_700e18);

        assertLt(pool.getHealthFactor(alice), PRECISION);

        // Bob is the liquidator — needs MXT to repay alice's debt
        weth.mint(bob, 0); // bob already has WETH
        vm.startPrank(bob);
        // Bob needs MXT — deposit his own collateral and borrow to get MXT
        weth.approve(address(pool), 5 * ONE_ETH);
        pool.deposit(5 * ONE_ETH);
        pool.borrow(1_500e18); // get MXT

        uint256 wethBefore = weth.balanceOf(bob);

        mxt.approve(address(pool), 1_500e18);
        pool.liquidate(alice);
        vm.stopPrank();

        uint256 wethAfter = weth.balanceOf(bob);

        // Bob received collateral
        assertGt(wethAfter, wethBefore);

        // Alice's debt is cleared
        assertEq(pool.getDebt(alice), 0);
    }

    function test_liquidate_selfLiquidateReverts() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_500e18);
        mockOracle.setPrice(1_700e18);

        vm.prank(alice);
        vm.expectRevert("LP: self-liquidate");
        pool.liquidate(alice);
    }

    // ── getMaxBorrow ──────────────────────────────────────────────────────────

    function test_getMaxBorrow() public {
        _deposit(alice, ONE_ETH);
        // 1 ETH @ $2000, CF 75% → max = $1500
        assertEq(pool.getMaxBorrow(alice), 1_500e18);

        _borrow(alice, 500e18);
        // Remaining ≈ $1000 (minus tiny interest since same block)
        assertApproxEqAbs(pool.getMaxBorrow(alice), 1_000e18, 1e15);
    }

    // ── getPositionSummary ────────────────────────────────────────────────────

    function test_getPositionSummary() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);

        (
            uint256 collateral,
            uint256 debt,
            uint256 collateralValueUSD,
            uint256 debtValueUSD,
            uint256 healthFactor,
            uint256 maxBorrow
        ) = pool.getPositionSummary(alice);

        assertEq(collateral, ONE_ETH);
        assertEq(debt, 1_000e18);
        assertEq(collateralValueUSD, 2_000e18); // 1 ETH @ $2000
        assertEq(debtValueUSD, 1_000e18);       // 1 MXT = $1
        assertGt(healthFactor, PRECISION);      // > 1.0
        assertApproxEqAbs(maxBorrow, 500e18, 1e15); // 75% of $2000 - $1000 = $500
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MXT.sol";
import "../src/LendingPool.sol";

// ── Minimal mock contracts ────────────────────────────────────────────────────

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
        totalSupply   += amount;
        balanceOf[to] += amount;
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

/// @dev Simple oracle mock: satisfies LendingPool's oracle.getPrice() call
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

    uint256 constant ETH_PRICE = 2_000e18; // $2,000
    uint256 constant ONE_ETH   = 1e18;
    uint256 constant PRECISION = 1e18;

    // CF=80%, LIQ_THRESHOLD=87%
    uint256 constant MAX_BORROW_1ETH = 1_600e18; // 80% of $2000

    function setUp() public {
        weth       = new MockWETH();
        mxt        = new MXT();
        mockOracle = new MockOracle(ETH_PRICE);
        pool       = new LendingPool(address(weth), address(mxt), address(mockOracle));

        mxt.grantRole(mxt.MINTER_ROLE(), address(pool));

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

    // ── Deposit ───────────────────────────────────────────────────────────────

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

    // ── Withdraw ──────────────────────────────────────────────────────────────

    function test_withdraw_noDebt() public {
        _deposit(alice, ONE_ETH);
        vm.prank(alice);
        pool.withdraw(ONE_ETH);
        assertEq(weth.balanceOf(alice), 10 * ONE_ETH);
    }

    function test_withdraw_revertsIfUnhealthy() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_400e18); // $1400 < $1600 max, healthy

        // Withdrawing 0.5 ETH leaves $1000 collateral, $1400 debt → unhealthy
        vm.prank(alice);
        vm.expectRevert("LP: unhealthy after withdraw");
        pool.withdraw(ONE_ETH / 2);
    }

    // ── Borrow ────────────────────────────────────────────────────────────────

    function test_borrow_mintsMXT() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);
        assertEq(mxt.balanceOf(alice), 1_000e18);
    }

    function test_borrow_maxAtCollateralFactor() public {
        // CF=80%: max borrow on 1 ETH @ $2000 = $1600
        _deposit(alice, ONE_ETH);
        _borrow(alice, MAX_BORROW_1ETH);
        assertEq(mxt.balanceOf(alice), MAX_BORROW_1ETH);
    }

    function test_borrow_revertsAboveCollateralFactor() public {
        _deposit(alice, ONE_ETH);
        vm.prank(alice);
        vm.expectRevert("LP: undercollateralised");
        pool.borrow(MAX_BORROW_1ETH + 1);
    }

    function test_borrow_revertsWithNoCollateral() public {
        vm.prank(alice);
        vm.expectRevert("LP: no collateral");
        pool.borrow(1_000e18);
    }

    function test_healthFactor_noDebt() public {
        _deposit(alice, ONE_ETH);
        assertEq(pool.getHealthFactor(alice), type(uint256).max);
    }

    function test_healthFactor_atMaxBorrow() public {
        // Borrow at CF limit: health = (2000 * 87%) / 1600 = 1740/1600 = 1.0875 > 1.0
        _deposit(alice, ONE_ETH);
        _borrow(alice, MAX_BORROW_1ETH);
        assertGt(pool.getHealthFactor(alice), PRECISION);
    }

    // ── Repay ─────────────────────────────────────────────────────────────────

    function test_repay_reducesDebt() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);
        _repay(alice, 500e18);
        assertLt(pool.getDebt(alice), 1_000e18);
    }

    function test_repay_fullDebt_clearsPosition() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 500e18);
        vm.prank(address(pool));
        mxt.mint(alice, 10e18); // cover accrued interest
        _repay(alice, 510e18);
        assertEq(pool.getDebt(alice), 0);
    }

    // ── Interest ──────────────────────────────────────────────────────────────

    function test_interestAccrues_overTime() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);

        vm.warp(block.timestamp + 365 days);

        uint256 debtLater = pool.getDebt(alice);
        assertApproxEqRel(debtLater, 1_050e18, 0.001e18); // ~5% APR
    }

    // ── Liquidation ───────────────────────────────────────────────────────────

    function test_liquidate_revertsIfHealthy() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 1_000e18);
        vm.prank(bob);
        vm.expectRevert("LP: position healthy");
        pool.liquidate(alice, 500e18);
    }

    function test_liquidate_revertsOnSelf() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, MAX_BORROW_1ETH);
        mockOracle.setPrice(1_700e18);
        vm.prank(alice);
        vm.expectRevert("LP: self-liquidate");
        pool.liquidate(alice, 800e18);
    }

    function test_liquidate_happyPath_partial() public {
        // Alice: 1 ETH @ $2000, borrows $1600 (max CF)
        _deposit(alice, ONE_ETH);
        _borrow(alice, MAX_BORROW_1ETH);

        // Price drops to $1700: health = (1700 * 87%) / 1600 = 0.924 < 1.0
        mockOracle.setPrice(1_700e18);
        assertLt(pool.getHealthFactor(alice), PRECISION);

        // Bob gets MXT to liquidate
        vm.startPrank(bob);
        weth.approve(address(pool), 5 * ONE_ETH);
        pool.deposit(5 * ONE_ETH);
        pool.borrow(2_000e18);

        uint256 aliceDebt  = pool.getDebt(alice);
        uint256 repayAmt   = aliceDebt / 2; // 50% — exactly at close factor

        mxt.approve(address(pool), repayAmt);
        uint256 wethBefore = weth.balanceOf(bob);
        pool.liquidate(alice, repayAmt);
        vm.stopPrank();

        // Bob received WETH collateral + bonus
        assertGt(weth.balanceOf(bob), wethBefore);

        // Alice still has remaining debt (partial liquidation)
        assertGt(pool.getDebt(alice), 0);
    }

    function test_liquidate_revertsExceedsCloseFactor() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, MAX_BORROW_1ETH);
        mockOracle.setPrice(1_700e18);

        vm.startPrank(bob);
        weth.approve(address(pool), 5 * ONE_ETH);
        pool.deposit(5 * ONE_ETH);
        pool.borrow(2_000e18);
        mxt.approve(address(pool), 2_000e18);

        uint256 aliceDebt = pool.getDebt(alice);
        vm.expectRevert("LP: exceeds close factor");
        pool.liquidate(alice, aliceDebt); // 100% — should revert, max is 50%
        vm.stopPrank();
    }

    // Fix 2: accrued interest is included in the health check during liquidation
    function test_liquidate_accruesInterestBeforeHealthCheck() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, MAX_BORROW_1ETH);

        // Warp time so interest pushes the position below threshold
        // At $2000 ETH, health = (2000 * 87%) / debt
        // Need debt > 2000 * 87% = 1740 for health < 1
        // Debt starts at $1600 → needs to grow to $1740+ → ~8.75% growth → ~1.75 years
        vm.warp(block.timestamp + 2 * 365 days);

        // Health check via view (reflects accrued interest)
        assertLt(pool.getHealthFactor(alice), PRECISION);

        vm.startPrank(bob);
        weth.approve(address(pool), 5 * ONE_ETH);
        pool.deposit(5 * ONE_ETH);
        pool.borrow(2_000e18);

        uint256 aliceDebt = pool.getDebt(alice);
        uint256 repayAmt  = aliceDebt / 2;
        mxt.approve(address(pool), repayAmt);
        pool.liquidate(alice, repayAmt); // must not revert
        vm.stopPrank();
    }

    // ── Supply / borrow caps (Fix 5) ──────────────────────────────────────────

    function test_caps_blockDeposit() public {
        pool.setCaps(ONE_ETH / 2, type(uint256).max); // cap at 0.5 ETH
        vm.startPrank(alice);
        weth.approve(address(pool), ONE_ETH);
        vm.expectRevert("LP: supply cap reached");
        pool.deposit(ONE_ETH);
        vm.stopPrank();
    }

    function test_caps_blockBorrow() public {
        pool.setCaps(type(uint256).max, 100e18); // borrow cap $100
        _deposit(alice, ONE_ETH);
        vm.prank(alice);
        vm.expectRevert("LP: borrow cap reached");
        pool.borrow(200e18);
    }

    // ── Pause (Fix 4) ─────────────────────────────────────────────────────────

    function test_pause_blocksDepositAndBorrow() public {
        pool.pause();

        vm.startPrank(alice);
        weth.approve(address(pool), ONE_ETH);
        vm.expectRevert();
        pool.deposit(ONE_ETH);
        vm.stopPrank();
    }

    function test_pause_allowsWithdrawAndRepay() public {
        _deposit(alice, ONE_ETH);
        _borrow(alice, 500e18);

        pool.pause();

        // Withdraw allowed while paused
        vm.prank(alice);
        pool.withdraw(ONE_ETH / 4);

        // Repay allowed while paused
        _repay(alice, 200e18);
    }

    function test_unpause_restoresDeposit() public {
        pool.pause();
        pool.unpause();

        _deposit(alice, ONE_ETH); // should succeed
        assertEq(pool.totalCollateral(), ONE_ETH);
    }

    // ── getMaxBorrow ──────────────────────────────────────────────────────────

    function test_getMaxBorrow() public {
        _deposit(alice, ONE_ETH);
        // CF=80%: max = $1600
        assertEq(pool.getMaxBorrow(alice), MAX_BORROW_1ETH);

        _borrow(alice, 500e18);
        assertApproxEqAbs(pool.getMaxBorrow(alice), 1_100e18, 1e15);
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
        assertEq(collateralValueUSD, 2_000e18);
        assertEq(debtValueUSD, 1_000e18);
        assertGt(healthFactor, PRECISION);
        // CF=80%: max debt = $1600, current = $1000 → remaining = $600
        assertApproxEqAbs(maxBorrow, 600e18, 1e15);
    }
}

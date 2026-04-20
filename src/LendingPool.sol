// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MXT.sol";
import "./PriceOracle.sol";

/// @title MaveriX LendingPool
/// @notice Deposit WETH as collateral, borrow MXT (synthetic dollar) against it.
///         Health factor = (collateralUSD * LIQ_THRESHOLD) / debtUSD
///         If health < 1.0 the position can be liquidated.
contract LendingPool is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ── Protocol parameters ───────────────────────────────────────────────────

    /// Maximum LTV before new borrows are blocked (80%)
    uint256 public constant COLLATERAL_FACTOR     = 80;
    /// LTV at which a position becomes liquidatable (87%)
    uint256 public constant LIQUIDATION_THRESHOLD = 87;
    /// Extra collateral bonus paid to liquidators (10%)
    uint256 public constant LIQUIDATION_BONUS     = 10;
    /// Fix 6: max fraction of a position's debt that can be repaid in one liquidation (50%)
    uint256 public constant CLOSE_FACTOR          = 50;
    /// 5% APR expressed as per-second multiplier in 1e18 precision
    uint256 public constant INTEREST_RATE_PER_SEC = 1_585_489_599;

    uint256 private constant PRECISION  = 1e18;
    uint256 private constant HEALTH_OK  = 1e18;

    // ── Immutables ────────────────────────────────────────────────────────────

    IERC20      public immutable weth;
    MXT         public immutable mxt;
    PriceOracle public immutable oracle;

    // ── Fix 5: supply / borrow caps (owner-settable) ──────────────────────────

    uint256 public maxTotalCollateral;
    uint256 public maxTotalBorrow;

    // ── State ─────────────────────────────────────────────────────────────────

    struct Position {
        uint256 collateral;  // WETH deposited (18 dec)
        uint256 borrowed;    // MXT principal borrowed (18 dec)
        uint256 lastUpdated; // block.timestamp of last state change
    }

    mapping(address => Position) public positions;

    uint256 public totalCollateral;
    uint256 public totalBorrowed;

    // ── Events ────────────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount, uint256 interest);
    event Liquidated(
        address indexed liquidator,
        address indexed borrower,
        uint256 debtRepaid,
        uint256 collateralSeized
    );
    event CapsUpdated(uint256 maxCollateral, uint256 maxBorrow);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _weth, address _mxt, address _oracle)
        Ownable(msg.sender)
    {
        require(_weth   != address(0), "LP: zero weth");
        require(_mxt    != address(0), "LP: zero mxt");
        require(_oracle != address(0), "LP: zero oracle");
        weth   = IERC20(_weth);
        mxt    = MXT(_mxt);
        oracle = PriceOracle(_oracle);

        // Default: uncapped — owner should set meaningful limits post-deploy
        maxTotalCollateral = type(uint256).max;
        maxTotalBorrow     = type(uint256).max;
    }

    // ── Owner controls ────────────────────────────────────────────────────────

    /// Fix 4: emergency pause — blocks deposit and borrow; withdraw/repay/liquidate remain open
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// Fix 5: update protocol-wide supply and borrow caps
    function setCaps(uint256 _maxCollateral, uint256 _maxBorrow) external onlyOwner {
        maxTotalCollateral = _maxCollateral;
        maxTotalBorrow     = _maxBorrow;
        emit CapsUpdated(_maxCollateral, _maxBorrow);
    }

    // ── Core protocol ─────────────────────────────────────────────────────────

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LP: zero amount");
        // Fix 5: supply cap
        require(totalCollateral + amount <= maxTotalCollateral, "LP: supply cap reached");

        weth.safeTransferFrom(msg.sender, address(this), amount);
        positions[msg.sender].collateral += amount;
        if (positions[msg.sender].lastUpdated == 0) {
            positions[msg.sender].lastUpdated = block.timestamp;
        }
        totalCollateral += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        Position storage pos = positions[msg.sender];
        require(amount > 0,               "LP: zero amount");
        require(pos.collateral >= amount, "LP: insufficient collateral");

        _accrueInterest(msg.sender);

        pos.collateral  -= amount;
        totalCollateral -= amount;

        if (pos.borrowed > 0) {
            require(_healthFactor(msg.sender) >= HEALTH_OK, "LP: unhealthy after withdraw");
        }

        weth.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function borrow(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LP: zero amount");
        Position storage pos = positions[msg.sender];
        require(pos.collateral > 0, "LP: no collateral");

        _accrueInterest(msg.sender);

        uint256 newDebt       = pos.borrowed + amount;
        uint256 maxBorrowable = (_collateralValue(msg.sender) * COLLATERAL_FACTOR) / 100;
        require(newDebt <= maxBorrowable, "LP: undercollateralised");

        // Fix 5: borrow cap
        require(totalBorrowed + amount <= maxTotalBorrow, "LP: borrow cap reached");

        pos.borrowed  += amount;
        totalBorrowed += amount;

        mxt.mint(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "LP: zero amount");
        Position storage pos = positions[msg.sender];
        require(pos.borrowed > 0, "LP: no debt");

        _accrueInterest(msg.sender);

        uint256 totalDebt = pos.borrowed;
        uint256 repayAmt  = amount > totalDebt ? totalDebt : amount;
        uint256 interest  = repayAmt > pos.borrowed ? repayAmt - pos.borrowed : 0;

        IERC20(address(mxt)).safeTransferFrom(msg.sender, address(this), repayAmt);
        mxt.burn(repayAmt);

        uint256 principalRepaid = repayAmt > interest ? repayAmt - interest : 0;
        pos.borrowed   = pos.borrowed > principalRepaid ? pos.borrowed - principalRepaid : 0;
        totalBorrowed  = totalBorrowed > principalRepaid ? totalBorrowed - principalRepaid : 0;

        emit Repaid(msg.sender, repayAmt, interest);
    }

    /// @notice Partially liquidate an unhealthy position.
    ///         Liquidator repays up to CLOSE_FACTOR% of the debt and receives
    ///         the equivalent WETH collateral plus a 10% bonus.
    /// @param borrower    Address of the position to liquidate.
    /// @param debtToRepay Amount of MXT debt to repay (must be <= 50% of total debt).
    function liquidate(address borrower, uint256 debtToRepay) external nonReentrant {
        require(borrower != msg.sender, "LP: self-liquidate");
        require(debtToRepay > 0,        "LP: zero repay");

        // Fix 2: accrue interest BEFORE the health check so the check reflects
        //        the true current debt (including unpaid interest).
        _accrueInterest(borrower);

        require(_healthFactor(borrower) < HEALTH_OK, "LP: position healthy");

        Position storage pos = positions[borrower];
        uint256 totalDebt = pos.borrowed;
        require(totalDebt > 0, "LP: no debt");

        // Fix 6: close factor — cap repayment at 50% of current debt per call.
        //        Partial liquidation keeps borrowers solvent gradually and prevents
        //        liquidators from extracting the full bonus on large positions at once.
        uint256 maxRepay = (totalDebt * CLOSE_FACTOR) / 100;
        require(debtToRepay <= maxRepay, "LP: exceeds close factor");

        uint256 ethPrice         = oracle.getPrice();
        uint256 debtInEth        = (debtToRepay * PRECISION) / ethPrice;
        uint256 bonusCollateral  = (debtInEth * LIQUIDATION_BONUS) / 100;
        uint256 collateralSeized = debtInEth + bonusCollateral;

        if (collateralSeized > pos.collateral) {
            collateralSeized = pos.collateral;
        }

        IERC20(address(mxt)).safeTransferFrom(msg.sender, address(this), debtToRepay);
        mxt.burn(debtToRepay);

        pos.collateral  -= collateralSeized;
        totalCollateral -= collateralSeized;
        totalBorrowed    = totalBorrowed > debtToRepay ? totalBorrowed - debtToRepay : 0;
        pos.borrowed     = pos.borrowed  > debtToRepay ? pos.borrowed  - debtToRepay : 0;

        weth.safeTransfer(msg.sender, collateralSeized);

        emit Liquidated(msg.sender, borrower, debtToRepay, collateralSeized);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getHealthFactor(address user) external view returns (uint256) {
        return _healthFactor(user);
    }

    function getDebt(address user) external view returns (uint256) {
        return _currentDebt(user);
    }

    function getCollateralValue(address user) external view returns (uint256) {
        return _collateralValue(user);
    }

    function getMaxBorrow(address user) external view returns (uint256) {
        uint256 collUSD  = _collateralValue(user);
        uint256 maxDebt  = (collUSD * COLLATERAL_FACTOR) / 100;
        uint256 currDebt = _currentDebt(user);
        return maxDebt > currDebt ? maxDebt - currDebt : 0;
    }

    function getPositionSummary(address user)
        external
        view
        returns (
            uint256 collateral,
            uint256 debt,
            uint256 collateralValueUSD,
            uint256 debtValueUSD,
            uint256 healthFactor,
            uint256 maxBorrow
        )
    {
        collateral         = positions[user].collateral;
        debt               = _currentDebt(user);
        collateralValueUSD = _collateralValue(user);
        debtValueUSD       = debt;
        healthFactor       = _healthFactor(user);
        uint256 maxDebt    = (collateralValueUSD * COLLATERAL_FACTOR) / 100;
        maxBorrow          = maxDebt > debt ? maxDebt - debt : 0;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _accrueInterest(address user) internal {
        Position storage pos = positions[user];
        if (pos.borrowed == 0 || pos.lastUpdated == 0) {
            pos.lastUpdated = block.timestamp;
            return;
        }
        uint256 elapsed  = block.timestamp - pos.lastUpdated;
        uint256 interest = (pos.borrowed * INTEREST_RATE_PER_SEC * elapsed) / PRECISION;
        pos.borrowed    += interest;
        totalBorrowed   += interest;
        pos.lastUpdated  = block.timestamp;
    }

    function _currentDebt(address user) internal view returns (uint256) {
        Position memory pos = positions[user];
        if (pos.borrowed == 0) return 0;
        uint256 elapsed  = block.timestamp - pos.lastUpdated;
        uint256 interest = (pos.borrowed * INTEREST_RATE_PER_SEC * elapsed) / PRECISION;
        return pos.borrowed + interest;
    }

    function _collateralValue(address user) internal view returns (uint256) {
        Position memory pos = positions[user];
        return (pos.collateral * oracle.getPrice()) / PRECISION;
    }

    function _healthFactor(address user) internal view returns (uint256) {
        uint256 debt = _currentDebt(user);
        if (debt == 0) return type(uint256).max;
        uint256 collUSD = _collateralValue(user);
        return (collUSD * LIQUIDATION_THRESHOLD * PRECISION) / (debt * 100);
    }
}

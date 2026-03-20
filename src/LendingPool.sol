// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MXT.sol";
import "./PriceOracle.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title MaveriX LendingPool
/// @notice Deposit WETH as collateral, borrow MXT (synthetic dollar) against it.
///         Health factor = (collateralUSD * LIQ_THRESHOLD) / debtUSD
///         If health < 1.0 the position can be liquidated.
contract LendingPool {

    // ── Protocol parameters ───────────────────────────────────────────────────

    /// Maximum LTV before new borrows are blocked (75%)
    uint256 public constant COLLATERAL_FACTOR    = 75;
    /// LTV at which a position becomes liquidatable (80%)
    uint256 public constant LIQUIDATION_THRESHOLD = 80;
    /// Extra collateral bonus paid to liquidators (10%)
    uint256 public constant LIQUIDATION_BONUS    = 10;
    /// 5% APR expressed as per-second multiplier in 1e18 precision
    /// = 0.05 / 31_536_000 * 1e18  ≈ 1_585_489_599
    uint256 public constant INTEREST_RATE_PER_SEC = 1_585_489_599;

    uint256 private constant PRECISION = 1e18;
    uint256 private constant HEALTH_OK = 1e18; // 1.0 in 18-dec

    // ── Immutables ────────────────────────────────────────────────────────────

    IERC20      public immutable weth;
    MXT         public immutable mxt;
    PriceOracle public immutable oracle;

    // ── State ─────────────────────────────────────────────────────────────────

    struct Position {
        uint256 collateral;  // WETH deposited (18 dec)
        uint256 borrowed;    // MXT principal borrowed (18 dec)
        uint256 lastUpdated; // block.timestamp of last state change
    }

    mapping(address => Position) public positions;

    uint256 public totalCollateral; // protocol-wide WETH deposited
    uint256 public totalBorrowed;   // protocol-wide MXT borrowed (principal)

    /// @dev Reentrancy lock: 1 = unlocked, 2 = locked
    uint256 private _locked = 1;

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

    // ── Reentrancy guard ──────────────────────────────────────────────────────

    modifier nonReentrant() {
        require(_locked == 1, "LP: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _weth, address _mxt, address _oracle) {
        require(_weth   != address(0), "LP: zero weth");
        require(_mxt    != address(0), "LP: zero mxt");
        require(_oracle != address(0), "LP: zero oracle");
        weth   = IERC20(_weth);
        mxt    = MXT(_mxt);
        oracle = PriceOracle(_oracle);
    }

    // ── Core protocol ─────────────────────────────────────────────────────────

    /// @notice Deposit WETH as collateral.
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "LP: zero amount");
        weth.transferFrom(msg.sender, address(this), amount);
        positions[msg.sender].collateral += amount;
        if (positions[msg.sender].lastUpdated == 0) {
            positions[msg.sender].lastUpdated = block.timestamp;
        }
        totalCollateral += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw WETH collateral (must remain healthy after).
    function withdraw(uint256 amount) external nonReentrant {
        Position storage pos = positions[msg.sender];
        require(amount > 0,               "LP: zero amount");
        require(pos.collateral >= amount, "LP: insufficient collateral");

        _accrueInterest(msg.sender);

        pos.collateral -= amount;
        totalCollateral -= amount;

        // Health check after removal
        if (pos.borrowed > 0) {
            require(_healthFactor(msg.sender) >= HEALTH_OK, "LP: unhealthy after withdraw");
        }

        weth.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Borrow MXT against deposited WETH collateral.
    function borrow(uint256 amount) external nonReentrant {
        require(amount > 0, "LP: zero amount");
        Position storage pos = positions[msg.sender];
        require(pos.collateral > 0, "LP: no collateral");

        _accrueInterest(msg.sender);

        // New debt must not exceed COLLATERAL_FACTOR of collateral value
        uint256 newDebt      = pos.borrowed + amount;
        uint256 maxBorrowable = (_collateralValue(msg.sender) * COLLATERAL_FACTOR) / 100;
        require(newDebt <= maxBorrowable, "LP: undercollateralised");

        pos.borrowed  += amount;
        totalBorrowed += amount;

        mxt.mint(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    /// @notice Repay MXT debt (full or partial).
    ///         Caller must have approved this contract to spend MXT.
    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "LP: zero amount");
        Position storage pos = positions[msg.sender];
        require(pos.borrowed > 0, "LP: no debt");

        _accrueInterest(msg.sender);

        uint256 totalDebt = pos.borrowed;
        uint256 repayAmt  = amount > totalDebt ? totalDebt : amount;
        uint256 interest  = repayAmt > pos.borrowed
            ? repayAmt - pos.borrowed // accrued portion
            : 0;

        // Pull MXT from caller and burn it
        mxt.transferFrom(msg.sender, address(this), repayAmt);
        mxt.burn(address(this), repayAmt);

        uint256 principalRepaid = repayAmt > interest ? repayAmt - interest : 0;
        pos.borrowed   = pos.borrowed > principalRepaid ? pos.borrowed - principalRepaid : 0;
        totalBorrowed  = totalBorrowed > principalRepaid ? totalBorrowed - principalRepaid : 0;

        emit Repaid(msg.sender, repayAmt, interest);
    }

    /// @notice Liquidate an unhealthy position.
    ///         Liquidator repays the full MXT debt and receives WETH
    ///         collateral + 10% bonus.
    function liquidate(address borrower) external nonReentrant {
        require(borrower != msg.sender, "LP: self-liquidate");
        require(_healthFactor(borrower) < HEALTH_OK, "LP: position healthy");

        _accrueInterest(borrower);

        Position storage pos = positions[borrower];
        uint256 debt = pos.borrowed;
        require(debt > 0, "LP: no debt");

        // Value of debt in ETH terms (1 MXT = $1)
        uint256 ethPrice       = oracle.getPrice(); // 18-dec USD per ETH
        uint256 debtInEth      = (debt * PRECISION) / ethPrice;
        uint256 bonusCollateral = (debtInEth * LIQUIDATION_BONUS) / 100;
        uint256 collateralSeized = debtInEth + bonusCollateral;

        // Cap seizure at available collateral
        if (collateralSeized > pos.collateral) {
            collateralSeized = pos.collateral;
        }

        // Liquidator burns the debt
        mxt.transferFrom(msg.sender, address(this), debt);
        mxt.burn(address(this), debt);

        // Transfer collateral to liquidator
        pos.collateral  -= collateralSeized;
        totalCollateral -= collateralSeized;
        totalBorrowed   = totalBorrowed > debt ? totalBorrowed - debt : 0;
        pos.borrowed    = 0;

        weth.transfer(msg.sender, collateralSeized);

        emit Liquidated(msg.sender, borrower, debt, collateralSeized);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /// @notice Health factor in 1e18 precision. Values < 1e18 are liquidatable.
    function getHealthFactor(address user) external view returns (uint256) {
        return _healthFactor(user);
    }

    /// @notice Current total debt (principal + accrued interest) in MXT (18 dec).
    function getDebt(address user) external view returns (uint256) {
        return _currentDebt(user);
    }

    /// @notice USD value of deposited collateral in 18-dec precision.
    function getCollateralValue(address user) external view returns (uint256) {
        return _collateralValue(user);
    }

    /// @notice Max additional MXT the user can borrow right now.
    function getMaxBorrow(address user) external view returns (uint256) {
        uint256 collUSD  = _collateralValue(user);
        uint256 maxDebt  = (collUSD * COLLATERAL_FACTOR) / 100;
        uint256 currDebt = _currentDebt(user);
        return maxDebt > currDebt ? maxDebt - currDebt : 0;
    }

    /// @notice Convenience: returns position + computed health in one call.
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
        collateral        = positions[user].collateral;
        debt              = _currentDebt(user);
        collateralValueUSD = _collateralValue(user);
        debtValueUSD      = debt; // 1 MXT = $1 in 18-dec
        healthFactor      = _healthFactor(user);
        uint256 maxDebt   = (collateralValueUSD * COLLATERAL_FACTOR) / 100;
        maxBorrow         = maxDebt > debt ? maxDebt - debt : 0;
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
        Position storage pos = positions[user];
        if (pos.borrowed == 0) return 0;
        uint256 elapsed  = block.timestamp - pos.lastUpdated;
        uint256 interest = (pos.borrowed * INTEREST_RATE_PER_SEC * elapsed) / PRECISION;
        return pos.borrowed + interest;
    }

    function _collateralValue(address user) internal view returns (uint256) {
        // ethPrice: 18-dec USD per 1 ETH
        // collateral: 18-dec ETH amount
        // result: 18-dec USD
        return (positions[user].collateral * oracle.getPrice()) / PRECISION;
    }

    function _healthFactor(address user) internal view returns (uint256) {
        uint256 debt = _currentDebt(user);
        if (debt == 0) return type(uint256).max; // no debt → perfectly healthy
        uint256 collUSD = _collateralValue(user);
        // health = (collUSD * LIQ_THRESHOLD / 100) / debtUSD
        return (collUSD * LIQUIDATION_THRESHOLD * PRECISION) / (debt * 100);
    }
}

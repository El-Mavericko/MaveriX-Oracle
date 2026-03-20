// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MaveriX Dollar (MXT)
/// @notice Collateral-backed synthetic dollar. 1 MXT = $1 by protocol design.
///         Only the LendingPool (minter) can mint or burn tokens.
contract MXT {
    string public constant name     = "MaveriX Dollar";
    string public constant symbol   = "MXT";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public owner;
    address public minter;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner_, address indexed spender, uint256 value);
    event MinterSet(address indexed minter);
    event OwnershipTransferred(address indexed prev, address indexed next);

    modifier onlyOwner()  { require(msg.sender == owner,  "MXT: not owner");  _; }
    modifier onlyMinter() { require(msg.sender == minter, "MXT: not minter"); _; }

    constructor() {
        owner = msg.sender;
    }

    // ── Owner admin ──────────────────────────────────────────────────────────

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
        emit MinterSet(_minter);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "MXT: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    // ── Minter (LendingPool) ─────────────────────────────────────────────────

    function mint(address to, uint256 amount) external onlyMinter {
        totalSupply     += amount;
        balanceOf[to]   += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyMinter {
        require(balanceOf[from] >= amount, "MXT: burn exceeds balance");
        balanceOf[from] -= amount;
        totalSupply     -= amount;
        emit Transfer(from, address(0), amount);
    }

    // ── ERC-20 ────────────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "MXT: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "MXT: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }
}

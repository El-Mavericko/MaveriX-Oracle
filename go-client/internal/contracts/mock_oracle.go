// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// MockOracleMetaData contains all meta data concerning the MockOracle contract.
var MockOracleMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"decimals\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"description\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRoundData\",\"inputs\":[{\"name\":\"roundId\",\"type\":\"uint80\",\"internalType\":\"uint80\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint80\",\"internalType\":\"uint80\"},{\"name\":\"\",\"type\":\"int256\",\"internalType\":\"int256\"},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"\",\"type\":\"uint80\",\"internalType\":\"uint80\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"latestRoundData\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint80\",\"internalType\":\"uint80\"},{\"name\":\"\",\"type\":\"int256\",\"internalType\":\"int256\"},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"\",\"type\":\"uint80\",\"internalType\":\"uint80\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"latestRoundId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint80\",\"internalType\":\"uint80\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"owner\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"rounds\",\"inputs\":[{\"name\":\"\",\"type\":\"uint80\",\"internalType\":\"uint80\"}],\"outputs\":[{\"name\":\"answer\",\"type\":\"int256\",\"internalType\":\"int256\"},{\"name\":\"startedAt\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"updatedAt\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"answeredInRound\",\"type\":\"uint80\",\"internalType\":\"uint80\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"updateAnswer\",\"inputs\":[{\"name\":\"newAnswer\",\"type\":\"int256\",\"internalType\":\"int256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"version\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"AnswerUpdated\",\"inputs\":[{\"name\":\"current\",\"type\":\"int256\",\"indexed\":true,\"internalType\":\"int256\"},{\"name\":\"roundId\",\"type\":\"uint80\",\"indexed\":true,\"internalType\":\"uint80\"},{\"name\":\"updatedAt\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false}]",
}

// MockOracleABI is the input ABI used to generate the binding from.
// Deprecated: Use MockOracleMetaData.ABI instead.
var MockOracleABI = MockOracleMetaData.ABI

// MockOracle is an auto generated Go binding around an Ethereum contract.
type MockOracle struct {
	MockOracleCaller     // Read-only binding to the contract
	MockOracleTransactor // Write-only binding to the contract
	MockOracleFilterer   // Log filterer for contract events
}

// MockOracleCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockOracleCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockOracleTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockOracleTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockOracleFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockOracleFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockOracleSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockOracleSession struct {
	Contract     *MockOracle       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MockOracleCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockOracleCallerSession struct {
	Contract *MockOracleCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// MockOracleTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockOracleTransactorSession struct {
	Contract     *MockOracleTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// MockOracleRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockOracleRaw struct {
	Contract *MockOracle // Generic contract binding to access the raw methods on
}

// MockOracleCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockOracleCallerRaw struct {
	Contract *MockOracleCaller // Generic read-only contract binding to access the raw methods on
}

// MockOracleTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockOracleTransactorRaw struct {
	Contract *MockOracleTransactor // Generic write-only contract binding to access the raw methods on
}

// NewMockOracle creates a new instance of MockOracle, bound to a specific deployed contract.
func NewMockOracle(address common.Address, backend bind.ContractBackend) (*MockOracle, error) {
	contract, err := bindMockOracle(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockOracle{MockOracleCaller: MockOracleCaller{contract: contract}, MockOracleTransactor: MockOracleTransactor{contract: contract}, MockOracleFilterer: MockOracleFilterer{contract: contract}}, nil
}

// NewMockOracleCaller creates a new read-only instance of MockOracle, bound to a specific deployed contract.
func NewMockOracleCaller(address common.Address, caller bind.ContractCaller) (*MockOracleCaller, error) {
	contract, err := bindMockOracle(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockOracleCaller{contract: contract}, nil
}

// NewMockOracleTransactor creates a new write-only instance of MockOracle, bound to a specific deployed contract.
func NewMockOracleTransactor(address common.Address, transactor bind.ContractTransactor) (*MockOracleTransactor, error) {
	contract, err := bindMockOracle(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockOracleTransactor{contract: contract}, nil
}

// NewMockOracleFilterer creates a new log filterer instance of MockOracle, bound to a specific deployed contract.
func NewMockOracleFilterer(address common.Address, filterer bind.ContractFilterer) (*MockOracleFilterer, error) {
	contract, err := bindMockOracle(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockOracleFilterer{contract: contract}, nil
}

// bindMockOracle binds a generic wrapper to an already deployed contract.
func bindMockOracle(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockOracleMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockOracle *MockOracleRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockOracle.Contract.MockOracleCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockOracle *MockOracleRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockOracle.Contract.MockOracleTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockOracle *MockOracleRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockOracle.Contract.MockOracleTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockOracle *MockOracleCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockOracle.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockOracle *MockOracleTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockOracle.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockOracle *MockOracleTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockOracle.Contract.contract.Transact(opts, method, params...)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockOracle *MockOracleCaller) Decimals(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "decimals")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockOracle *MockOracleSession) Decimals() (uint8, error) {
	return _MockOracle.Contract.Decimals(&_MockOracle.CallOpts)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockOracle *MockOracleCallerSession) Decimals() (uint8, error) {
	return _MockOracle.Contract.Decimals(&_MockOracle.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_MockOracle *MockOracleCaller) Description(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "description")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_MockOracle *MockOracleSession) Description() (string, error) {
	return _MockOracle.Contract.Description(&_MockOracle.CallOpts)
}

// Description is a free data retrieval call binding the contract method 0x7284e416.
//
// Solidity: function description() view returns(string)
func (_MockOracle *MockOracleCallerSession) Description() (string, error) {
	return _MockOracle.Contract.Description(&_MockOracle.CallOpts)
}

// GetRoundData is a free data retrieval call binding the contract method 0x9a6fc8f5.
//
// Solidity: function getRoundData(uint80 roundId) view returns(uint80, int256, uint256, uint256, uint80)
func (_MockOracle *MockOracleCaller) GetRoundData(opts *bind.CallOpts, roundId *big.Int) (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "getRoundData", roundId)

	if err != nil {
		return *new(*big.Int), *new(*big.Int), *new(*big.Int), *new(*big.Int), *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	out1 := *abi.ConvertType(out[1], new(*big.Int)).(**big.Int)
	out2 := *abi.ConvertType(out[2], new(*big.Int)).(**big.Int)
	out3 := *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)
	out4 := *abi.ConvertType(out[4], new(*big.Int)).(**big.Int)

	return out0, out1, out2, out3, out4, err

}

// GetRoundData is a free data retrieval call binding the contract method 0x9a6fc8f5.
//
// Solidity: function getRoundData(uint80 roundId) view returns(uint80, int256, uint256, uint256, uint80)
func (_MockOracle *MockOracleSession) GetRoundData(roundId *big.Int) (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	return _MockOracle.Contract.GetRoundData(&_MockOracle.CallOpts, roundId)
}

// GetRoundData is a free data retrieval call binding the contract method 0x9a6fc8f5.
//
// Solidity: function getRoundData(uint80 roundId) view returns(uint80, int256, uint256, uint256, uint80)
func (_MockOracle *MockOracleCallerSession) GetRoundData(roundId *big.Int) (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	return _MockOracle.Contract.GetRoundData(&_MockOracle.CallOpts, roundId)
}

// LatestRoundData is a free data retrieval call binding the contract method 0xfeaf968c.
//
// Solidity: function latestRoundData() view returns(uint80, int256, uint256, uint256, uint80)
func (_MockOracle *MockOracleCaller) LatestRoundData(opts *bind.CallOpts) (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "latestRoundData")

	if err != nil {
		return *new(*big.Int), *new(*big.Int), *new(*big.Int), *new(*big.Int), *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	out1 := *abi.ConvertType(out[1], new(*big.Int)).(**big.Int)
	out2 := *abi.ConvertType(out[2], new(*big.Int)).(**big.Int)
	out3 := *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)
	out4 := *abi.ConvertType(out[4], new(*big.Int)).(**big.Int)

	return out0, out1, out2, out3, out4, err

}

// LatestRoundData is a free data retrieval call binding the contract method 0xfeaf968c.
//
// Solidity: function latestRoundData() view returns(uint80, int256, uint256, uint256, uint80)
func (_MockOracle *MockOracleSession) LatestRoundData() (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	return _MockOracle.Contract.LatestRoundData(&_MockOracle.CallOpts)
}

// LatestRoundData is a free data retrieval call binding the contract method 0xfeaf968c.
//
// Solidity: function latestRoundData() view returns(uint80, int256, uint256, uint256, uint80)
func (_MockOracle *MockOracleCallerSession) LatestRoundData() (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	return _MockOracle.Contract.LatestRoundData(&_MockOracle.CallOpts)
}

// LatestRoundId is a free data retrieval call binding the contract method 0x11a8f413.
//
// Solidity: function latestRoundId() view returns(uint80)
func (_MockOracle *MockOracleCaller) LatestRoundId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "latestRoundId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// LatestRoundId is a free data retrieval call binding the contract method 0x11a8f413.
//
// Solidity: function latestRoundId() view returns(uint80)
func (_MockOracle *MockOracleSession) LatestRoundId() (*big.Int, error) {
	return _MockOracle.Contract.LatestRoundId(&_MockOracle.CallOpts)
}

// LatestRoundId is a free data retrieval call binding the contract method 0x11a8f413.
//
// Solidity: function latestRoundId() view returns(uint80)
func (_MockOracle *MockOracleCallerSession) LatestRoundId() (*big.Int, error) {
	return _MockOracle.Contract.LatestRoundId(&_MockOracle.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_MockOracle *MockOracleCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_MockOracle *MockOracleSession) Owner() (common.Address, error) {
	return _MockOracle.Contract.Owner(&_MockOracle.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_MockOracle *MockOracleCallerSession) Owner() (common.Address, error) {
	return _MockOracle.Contract.Owner(&_MockOracle.CallOpts)
}

// Rounds is a free data retrieval call binding the contract method 0x2ede662f.
//
// Solidity: function rounds(uint80 ) view returns(int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
func (_MockOracle *MockOracleCaller) Rounds(opts *bind.CallOpts, arg0 *big.Int) (struct {
	Answer          *big.Int
	StartedAt       *big.Int
	UpdatedAt       *big.Int
	AnsweredInRound *big.Int
}, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "rounds", arg0)

	outstruct := new(struct {
		Answer          *big.Int
		StartedAt       *big.Int
		UpdatedAt       *big.Int
		AnsweredInRound *big.Int
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Answer = *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	outstruct.StartedAt = *abi.ConvertType(out[1], new(*big.Int)).(**big.Int)
	outstruct.UpdatedAt = *abi.ConvertType(out[2], new(*big.Int)).(**big.Int)
	outstruct.AnsweredInRound = *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)

	return *outstruct, err

}

// Rounds is a free data retrieval call binding the contract method 0x2ede662f.
//
// Solidity: function rounds(uint80 ) view returns(int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
func (_MockOracle *MockOracleSession) Rounds(arg0 *big.Int) (struct {
	Answer          *big.Int
	StartedAt       *big.Int
	UpdatedAt       *big.Int
	AnsweredInRound *big.Int
}, error) {
	return _MockOracle.Contract.Rounds(&_MockOracle.CallOpts, arg0)
}

// Rounds is a free data retrieval call binding the contract method 0x2ede662f.
//
// Solidity: function rounds(uint80 ) view returns(int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
func (_MockOracle *MockOracleCallerSession) Rounds(arg0 *big.Int) (struct {
	Answer          *big.Int
	StartedAt       *big.Int
	UpdatedAt       *big.Int
	AnsweredInRound *big.Int
}, error) {
	return _MockOracle.Contract.Rounds(&_MockOracle.CallOpts, arg0)
}

// Version is a free data retrieval call binding the contract method 0x54fd4d50.
//
// Solidity: function version() view returns(uint256)
func (_MockOracle *MockOracleCaller) Version(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockOracle.contract.Call(opts, &out, "version")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Version is a free data retrieval call binding the contract method 0x54fd4d50.
//
// Solidity: function version() view returns(uint256)
func (_MockOracle *MockOracleSession) Version() (*big.Int, error) {
	return _MockOracle.Contract.Version(&_MockOracle.CallOpts)
}

// Version is a free data retrieval call binding the contract method 0x54fd4d50.
//
// Solidity: function version() view returns(uint256)
func (_MockOracle *MockOracleCallerSession) Version() (*big.Int, error) {
	return _MockOracle.Contract.Version(&_MockOracle.CallOpts)
}

// UpdateAnswer is a paid mutator transaction binding the contract method 0xa87a20ce.
//
// Solidity: function updateAnswer(int256 newAnswer) returns()
func (_MockOracle *MockOracleTransactor) UpdateAnswer(opts *bind.TransactOpts, newAnswer *big.Int) (*types.Transaction, error) {
	return _MockOracle.contract.Transact(opts, "updateAnswer", newAnswer)
}

// UpdateAnswer is a paid mutator transaction binding the contract method 0xa87a20ce.
//
// Solidity: function updateAnswer(int256 newAnswer) returns()
func (_MockOracle *MockOracleSession) UpdateAnswer(newAnswer *big.Int) (*types.Transaction, error) {
	return _MockOracle.Contract.UpdateAnswer(&_MockOracle.TransactOpts, newAnswer)
}

// UpdateAnswer is a paid mutator transaction binding the contract method 0xa87a20ce.
//
// Solidity: function updateAnswer(int256 newAnswer) returns()
func (_MockOracle *MockOracleTransactorSession) UpdateAnswer(newAnswer *big.Int) (*types.Transaction, error) {
	return _MockOracle.Contract.UpdateAnswer(&_MockOracle.TransactOpts, newAnswer)
}

// MockOracleAnswerUpdatedIterator is returned from FilterAnswerUpdated and is used to iterate over the raw logs and unpacked data for AnswerUpdated events raised by the MockOracle contract.
type MockOracleAnswerUpdatedIterator struct {
	Event *MockOracleAnswerUpdated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockOracleAnswerUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockOracleAnswerUpdated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockOracleAnswerUpdated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockOracleAnswerUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockOracleAnswerUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockOracleAnswerUpdated represents a AnswerUpdated event raised by the MockOracle contract.
type MockOracleAnswerUpdated struct {
	Current   *big.Int
	RoundId   *big.Int
	UpdatedAt *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterAnswerUpdated is a free log retrieval operation binding the contract event 0x5b196ccf306f345de8745dffeaf185f4cafe74a334e2b2466d04c880071533b9.
//
// Solidity: event AnswerUpdated(int256 indexed current, uint80 indexed roundId, uint256 updatedAt)
func (_MockOracle *MockOracleFilterer) FilterAnswerUpdated(opts *bind.FilterOpts, current []*big.Int, roundId []*big.Int) (*MockOracleAnswerUpdatedIterator, error) {

	var currentRule []interface{}
	for _, currentItem := range current {
		currentRule = append(currentRule, currentItem)
	}
	var roundIdRule []interface{}
	for _, roundIdItem := range roundId {
		roundIdRule = append(roundIdRule, roundIdItem)
	}

	logs, sub, err := _MockOracle.contract.FilterLogs(opts, "AnswerUpdated", currentRule, roundIdRule)
	if err != nil {
		return nil, err
	}
	return &MockOracleAnswerUpdatedIterator{contract: _MockOracle.contract, event: "AnswerUpdated", logs: logs, sub: sub}, nil
}

// WatchAnswerUpdated is a free log subscription operation binding the contract event 0x5b196ccf306f345de8745dffeaf185f4cafe74a334e2b2466d04c880071533b9.
//
// Solidity: event AnswerUpdated(int256 indexed current, uint80 indexed roundId, uint256 updatedAt)
func (_MockOracle *MockOracleFilterer) WatchAnswerUpdated(opts *bind.WatchOpts, sink chan<- *MockOracleAnswerUpdated, current []*big.Int, roundId []*big.Int) (event.Subscription, error) {

	var currentRule []interface{}
	for _, currentItem := range current {
		currentRule = append(currentRule, currentItem)
	}
	var roundIdRule []interface{}
	for _, roundIdItem := range roundId {
		roundIdRule = append(roundIdRule, roundIdItem)
	}

	logs, sub, err := _MockOracle.contract.WatchLogs(opts, "AnswerUpdated", currentRule, roundIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockOracleAnswerUpdated)
				if err := _MockOracle.contract.UnpackLog(event, "AnswerUpdated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseAnswerUpdated is a log parse operation binding the contract event 0x5b196ccf306f345de8745dffeaf185f4cafe74a334e2b2466d04c880071533b9.
//
// Solidity: event AnswerUpdated(int256 indexed current, uint80 indexed roundId, uint256 updatedAt)
func (_MockOracle *MockOracleFilterer) ParseAnswerUpdated(log types.Log) (*MockOracleAnswerUpdated, error) {
	event := new(MockOracleAnswerUpdated)
	if err := _MockOracle.contract.UnpackLog(event, "AnswerUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

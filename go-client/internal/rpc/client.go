package rpc

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Client wraps the Ethereum client with additional functionality
type Client struct {
	*ethclient.Client
}

// NewRPCClient creates a new RPC client connection
func NewRPCClient(rpcURL string) (*Client, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, err
	}

	return &Client{Client: client}, nil
}

// GetChainID retrieves the chain ID from the connected network
func (c *Client) GetChainID(ctx context.Context) (*big.Int, error) {
	chainID, err := c.NetworkID(ctx)
	if err != nil {
		return nil, err
	}
	return chainID, nil
}

// SendTransaction sends a signed transaction to the network
func (c *Client) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	return c.Client.SendTransaction(ctx, tx)
}

// GetTransactionReceipt retrieves the receipt for a transaction
func (c *Client) GetTransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	return c.Client.TransactionReceipt(ctx, txHash)
}

// GetBalance retrieves the balance of an account
func (c *Client) GetBalance(ctx context.Context, address common.Address) (*big.Int, error) {
	return c.Client.BalanceAt(ctx, address, nil)
}

// GetNonce retrieves the nonce for an account
func (c *Client) GetNonce(ctx context.Context, address common.Address) (uint64, error) {
	return c.Client.NonceAt(ctx, address, nil)
}

// EstimateGas estimates the gas needed for a transaction
func (c *Client) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	return c.Client.EstimateGas(ctx, msg)
}

// SuggestGasPrice suggests a gas price for transactions
func (c *Client) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	return c.Client.SuggestGasPrice(ctx)
}






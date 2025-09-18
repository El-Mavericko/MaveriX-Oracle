package reader

import (
	"context"
	"math/big"

	"github.com/114windd/oracle-client/internal/contracts"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Reader handles reading data from the MockOracle contract
type Reader struct {
	client *ethclient.Client
	oracle *contracts.MockOracle
}

// NewReader creates a new reader instance
func NewReader(client *ethclient.Client, contractAddress common.Address) (*Reader, error) {
	oracle, err := contracts.NewMockOracle(contractAddress, client)
	if err != nil {
		return nil, err
	}

	return &Reader{
		client: client,
		oracle: oracle,
	}, nil
}

// GetLatestPrice retrieves the latest price from the oracle
func (r *Reader) GetLatestPrice(ctx context.Context) (*big.Int, error) {
	_, answer, _, _, _, err := r.oracle.LatestRoundData(&bind.CallOpts{Context: ctx})
	if err != nil {
		return nil, err
	}

	// Return the answer (price) from the latest round
	return answer, nil
}

// GetLatestRoundData retrieves all latest round data
func (r *Reader) GetLatestRoundData(ctx context.Context) (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	return r.oracle.LatestRoundData(&bind.CallOpts{Context: ctx})
}

// GetRoundData retrieves data for a specific round
func (r *Reader) GetRoundData(ctx context.Context, roundId *big.Int) (*big.Int, *big.Int, *big.Int, *big.Int, *big.Int, error) {
	return r.oracle.GetRoundData(&bind.CallOpts{Context: ctx}, roundId)
}

// GetLatestRoundId retrieves the latest round ID
func (r *Reader) GetLatestRoundId(ctx context.Context) (*big.Int, error) {
	roundId, err := r.oracle.LatestRoundId(&bind.CallOpts{Context: ctx})
	if err != nil {
		return nil, err
	}
	return roundId, nil
}

// GetDecimals retrieves the decimals of the oracle
func (r *Reader) GetDecimals(ctx context.Context) (uint8, error) {
	return r.oracle.Decimals(&bind.CallOpts{Context: ctx})
}

// GetDescription retrieves the description of the oracle
func (r *Reader) GetDescription(ctx context.Context) (string, error) {
	return r.oracle.Description(&bind.CallOpts{Context: ctx})
}

// GetVersion retrieves the version of the oracle
func (r *Reader) GetVersion(ctx context.Context) (*big.Int, error) {
	return r.oracle.Version(&bind.CallOpts{Context: ctx})
}

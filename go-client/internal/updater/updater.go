package updater

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"math/big"

	"github.com/114windd/oracle-client/internal/contracts"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Updater handles updating the MockOracle contract
type Updater struct {
	client     *ethclient.Client
	oracle     *contracts.MockOracle
	privateKey *ecdsa.PrivateKey
	chainID    *big.Int
}

// NewUpdater creates a new updater instance
func NewUpdater(client *ethclient.Client, contractAddress common.Address, privateKeyHex string) (*Updater, error) {
	oracle, err := contracts.NewMockOracle(contractAddress, client)
	if err != nil {
		return nil, err
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, err
	}

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		return nil, err
	}

	return &Updater{
		client:     client,
		oracle:     oracle,
		privateKey: privateKey,
		chainID:    chainID,
	}, nil
}

// UpdatePrice updates the oracle with a new price
func (u *Updater) UpdatePrice(ctx context.Context, newAnswer *big.Int) (common.Hash, error) {
	// Get the public key from the private key
	publicKey := u.privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return common.Hash{}, errors.New("failed to get public key")
	}

	// Get the address from the public key
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// Get the nonce
	nonce, err := u.client.NonceAt(ctx, fromAddress, nil)
	if err != nil {
		return common.Hash{}, err
	}

	// Get gas price
	gasPrice, err := u.client.SuggestGasPrice(ctx)
	if err != nil {
		return common.Hash{}, err
	}

	// Create the transaction options
	auth, err := bind.NewKeyedTransactorWithChainID(u.privateKey, u.chainID)
	if err != nil {
		return common.Hash{}, err
	}

	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = 300000 // Set a reasonable gas limit
	auth.GasPrice = gasPrice

	// Call the updateAnswer function
	tx, err := u.oracle.UpdateAnswer(auth, newAnswer)
	if err != nil {
		return common.Hash{}, err
	}

	return tx.Hash(), nil
}

// GetOwner retrieves the owner of the oracle contract
func (u *Updater) GetOwner(ctx context.Context) (common.Address, error) {
	return u.oracle.Owner(&bind.CallOpts{Context: ctx})
}

// IsOwner checks if the current address is the owner
func (u *Updater) IsOwner(ctx context.Context) (bool, error) {
	owner, err := u.GetOwner(ctx)
	if err != nil {
		return false, err
	}

	publicKey := u.privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return false, errors.New("failed to get public key")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	return fromAddress == owner, nil
}

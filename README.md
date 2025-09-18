# Mock Oracle Client

A mock oracle data feed system that simulates a Chainlink v3 Aggregator using Solidity and a Go backend service.

## Project Structure

```
├── src/
│   ├── MockOracle.sol      # Oracle contract implementation
│   └── Interfaces.sol      # Chainlink-style interfaces
├── script/
│   ├── Deploy.s.sol        # Foundry deployment script
│   └── Update.s.sol        # Example updater script
├── test/
│   └── MockOracle.t.sol    # Foundry tests
├── go-client/
│   ├── cmd/server/main.go  # Go API server entrypoint
│   ├── internal/
│   │   ├── contracts/      # Go contract bindings
│   │   ├── rpc/           # RPC connection module
│   │   ├── reader/        # Read oracle data
│   │   └── updater/       # Update oracle data
│   ├── api/               # HTTP API handlers and middleware
│   └── config/            # Configuration management
├── deployments/
│   └── anvil.json         # Deployed contract addresses
└── foundry.toml           # Foundry configuration
```

## Features

### Smart Contract (Solidity)
- Mock Oracle that stores historical round data
- Chainlink-style functions: `latestRoundData()`, `getRoundData()`, `updateAnswer()`
- Access control for price updates
- Event emission for price changes

### Go Oracle Client
- RPC connection to Ethereum node
- Read latest and historical round data
- Send signed transactions to update prices
- HTTP API with authentication and rate limiting
- Health check endpoint

## Setup

### Prerequisites
- Foundry (for Solidity development)
- Go 1.23+ (for Go backend)
- Anvil (local Ethereum node)

### 1. Install Dependencies

```bash
# Install Foundry dependencies
forge install foundry-rs/forge-std

# Install Go dependencies
cd go-client
go mod tidy
```

### 2. Deploy Contract

```bash
# Start Anvil (in a separate terminal)
anvil

# Deploy the contract
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

### 3. Configure Environment

Create a `.env` file in the `go-client` directory with the following variables:

```bash
# Ethereum RPC URL
RPC_URL=http://localhost:8545

# Private key for signing transactions (without 0x prefix)
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Contract address (set after deployment)
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Server port
SERVER_PORT=8080

# API key for authentication (optional)
API_KEY=your_api_key_here
```

**Note:** The Go client will automatically load the `.env` file from the `go-client` directory. If the file doesn't exist, it will show a warning but continue running.

### 4. Run the Go Server

```bash
cd go-client
go run cmd/server/main.go
```

## API Endpoints

### GET /latestPrice
Returns the latest round data.

**Response:**
```json
{
  "roundId": 12,
  "answer": "200000000000",
  "startedAt": 1694981020,
  "updatedAt": 1694981020,
  "answeredInRound": 12
}
```

### GET /round/{id}
Returns data for a specific round.

**Response:**
```json
{
  "roundId": 10,
  "answer": "195000000000",
  "startedAt": 1694975020,
  "updatedAt": 1694975020,
  "answeredInRound": 10
}
```

### POST /updatePrice
Updates the oracle with a new price (requires authentication).

**Request:**
```json
{
  "newAnswer": "210000000000"
}
```

**Response:**
```json
{
  "txHash": "0x123abc...",
  "roundId": 13,
  "answer": "210000000000",
  "updatedAt": 1694983020
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "rpcConnected": true,
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
}
```

## Testing

### Solidity Tests
```bash
forge test
```

### Go Tests
```bash
cd go-client
go test ./...
```

## Security Features

- Access control for price updates (only contract owner)
- API authentication for protected endpoints
- Rate limiting to prevent abuse
- Input validation for all parameters
- Secure key management

## Development

### Adding New Features
1. Update the Solidity contract if needed
2. Regenerate Go bindings: `abigen --abi MockOracle.abi --pkg contracts --type MockOracle --out go-client/internal/contracts/mock_oracle.go`
3. Update Go modules as needed
4. Add tests for new functionality

### Deployment
1. Deploy contract to target network
2. Update deployment configuration
3. Set environment variables
4. Start the Go server

## License

MIT
# Simplified Oracle Client

A simplified, production-ready mock oracle system with retry logic, Redis caching, and Postgres persistence.

## Features

- **Retry Logic**: Exponential backoff for RPC calls and transactions
- **Redis Caching**: Fast response times with 10-second TTL
- **Postgres Persistence**: GORM-based data storage
- **Docker Compose**: 3-service stack (API, Redis, Postgres)

## Quick Start

1. **Set environment variables**:
```bash
export RPC_URL="http://localhost:8545"
export PRIVATE_KEY="your-private-key"
export CONTRACT_ADDRESS="your-contract-address"
export API_KEY="your-api-key"
```

2. **Start with Docker Compose**:
```bash
docker-compose up -d
```

3. **Test the API**:
```bash
curl http://localhost:8080/health
curl http://localhost:8080/latestPrice
```

## API Endpoints

- `GET /latestPrice` - Get latest price (cached)
- `GET /round/{id}` - Get specific round data (cached)
- `POST /updatePrice` - Update price (requires auth)
- `GET /health` - Health check for all services

## Architecture

```
Request → Redis Cache → Postgres DB → Ethereum RPC
```

Simple, direct flow with automatic fallbacks and caching.

## Configuration

All configuration via environment variables:

- `RPC_URL` - Ethereum RPC endpoint
- `PRIVATE_KEY` - Wallet private key
- `CONTRACT_ADDRESS` - Oracle contract address
- `API_KEY` - API authentication key
- `REDIS_ADDR` - Redis address (default: localhost:6379)
- `POSTGRES_HOST` - Postgres host (default: localhost)
- `POSTGRES_USER` - Postgres user (default: oracle)
- `POSTGRES_PASSWORD` - Postgres password (default: oracle)
- `POSTGRES_DB` - Postgres database (default: oracle_db)

## Development

```bash
# Run locally
cd go-client
go run cmd/server/main.go

# Build
go build ./cmd/server

# Test
go test ./...
```

## Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Code Structure

```
go-client/
├── internal/
│   ├── cache/     # Redis operations
│   ├── db/        # Postgres + GORM
│   ├── retry/     # Retry logic
│   ├── reader/    # Contract reads
│   └── updater/   # Contract writes
├── api/
│   └── handlers.go # HTTP handlers
├── config/
│   └── config.go   # Configuration
└── cmd/server/
    └── main.go     # Application entry
```

Simple, clean, and maintainable code following KISS principles.

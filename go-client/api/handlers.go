package api

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"github.com/114windd/oracle-client/internal/cache"
	"github.com/114windd/oracle-client/internal/db"
	"github.com/114windd/oracle-client/internal/reader"
	"github.com/114windd/oracle-client/internal/retry"
	"github.com/114windd/oracle-client/internal/updater"
	"github.com/ethereum/go-ethereum/common"
)

// RoundData represents round data
type RoundData struct {
	RoundID         uint64 `json:"roundId"`
	Answer          string `json:"answer"`
	StartedAt       int64  `json:"startedAt"`
	UpdatedAt       int64  `json:"updatedAt"`
	AnsweredInRound uint64 `json:"answeredInRound"`
}

// UpdatePriceRequest represents update price request
type UpdatePriceRequest struct {
	NewAnswer string `json:"newAnswer"`
}

// UpdatePriceResponse represents update price response
type UpdatePriceResponse struct {
	TxHash    string `json:"txHash"`
	RoundID   uint64 `json:"roundId"`
	Answer    string `json:"answer"`
	UpdatedAt int64  `json:"updatedAt"`
}

// HealthResponse represents health check response
type HealthResponse struct {
	Status            string `json:"status"`
	RPCConnected      bool   `json:"rpcConnected"`
	RedisConnected    bool   `json:"redisConnected"`
	PostgresConnected bool   `json:"postgresConnected"`
}

// API holds dependencies
type API struct {
	reader  *reader.Reader
	updater *updater.Updater
	cache   *cache.Cache
	db      *db.DB
}

// New creates a new API instance
func New(reader *reader.Reader, updater *updater.Updater, cache *cache.Cache, db *db.DB) *API {
	return &API{
		reader:  reader,
		updater: updater,
		cache:   cache,
		db:      db,
	}
}

// GetLatestPriceHandler handles GET /latestPrice
func (api *API) GetLatestPriceHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Try cache first
	if data, err := api.cache.Get(ctx, "latest"); err == nil && data != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
		return
	}

	// Try database
	if dbData, err := api.db.GetLatest(ctx); err == nil && dbData != nil {
		response := RoundData{
			RoundID:         dbData.RoundID,
			Answer:          dbData.Answer,
			StartedAt:       dbData.StartedAt.Unix(),
			UpdatedAt:       dbData.UpdatedAt.Unix(),
			AnsweredInRound: dbData.AnsweredInRound,
		}
		cacheData := &cache.RoundData{
			RoundID:         response.RoundID,
			Answer:          response.Answer,
			StartedAt:       response.StartedAt,
			UpdatedAt:       response.UpdatedAt,
			AnsweredInRound: response.AnsweredInRound,
		}
		api.cache.Set(ctx, "latest", cacheData, 10*time.Second)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Fallback to RPC with retry
	var response RoundData
	err := retry.Retry(ctx, func() error {
		roundId, answer, startedAt, updatedAt, answeredInRound, err := api.reader.GetLatestRoundData(ctx)
		if err != nil {
			return err
		}
		response = RoundData{
			RoundID:         roundId.Uint64(),
			Answer:          answer.String(),
			StartedAt:       startedAt.Int64(),
			UpdatedAt:       updatedAt.Int64(),
			AnsweredInRound: answeredInRound.Uint64(),
		}
		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get latest price: %v", err), http.StatusInternalServerError)
		return
	}

	// Cache and save to DB
	cacheData := &cache.RoundData{
		RoundID:         response.RoundID,
		Answer:          response.Answer,
		StartedAt:       response.StartedAt,
		UpdatedAt:       response.UpdatedAt,
		AnsweredInRound: response.AnsweredInRound,
	}
	api.cache.Set(ctx, "latest", cacheData, 10*time.Second)
	api.db.Save(ctx, &db.OracleRound{
		RoundID:         response.RoundID,
		Answer:          response.Answer,
		StartedAt:       time.Unix(response.StartedAt, 0),
		UpdatedAt:       time.Unix(response.UpdatedAt, 0),
		AnsweredInRound: response.AnsweredInRound,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetRoundDataHandler handles GET /round/{id}
func (api *API) GetRoundDataHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	roundIdStr := r.URL.Path[len("/round/"):]
	roundId, err := strconv.ParseUint(roundIdStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid round ID", http.StatusBadRequest)
		return
	}

	// Try cache first
	if data, err := api.cache.Get(ctx, "round:"+roundIdStr); err == nil && data != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
		return
	}

	// Try database
	if dbData, err := api.db.GetByRoundID(ctx, roundId); err == nil && dbData != nil {
		response := RoundData{
			RoundID:         dbData.RoundID,
			Answer:          dbData.Answer,
			StartedAt:       dbData.StartedAt.Unix(),
			UpdatedAt:       dbData.UpdatedAt.Unix(),
			AnsweredInRound: dbData.AnsweredInRound,
		}
		cacheData := &cache.RoundData{
			RoundID:         response.RoundID,
			Answer:          response.Answer,
			StartedAt:       response.StartedAt,
			UpdatedAt:       response.UpdatedAt,
			AnsweredInRound: response.AnsweredInRound,
		}
		api.cache.Set(ctx, "round:"+roundIdStr, cacheData, 10*time.Second)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Fallback to RPC with retry
	var response RoundData
	err = retry.Retry(ctx, func() error {
		roundIdBig := big.NewInt(int64(roundId))
		_, answer, startedAt, updatedAt, answeredInRound, err := api.reader.GetRoundData(ctx, roundIdBig)
		if err != nil {
			return err
		}
		response = RoundData{
			RoundID:         roundId,
			Answer:          answer.String(),
			StartedAt:       startedAt.Int64(),
			UpdatedAt:       updatedAt.Int64(),
			AnsweredInRound: answeredInRound.Uint64(),
		}
		return nil
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get round data: %v", err), http.StatusInternalServerError)
		return
	}

	// Cache and save to DB
	cacheData := &cache.RoundData{
		RoundID:         response.RoundID,
		Answer:          response.Answer,
		StartedAt:       response.StartedAt,
		UpdatedAt:       response.UpdatedAt,
		AnsweredInRound: response.AnsweredInRound,
	}
	api.cache.Set(ctx, "round:"+roundIdStr, cacheData, 10*time.Second)
	api.db.Save(ctx, &db.OracleRound{
		RoundID:         response.RoundID,
		Answer:          response.Answer,
		StartedAt:       time.Unix(response.StartedAt, 0),
		UpdatedAt:       time.Unix(response.UpdatedAt, 0),
		AnsweredInRound: response.AnsweredInRound,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdatePriceHandler handles POST /updatePrice
func (api *API) UpdatePriceHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req UpdatePriceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.NewAnswer == "" {
		http.Error(w, "newAnswer is required", http.StatusBadRequest)
		return
	}

	newAnswer, ok := new(big.Int).SetString(req.NewAnswer, 10)
	if !ok {
		http.Error(w, "Invalid newAnswer format", http.StatusBadRequest)
		return
	}

	// Check ownership
	isOwner, err := api.updater.IsOwner(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to check ownership: %v", err), http.StatusInternalServerError)
		return
	}

	if !isOwner {
		http.Error(w, "Unauthorized: Only contract owner can update price", http.StatusUnauthorized)
		return
	}

	// Update price with retry
	var txHash common.Hash
	err = retry.Retry(ctx, func() error {
		var err error
		txHash, err = api.updater.UpdatePrice(ctx, newAnswer)
		return err
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update price: %v", err), http.StatusInternalServerError)
		return
	}

	// Get updated data with retry
	var roundId, answer, startedAt, updatedAt, answeredInRound *big.Int
	err = retry.Retry(ctx, func() error {
		var err error
		roundId, answer, startedAt, updatedAt, answeredInRound, err = api.reader.GetLatestRoundData(ctx)
		return err
	})

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get updated data: %v", err), http.StatusInternalServerError)
		return
	}

	response := UpdatePriceResponse{
		TxHash:    txHash.Hex(),
		RoundID:   roundId.Uint64(),
		Answer:    answer.String(),
		UpdatedAt: updatedAt.Int64(),
	}

	// Invalidate cache and save to DB
	api.cache.Del(ctx, "latest")
	api.db.Save(ctx, &db.OracleRound{
		RoundID:         roundId.Uint64(),
		Answer:          answer.String(),
		StartedAt:       time.Unix(startedAt.Int64(), 0),
		UpdatedAt:       time.Unix(updatedAt.Int64(), 0),
		AnsweredInRound: answeredInRound.Uint64(),
		TxHash:          txHash.Hex(),
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HealthHandler handles GET /health
func (api *API) HealthHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	_, rpcErr := api.reader.GetLatestPrice(ctx)
	response := HealthResponse{
		Status:            "ok",
		RPCConnected:      rpcErr == nil,
		RedisConnected:    api.cache.Ping(ctx) == nil,
		PostgresConnected: api.db.Ping(ctx) == nil,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

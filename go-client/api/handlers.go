package api

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"

	"github.com/114windd/oracle-client/internal/reader"
	"github.com/114windd/oracle-client/internal/updater"
)

// RoundData represents the round data structure
type RoundData struct {
	RoundID         uint64 `json:"roundId"`
	Answer          string `json:"answer"`
	StartedAt       int64  `json:"startedAt"`
	UpdatedAt       int64  `json:"updatedAt"`
	AnsweredInRound uint64 `json:"answeredInRound"`
}

// UpdatePriceRequest represents the request to update price
type UpdatePriceRequest struct {
	NewAnswer string `json:"newAnswer"`
}

// UpdatePriceResponse represents the response after updating price
type UpdatePriceResponse struct {
	TxHash    string `json:"txHash"`
	RoundID   uint64 `json:"roundId"`
	Answer    string `json:"answer"`
	UpdatedAt int64  `json:"updatedAt"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status          string `json:"status"`
	RPCConnected    bool   `json:"rpcConnected"`
	ContractAddress string `json:"contractAddress"`
}

// API holds the dependencies for the API handlers
type API struct {
	reader  *reader.Reader
	updater *updater.Updater
}

// NewAPI creates a new API instance
func NewAPI(reader *reader.Reader, updater *updater.Updater) *API {
	return &API{
		reader:  reader,
		updater: updater,
	}
}

// GetLatestPriceHandler handles GET /latestPrice
func (api *API) GetLatestPriceHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	roundId, answer, startedAt, updatedAt, answeredInRound, err := api.reader.GetLatestRoundData(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get latest price: %v", err), http.StatusInternalServerError)
		return
	}

	response := RoundData{
		RoundID:         roundId.Uint64(),
		Answer:          answer.String(),
		StartedAt:       startedAt.Int64(),
		UpdatedAt:       updatedAt.Int64(),
		AnsweredInRound: answeredInRound.Uint64(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetRoundDataHandler handles GET /round/{id}
func (api *API) GetRoundDataHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract round ID from URL path
	roundIdStr := r.URL.Path[len("/round/"):]
	roundId, err := strconv.ParseUint(roundIdStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid round ID", http.StatusBadRequest)
		return
	}

	roundIdBig := big.NewInt(int64(roundId))
	_, answer, startedAt, updatedAt, answeredInRound, err := api.reader.GetRoundData(ctx, roundIdBig)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get round data: %v", err), http.StatusInternalServerError)
		return
	}

	response := RoundData{
		RoundID:         roundId,
		Answer:          answer.String(),
		StartedAt:       startedAt.Int64(),
		UpdatedAt:       updatedAt.Int64(),
		AnsweredInRound: answeredInRound.Uint64(),
	}

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

	// Check if the caller is the owner
	isOwner, err := api.updater.IsOwner(ctx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to check ownership: %v", err), http.StatusInternalServerError)
		return
	}

	if !isOwner {
		http.Error(w, "Unauthorized: Only contract owner can update price", http.StatusUnauthorized)
		return
	}

	// Update the price
	txHash, err := api.updater.UpdatePrice(ctx, newAnswer)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update price: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the latest round data after update
	roundId, answer, _, updatedAt, _, err := api.reader.GetLatestRoundData(ctx)
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HealthHandler handles GET /health
func (api *API) HealthHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Test RPC connection by getting latest round data
	_, err := api.reader.GetLatestPrice(ctx)
	rpcConnected := err == nil

	response := HealthResponse{
		Status:          "ok",
		RPCConnected:    rpcConnected,
		ContractAddress: "0x0000000000000000000000000000000000000000", // This should be set from config
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/114windd/oracle-client/api"
	"github.com/114windd/oracle-client/config"
	"github.com/114windd/oracle-client/internal/reader"
	"github.com/114windd/oracle-client/internal/updater"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Create Ethereum client
	client, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		log.Fatalf("Failed to connect to Ethereum client: %v", err)
	}
	defer client.Close()

	// Parse contract address
	contractAddress := common.HexToAddress(cfg.ContractAddress)

	// Create reader
	reader, err := reader.NewReader(client, contractAddress)
	if err != nil {
		log.Fatalf("Failed to create reader: %v", err)
	}

	// Create updater
	updater, err := updater.NewUpdater(client, contractAddress, cfg.PrivateKey)
	if err != nil {
		log.Fatalf("Failed to create updater: %v", err)
	}

	// Create API
	apiInstance := api.NewAPI(reader, updater)

	// Setup routes
	mux := http.NewServeMux()

	// Apply middleware
	handler := api.CORSMiddleware(
		api.LoggingMiddleware(
			api.RateLimitMiddleware(
				api.AuthMiddleware(cfg.APIKey)(
					setupRoutes(mux, apiInstance),
				),
			),
		),
	)

	// Create server
	server := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: handler,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %s", cfg.ServerPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

// setupRoutes configures the HTTP routes
func setupRoutes(mux *http.ServeMux, apiInstance *api.API) http.Handler {
	mux.HandleFunc("/latestPrice", apiInstance.GetLatestPriceHandler)
	mux.HandleFunc("/round/", apiInstance.GetRoundDataHandler)
	mux.HandleFunc("/updatePrice", apiInstance.UpdatePriceHandler)
	mux.HandleFunc("/health", apiInstance.HealthHandler)

	return mux
}

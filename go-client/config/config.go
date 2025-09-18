package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	RPCURL          string
	PrivateKey      string
	ContractAddress string
	ServerPort      string
	APIKey          string
}

// LoadConfig loads configuration from environment variables and .env file
func LoadConfig() (*Config, error) {
	// Try to load .env file from multiple possible locations
	envFiles := []string{".env", "../.env", "../../.env"}
	var loaded bool

	for _, envFile := range envFiles {
		if err := godotenv.Load(envFile); err == nil {
			log.Printf("Successfully loaded .env file from: %s", envFile)
			loaded = true
			break
		}
	}

	if !loaded {
		log.Printf("Warning: .env file not found in any of the expected locations")
	}

	config := &Config{
		RPCURL:          getEnv("RPC_URL", "http://localhost:8545"),
		PrivateKey:      getEnv("PRIVATE_KEY", ""),
		ContractAddress: getEnv("CONTRACT_ADDRESS", ""),
		ServerPort:      getEnv("SERVER_PORT", "8080"),
		APIKey:          getEnv("API_KEY", ""),
	}

	if config.PrivateKey == "" {
		return nil, fmt.Errorf("PRIVATE_KEY environment variable is required")
	}

	if config.ContractAddress == "" {
		return nil, fmt.Errorf("CONTRACT_ADDRESS environment variable is required")
	}

	return config, nil
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as integer with a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

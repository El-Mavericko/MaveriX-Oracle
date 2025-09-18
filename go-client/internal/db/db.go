package db

import (
	"context"
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// OracleRound represents oracle round data
type OracleRound struct {
	RoundID         uint64    `gorm:"primaryKey"`
	Answer          string    `gorm:"not null"`
	StartedAt       time.Time `gorm:"not null"`
	UpdatedAt       time.Time `gorm:"not null"`
	AnsweredInRound uint64    `gorm:"not null"`
	TxHash          string
}

// DB wraps GORM database
type DB struct {
	db *gorm.DB
}

// New creates a new database connection
func New(host, user, password, dbname, port string) (*DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		host, user, password, dbname, port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto-migrate
	if err := db.AutoMigrate(&OracleRound{}); err != nil {
		return nil, err
	}

	return &DB{db: db}, nil
}

// Close closes the database connection
func (d *DB) Close() error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Ping tests the database connection
func (d *DB) Ping(ctx context.Context) error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

// Save saves round data
func (d *DB) Save(ctx context.Context, round *OracleRound) error {
	return d.db.WithContext(ctx).Create(round).Error
}

// GetByRoundID retrieves round data by round ID
func (d *DB) GetByRoundID(ctx context.Context, roundId uint64) (*OracleRound, error) {
	var round OracleRound
	err := d.db.WithContext(ctx).Where("round_id = ?", roundId).First(&round).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &round, nil
}

// GetLatest retrieves the latest round data
func (d *DB) GetLatest(ctx context.Context) (*OracleRound, error) {
	var round OracleRound
	err := d.db.WithContext(ctx).Order("round_id DESC").First(&round).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &round, nil
}

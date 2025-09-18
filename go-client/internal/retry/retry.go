package retry

import (
	"context"
	"fmt"
	"math"
	"time"
)

// Retry executes a function with exponential backoff retry logic
func Retry(ctx context.Context, fn func() error) error {
	const maxAttempts = 3
	const baseDelay = 100 * time.Millisecond
	const maxDelay = 5 * time.Second
	const multiplier = 2.0

	var lastErr error

	for attempt := 0; attempt < maxAttempts; attempt++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Don't sleep on the last attempt
		if attempt == maxAttempts-1 {
			break
		}

		// Calculate delay with exponential backoff
		delay := time.Duration(float64(baseDelay) * math.Pow(multiplier, float64(attempt)))
		if delay > maxDelay {
			delay = maxDelay
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}

	return fmt.Errorf("retry failed after %d attempts: %w", maxAttempts, lastErr)
}

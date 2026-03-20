"use client";

import { useEffect, useState } from "react";
import type { PriceAlert } from "../types/oracle";

const STORAGE_KEY = "oracle_alerts";

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  // Hydrate from localStorage and request notification permission (SSR-safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAlerts(JSON.parse(saved));
    } catch {}

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  function addAlert(threshold: number, direction: "above" | "below") {
    setAlerts(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        threshold,
        direction,
        triggered: false,
        createdAt: Date.now(),
      },
    ]);
  }

  function removeAlert(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  function checkAlerts(currentPrice: number) {
    setAlerts(prev =>
      prev.map(alert => {
        if (alert.triggered) return alert;
        const crossed =
          (alert.direction === "above" && currentPrice > alert.threshold) ||
          (alert.direction === "below" && currentPrice < alert.threshold);
        if (crossed) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("MaveriX Oracle Alert", {
              body: `ETH is ${alert.direction} $${alert.threshold.toLocaleString()} — now $${currentPrice.toFixed(2)}`,
            });
          }
          return { ...alert, triggered: true };
        }
        return alert;
      })
    );
  }

  return { alerts, addAlert, removeAlert, checkAlerts };
}

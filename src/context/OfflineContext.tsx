import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { offlineStorage, OfflineStats } from "../services/offlineStorage";

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  stats: OfflineStats;
  syncNow: () => Promise<{ success: boolean; synced: number; errors: string[] }>;
  refreshCache: () => Promise<void>;
  isOfflineModeForced: boolean;
  toggleForceOffline: () => void;
  syncError: string | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnlineState, setIsOnlineState] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isOfflineModeForced, setIsOfflineModeForced] = useState<boolean>(() => {
    return localStorage.getItem("force_offline_mode") === "true";
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [stats, setStats] = useState<OfflineStats>({
    cachedActivities: 0,
    cachedSubmissions: 0,
    cachedLessonPlans: 0,
    pendingSyncCount: 0,
    lastSyncTime: null,
  });

  const effectiveOnline = isOnlineState && !isOfflineModeForced;

  const updateStats = useCallback(async () => {
    try {
      const currentStats = await offlineStorage.getOfflineStats();
      setStats(currentStats);
    } catch (e) {
      console.warn("Failed to load offline stats", e);
    }
  }, []);

  useEffect(() => {
    updateStats();

    const handleOnline = () => {
      setIsOnlineState(true);
      // Trigger auto-sync when network returns
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnlineState(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic stats update and sync check (every 30 seconds)
    const interval = setInterval(() => {
      updateStats();
      if (navigator.onLine && !isOfflineModeForced) {
        triggerSync();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOfflineModeForced, updateStats]);

  const triggerSync = async (): Promise<{ success: boolean; synced: number; errors: string[] }> => {
    if (!effectiveOnline || isSyncing) {
      return { success: false, synced: 0, errors: ["Device is offline or already syncing"] };
    }

    setIsSyncing(true);
    setSyncError(null);
    let syncedCount = 0;
    const errors: string[] = [];

    try {
      const queue = await offlineStorage.getSyncQueue();
      if (queue.length === 0) {
        await updateStats();
        setIsSyncing(false);
        return { success: true, synced: 0, errors: [] };
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setIsSyncing(false);
        return { success: false, synced: 0, errors: ["Not logged in"] };
      }

      for (const item of queue) {
        try {
          if (item.action === "SUBMISSION") {
            const res = await fetch("/api/submissions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(item.payload),
            });

            if (!res.ok) {
              const errTxt = await res.text();
              throw new Error(errTxt || `Server returned ${res.status}`);
            }

            if (item.id !== undefined) {
              await offlineStorage.removeSyncQueueItem(item.id, item.payload.localId);
            }
            syncedCount++;
          } else if (item.action === "LESSON_PLAN") {
            const res = await fetch("/api/lesson-plans", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(item.payload),
            });

            if (!res.ok) {
              const errTxt = await res.text();
              throw new Error(errTxt || `Server returned ${res.status}`);
            }

            if (item.id !== undefined) {
              await offlineStorage.removeSyncQueueItem(item.id, item.payload.localId);
            }
            syncedCount++;
          }
        } catch (itemErr: any) {
          console.warn(`Failed to sync item ${item.id}:`, itemErr);
          errors.push(itemErr.message || "Sync failed");
        }
      }

      await updateStats();
      return { success: errors.length === 0, synced: syncedCount, errors };
    } catch (e: any) {
      console.error("General sync failure:", e);
      setSyncError(e.message || "Failed to complete synchronization");
      return { success: false, synced: syncedCount, errors: [e.message] };
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshCache = async () => {
    const token = localStorage.getItem("token");
    if (!token || !effectiveOnline) return;

    try {
      const res = await fetch("/api/activities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const activities = await res.json();
        await offlineStorage.cacheActivities(activities);
      }

      const subRes = await fetch("/api/submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subRes.ok) {
        const subs = await subRes.json();
        await offlineStorage.cacheSubmissions(subs);
      }

      await updateStats();
    } catch (err) {
      console.warn("Failed to refresh offline cache:", err);
    }
  };

  const toggleForceOffline = () => {
    const nextState = !isOfflineModeForced;
    setIsOfflineModeForced(nextState);
    localStorage.setItem("force_offline_mode", String(nextState));
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline: effectiveOnline,
        isSyncing,
        stats,
        syncNow: triggerSync,
        refreshCache,
        isOfflineModeForced,
        toggleForceOffline,
        syncError,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
};

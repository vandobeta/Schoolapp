import { Activity, Submission } from "../types";

const DB_NAME = "GEDE_Masterpiece_Offline_DB";
const DB_VERSION = 2;

export interface SyncQueueItem {
  id?: number;
  action: "SUBMISSION" | "LESSON_PLAN" | "ACTIVITY";
  payload: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface OfflineStats {
  cachedActivities: number;
  cachedSubmissions: number;
  cachedLessonPlans: number;
  pendingSyncCount: number;
  lastSyncTime: string | null;
}

class OfflineStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isSupported: boolean = typeof window !== "undefined" && "indexedDB" in window;

  private openDB(): Promise<IDBDatabase> {
    if (!this.isSupported) {
      return Promise.reject(new Error("IndexedDB is not supported in this browser environment."));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Activities store
          if (!db.objectStoreNames.contains("activities")) {
            const actStore = db.createObjectStore("activities", { keyPath: "id" });
            actStore.createIndex("subjectId", "subjectId", { unique: false });
            actStore.createIndex("class", "class", { unique: false });
          }

          // Submissions store (both online synced and offline queued)
          if (!db.objectStoreNames.contains("submissions")) {
            const subStore = db.createObjectStore("submissions", { keyPath: "localId" });
            subStore.createIndex("studentId", "studentId", { unique: false });
            subStore.createIndex("aoiId", "aoiId", { unique: false });
            subStore.createIndex("synced", "synced", { unique: false });
          }

          // Lesson plans store for teachers
          if (!db.objectStoreNames.contains("lesson_plans")) {
            const lpStore = db.createObjectStore("lesson_plans", { keyPath: "localId" });
            lpStore.createIndex("teacherId", "teacherId", { unique: false });
            lpStore.createIndex("subjectId", "subjectId", { unique: false });
          }

          // Synchronization queue for write operations performed offline
          if (!db.objectStoreNames.contains("sync_queue")) {
            const queueStore = db.createObjectStore("sync_queue", { keyPath: "id", autoIncrement: true });
            queueStore.createIndex("action", "action", { unique: false });
            queueStore.createIndex("createdAt", "createdAt", { unique: false });
          }

          // Metadata key-value store
          if (!db.objectStoreNames.contains("meta")) {
            db.createObjectStore("meta", { keyPath: "key" });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error("Failed to open IndexedDB"));
        };
      });
    }

    return this.dbPromise;
  }

  // --- ACTIVITIES ---

  async cacheActivities(activities: Activity[]): Promise<void> {
    if (!this.isSupported || !activities || activities.length === 0) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction(["activities", "meta"], "readwrite");
      const actStore = tx.objectStore("activities");

      for (const act of activities) {
        actStore.put(act);
      }

      const metaStore = tx.objectStore("meta");
      metaStore.put({ key: "lastActivitiesSync", timestamp: new Date().toISOString(), count: activities.length });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("[IndexedDB] Failed to cache activities:", err);
      // Fallback to localStorage
      try {
        localStorage.setItem("gede_cached_activities", JSON.stringify(activities));
      } catch (e) {}
    }
  }

  async getCachedActivities(): Promise<Activity[]> {
    if (!this.isSupported) {
      try {
        const raw = localStorage.getItem("gede_cached_activities");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction("activities", "readonly");
      const store = tx.objectStore("activities");
      const req = store.getAll();

      return new Promise<Activity[]>((resolve) => {
        req.onsuccess = () => {
          const res = req.result || [];
          if (res.length === 0) {
            // Check fallback
            try {
              const raw = localStorage.getItem("gede_cached_activities");
              if (raw) resolve(JSON.parse(raw));
              else resolve([]);
            } catch {
              resolve([]);
            }
          } else {
            resolve(res);
          }
        };
        req.onerror = () => {
          resolve([]);
        };
      });
    } catch (err) {
      console.warn("[IndexedDB] Failed to read cached activities:", err);
      return [];
    }
  }

  // --- SUBMISSIONS ---

  async cacheSubmissions(submissions: Submission[]): Promise<void> {
    if (!this.isSupported || !submissions) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction("submissions", "readwrite");
      const store = tx.objectStore("submissions");

      for (const sub of submissions) {
        const localRecord = {
          ...sub,
          localId: `server_${sub.id}`,
          synced: 1,
          cachedAt: new Date().toISOString(),
        };
        store.put(localRecord);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("[IndexedDB] Failed to cache submissions:", err);
    }
  }

  async getCachedSubmissions(studentId?: string): Promise<Submission[]> {
    if (!this.isSupported) return [];
    try {
      const db = await this.openDB();
      const tx = db.transaction("submissions", "readonly");
      const store = tx.objectStore("submissions");
      const req = store.getAll();

      return new Promise<Submission[]>((resolve) => {
        req.onsuccess = () => {
          let list = (req.result || []) as (Submission & { localId: string; synced?: number })[];
          if (studentId) {
            list = list.filter((s) => s.studentId === studentId);
          }
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // Save submission created in offline / low-connectivity environment
  async queueOfflineSubmission(submission: {
    aoiId: number;
    content: string;
    engagementTime?: number;
    plagiarismRisk?: string;
    studentId: string;
    studentName?: string;
    activityTitle?: string;
  }): Promise<{ localId: string; queued: boolean }> {
    const localId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const offlineSubmissionRecord = {
      id: 0, // placeholder until server assigns permanent id
      localId,
      aoiId: submission.aoiId,
      studentId: submission.studentId,
      studentName: submission.studentName || "Me",
      content: submission.content,
      engagementTime: submission.engagementTime || 0,
      plagiarismRisk: submission.plagiarismRisk || "low",
      grade: null,
      feedback: "Queued offline in local storage. Will automatically sync when reconnected.",
      isCorrected: false,
      isMarked: false,
      dnaVerified: false,
      timestamp: now,
      synced: 0,
      isOfflineDraft: true,
      activityTitle: submission.activityTitle || "Curriculum Activity",
    };

    if (this.isSupported) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(["submissions", "sync_queue"], "readwrite");

        // Put in local submissions cache so UI renders it immediately
        tx.objectStore("submissions").put(offlineSubmissionRecord);

        // Put in sync queue
        const queueItem: SyncQueueItem = {
          action: "SUBMISSION",
          payload: {
            localId,
            aoiId: submission.aoiId,
            content: submission.content,
            engagementTime: submission.engagementTime || 0,
            plagiarismRisk: submission.plagiarismRisk || "low",
            studentId: submission.studentId,
          },
          createdAt: now,
          retryCount: 0,
        };
        tx.objectStore("sync_queue").add(queueItem);

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        return { localId, queued: true };
      } catch (err) {
        console.error("[IndexedDB] Error queueing offline submission:", err);
      }
    }

    // LocalStorage fallback
    try {
      const existingQueue = JSON.parse(localStorage.getItem("gede_offline_queue") || "[]");
      existingQueue.push({
        localId,
        action: "SUBMISSION",
        payload: submission,
        createdAt: now,
      });
      localStorage.setItem("gede_offline_queue", JSON.stringify(existingQueue));
      return { localId, queued: true };
    } catch (e) {
      throw new Error("Unable to save offline submission. Please check device storage.");
    }
  }

  // --- LESSON PLANS ---

  async cacheLessonPlans(plans: any[]): Promise<void> {
    if (!this.isSupported || !plans) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction("lesson_plans", "readwrite");
      const store = tx.objectStore("lesson_plans");

      for (const plan of plans) {
        store.put({
          ...plan,
          localId: `plan_${plan.id}`,
          synced: 1,
        });
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("[IndexedDB] Failed to cache lesson plans:", err);
    }
  }

  async getCachedLessonPlans(teacherId?: string): Promise<any[]> {
    if (!this.isSupported) return [];
    try {
      const db = await this.openDB();
      const tx = db.transaction("lesson_plans", "readonly");
      const store = tx.objectStore("lesson_plans");
      const req = store.getAll();

      return new Promise<any[]>((resolve) => {
        req.onsuccess = () => {
          let list = req.result || [];
          if (teacherId) {
            list = list.filter((p) => p.teacherId === teacherId);
          }
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async queueOfflineLessonPlan(plan: {
    subjectId: number;
    class: string;
    topic: string;
    competencyOutcome: string;
    duration: string;
    content: string;
    subjectName?: string;
  }): Promise<{ localId: string; queued: boolean }> {
    const localId = `plan_offline_${Date.now()}`;
    const now = new Date().toISOString();

    const planRecord = {
      ...plan,
      id: 0,
      localId,
      timestamp: now,
      synced: 0,
      isOfflineDraft: true,
    };

    if (this.isSupported) {
      try {
        const db = await this.openDB();
        const tx = db.transaction(["lesson_plans", "sync_queue"], "readwrite");
        tx.objectStore("lesson_plans").put(planRecord);

        const queueItem: SyncQueueItem = {
          action: "LESSON_PLAN",
          payload: { ...plan, localId },
          createdAt: now,
          retryCount: 0,
        };
        tx.objectStore("sync_queue").add(queueItem);

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        return { localId, queued: true };
      } catch (err) {
        console.error("[IndexedDB] Error queueing offline lesson plan:", err);
      }
    }

    return { localId, queued: false };
  }

  // --- SYNC QUEUE MANAGEMENT ---

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.isSupported) {
      try {
        return JSON.parse(localStorage.getItem("gede_offline_queue") || "[]");
      } catch {
        return [];
      }
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction("sync_queue", "readonly");
      const req = tx.objectStore("sync_queue").getAll();

      return new Promise<SyncQueueItem[]>((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async removeSyncQueueItem(id: number, localId?: string): Promise<void> {
    if (!this.isSupported) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction(["sync_queue", "submissions", "lesson_plans"], "readwrite");
      tx.objectStore("sync_queue").delete(id);

      if (localId) {
        // Mark local submission as synced if present
        try {
          const subStore = tx.objectStore("submissions");
          const subReq = subStore.get(localId);
          subReq.onsuccess = () => {
            if (subReq.result) {
              const updated = { ...subReq.result, synced: 1, isOfflineDraft: false };
              subStore.put(updated);
            }
          };
        } catch (e) {}

        // Mark local lesson plan as synced if present
        try {
          const lpStore = tx.objectStore("lesson_plans");
          const lpReq = lpStore.get(localId);
          lpReq.onsuccess = () => {
            if (lpReq.result) {
              const updated = { ...lpReq.result, synced: 1, isOfflineDraft: false };
              lpStore.put(updated);
            }
          };
        } catch (e) {}
      }

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (err) {
      console.warn("Failed to remove sync queue item:", err);
    }
  }

  async getOfflineStats(): Promise<OfflineStats> {
    const stats: OfflineStats = {
      cachedActivities: 0,
      cachedSubmissions: 0,
      cachedLessonPlans: 0,
      pendingSyncCount: 0,
      lastSyncTime: null,
    };

    if (!this.isSupported) {
      return stats;
    }

    try {
      const db = await this.openDB();
      const tx = db.transaction(["activities", "submissions", "lesson_plans", "sync_queue", "meta"], "readonly");

      const actCountReq = tx.objectStore("activities").count();
      const subCountReq = tx.objectStore("submissions").count();
      const lpCountReq = tx.objectStore("lesson_plans").count();
      const queueCountReq = tx.objectStore("sync_queue").count();
      const metaReq = tx.objectStore("meta").get("lastActivitiesSync");

      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });

      stats.cachedActivities = actCountReq.result || 0;
      stats.cachedSubmissions = subCountReq.result || 0;
      stats.cachedLessonPlans = lpCountReq.result || 0;
      stats.pendingSyncCount = queueCountReq.result || 0;
      stats.lastSyncTime = metaReq.result?.timestamp || null;

      return stats;
    } catch {
      return stats;
    }
  }

  async clearAllCache(): Promise<void> {
    if (!this.isSupported) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction(["activities", "submissions", "lesson_plans", "sync_queue", "meta"], "readwrite");
      tx.objectStore("activities").clear();
      tx.objectStore("submissions").clear();
      tx.objectStore("lesson_plans").clear();
      tx.objectStore("sync_queue").clear();
      tx.objectStore("meta").clear();
    } catch (err) {
      console.error("Failed to clear offline cache:", err);
    }
  }
}

export const offlineStorage = new OfflineStorageManager();

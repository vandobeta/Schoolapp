import { User, Activity, Submission, Subject, School } from "../types";
import { offlineStorage } from "./offlineStorage";

const API_BASE = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
};

const parseResponseError = async (res: Response, defaultMessage: string): Promise<string> => {
  try {
    const data = await res.json();
    return data.error || data.message || defaultMessage;
  } catch {
    try {
      const text = await res.text();
      return text || defaultMessage;
    } catch {
      return defaultMessage;
    }
  }
};

export const api = {
  auth: {
    resolve: async (institutionalId: string) => {
      const res = await fetch(`${API_BASE}/auth/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionalId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    register: async (data: any) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    login: async (data: any) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  },
  users: {
    getPending: async (): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/users/pending`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch pending users");
      return res.json();
    },
    approve: async (uid: string, welcomeNote: string) => {
      const res = await fetch(`${API_BASE}/users/approve`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ uid, welcomeNote }),
      });
      if (!res.ok) throw new Error("Failed to approve user");
      return res.json();
    },
    getAll: async (): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/users/all`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch all users");
      return res.json();
    },
    promote: async (uid: string, role: string, schoolCode: string) => {
      const res = await fetch(`${API_BASE}/users/promote`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ uid, role, schoolCode }),
      });
      if (!res.ok) throw new Error("Failed to promote user");
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/users/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create user");
      return res.json();
    },
    updateStatus: async (uid: string, status: string) => {
      const res = await fetch(`${API_BASE}/admin/users/update-status`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ uid, status }),
      });
      if (!res.ok) throw new Error("Failed to update user status");
      return res.json();
    },
    delete: async (uid: string) => {
      const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    enrollDna: async (vectorData: string) => {
      const res = await fetch(`${API_BASE}/users/dna-enroll`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ vectorData }),
      });
      if (!res.ok) throw new Error("Failed to enroll DNA");
      return res.json();
    },
  },
  schools: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/schools`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch schools");
      return res.json();
    },
    getTeacherSchools: async () => {
      const res = await fetch(`${API_BASE}/teacher/schools`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch teacher schools");
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/schools/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create school");
      return res.json();
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/schools/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete school");
      return res.json();
    },
    getUsers: async (code: string) => {
      const res = await fetch(`${API_BASE}/admin/schools/${code}/users`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch school users");
      return res.json();
    },
    affiliateTeacher: async (teacherUid: string, schoolId: number) => {
      const res = await fetch(`${API_BASE}/admin/teachers/affiliate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ teacherUid, schoolId }),
      });
      if (!res.ok) throw new Error("Failed to affiliate teacher");
      return res.json();
    },
  },
  teacher: {
    getStudents: async () => {
      const res = await fetch(`${API_BASE}/teacher/students`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    getEnrollments: async () => {
      const res = await fetch(`${API_BASE}/teacher/enrollments`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    },
    enroll: async (data: { studentUid: string, subjectId: number, studentClass: string }) => {
      const res = await fetch(`${API_BASE}/teacher/enroll`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to enroll student");
      return res.json();
    },
    removeEnrollment: async (id: number) => {
      const res = await fetch(`${API_BASE}/teacher/enrollments/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove enrollment");
      return res.json();
    },
  },
  student: {
    getSubjects: async () => {
      const res = await fetch(`${API_BASE}/student/subjects`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
    getRecommendations: async () => {
      const res = await fetch(`${API_BASE}/student/recommendations`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
    getPurchases: async () => {
      const res = await fetch(`${API_BASE}/student/purchases`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
    getLearningCurve: async () => {
      const res = await fetch(`${API_BASE}/student/learning-curve`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch learning curve");
      return res.json();
    },
    getTimetable: async () => {
      const res = await fetch(`${API_BASE}/timetable`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      return res.json();
    },
  },
  admin: {
    getUnebExport: async () => {
      const res = await fetch(`${API_BASE}/admin/uneb-export`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch UNEB export data");
      return res.json();
    },
    getStats: async () => {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      return res.json();
    },
    exportUsers: async () => {
      const res = await fetch(`${API_BASE}/admin/users/export`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to export users");
      return res.json();
    },
    exportSchools: async () => {
      const res = await fetch(`${API_BASE}/admin/schools/export`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to export schools");
      return res.json();
    },
    seed: async () => {
      const res = await fetch(`${API_BASE}/admin/seed`, { method: "POST", headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to seed database");
      return res.json();
    },
    addTimetable: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/timetable`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add timetable entry");
      return res.json();
    },
    removeTimetable: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/timetable/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove timetable entry");
      return res.json();
    },
  },
  messages: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/messages`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    send: async (data: { 
      recipientId: string, 
      content: string, 
      type: string, 
      isAnonymous?: boolean, 
      isViewOnce?: boolean 
    }) => {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    markAsViewed: async (id: number) => {
      const res = await fetch(`${API_BASE}/messages/${id}/view`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark message as viewed");
      return res.json();
    },
  },
  activities: {
    getAll: async (): Promise<Activity[]> => {
      const isForcedOffline = localStorage.getItem("force_offline_mode") === "true";
      if ((typeof navigator !== "undefined" && !navigator.onLine) || isForcedOffline) {
        const cached = await offlineStorage.getCachedActivities();
        return cached;
      }
      try {
        const res = await fetch(`${API_BASE}/activities`, { headers: getHeaders() });
        if (!res.ok) {
          const cached = await offlineStorage.getCachedActivities();
          if (cached.length > 0) return cached;
          throw new Error(await parseResponseError(res, "Failed to fetch activities"));
        }
        const data = await res.json();
        offlineStorage.cacheActivities(data).catch(() => {});
        return data;
      } catch (err: any) {
        const cached = await offlineStorage.getCachedActivities();
        if (cached && cached.length > 0) return cached;
        throw err;
      }
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/activities`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to create activity"));
      return res.json();
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/activities/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to delete activity"));
      return res.json();
    },
  },
  subjects: {
    getAll: async (): Promise<Subject[]> => {
      const res = await fetch(`${API_BASE}/subjects`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to fetch subjects"));
      return res.json();
    },
  },
  submissions: {
    create: async (data: any) => {
      const isForcedOffline = localStorage.getItem("force_offline_mode") === "true";
      const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || isForcedOffline;

      if (isOffline) {
        let currentUser: any = null;
        try {
          currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        } catch {}
        const result = await offlineStorage.queueOfflineSubmission({
          aoiId: data.aoiId,
          content: data.content,
          engagementTime: data.engagementTime,
          plagiarismRisk: data.plagiarismRisk,
          studentId: currentUser?.uid || "current_student",
          studentName: currentUser?.name || "Me",
          activityTitle: data.activityTitle,
        });
        return {
          message: "Saved to device storage (IndexedDB). It will sync once internet connection is available.",
          isOffline: true,
          localId: result.localId,
        };
      }

      try {
        const res = await fetch(`${API_BASE}/submissions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          throw new Error(await parseResponseError(res, "Failed to submit work"));
        }
        return res.json();
      } catch (err: any) {
        // Fallback to offline queue on network drop
        if (
          (typeof navigator !== "undefined" && !navigator.onLine) ||
          err.message?.includes("Failed to fetch") ||
          err.name === "TypeError"
        ) {
          let currentUser: any = null;
          try {
            currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          } catch {}
          const result = await offlineStorage.queueOfflineSubmission({
            aoiId: data.aoiId,
            content: data.content,
            engagementTime: data.engagementTime,
            plagiarismRisk: data.plagiarismRisk,
            studentId: currentUser?.uid || "current_student",
            studentName: currentUser?.name || "Me",
            activityTitle: data.activityTitle,
          });
          return {
            message: "Saved to offline storage (IndexedDB). Will sync when connection is restored.",
            isOffline: true,
            localId: result.localId,
          };
        }
        throw err;
      }
    },
    getAll: async (): Promise<Submission[]> => {
      let currentUser: any = null;
      try {
        currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      } catch {}

      const isForcedOffline = localStorage.getItem("force_offline_mode") === "true";
      const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || isForcedOffline;

      if (isOffline) {
        const cached = await offlineStorage.getCachedSubmissions(
          currentUser?.role === "student" ? currentUser?.uid : undefined
        );
        return cached;
      }

      try {
        const res = await fetch(`${API_BASE}/submissions`, { headers: getHeaders() });
        if (!res.ok) {
          const cached = await offlineStorage.getCachedSubmissions(
            currentUser?.role === "student" ? currentUser?.uid : undefined
          );
          if (cached.length > 0) return cached;
          throw new Error(await parseResponseError(res, "Failed to fetch submissions"));
        }
        const serverSubs = await res.json();
        offlineStorage.cacheSubmissions(serverSubs).catch(() => {});

        // Merge any locally queued unsynced submissions so student sees their submitted drafts
        const cached = await offlineStorage.getCachedSubmissions(
          currentUser?.role === "student" ? currentUser?.uid : undefined
        );
        const pendingLocal = cached.filter((c: any) => (c as any).isOfflineDraft);
        if (pendingLocal.length > 0) {
          return [...pendingLocal, ...serverSubs.filter((s: any) => !pendingLocal.some((p: any) => p.aoiId === s.aoiId))];
        }

        return serverSubs;
      } catch (err: any) {
        const cached = await offlineStorage.getCachedSubmissions(
          currentUser?.role === "student" ? currentUser?.uid : undefined
        );
        if (cached.length > 0) return cached;
        throw err;
      }
    },
    grade: async (id: number, data: { grade: string; feedback: string }) => {
      const res = await fetch(`${API_BASE}/submissions/${id}/grade`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to grade submission"));
      return res.json();
    },
    verifyDna: async (submissionId: string) => {
      const res = await fetch(`${API_BASE}/submissions/verify-dna`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ submissionId }),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to verify DNA"));
      return res.json();
    },
    markAsCorrected: async (id: number) => {
      const res = await fetch(`${API_BASE}/submissions/${id}/mark-as-corrected`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to mark as corrected"));
      return res.json();
    },
  },
  forums: {
    getPosts: async (areaK: string) => {
      const res = await fetch(`${API_BASE}/forums/${encodeURIComponent(areaK)}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to fetch forum posts"));
      return res.json();
    },
    createPost: async (areaK: string, content: string, type: string = "text", mediaUrl?: string) => {
      const res = await fetch(`${API_BASE}/forums/${encodeURIComponent(areaK)}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content, type, mediaUrl }),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to create forum post"));
      return res.json();
    },
    uploadMedia: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to upload media"));
      return res.json();
    },
  },
  marketplace: {
    getBooks: async (params?: { subjectId?: number; class?: string }) => {
      const query = new URLSearchParams();
      if (params?.subjectId) query.append("subjectId", params.subjectId.toString());
      if (params?.class) query.append("class", params.class);
      const res = await fetch(`${API_BASE}/books?${query.toString()}`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to fetch books"));
      return res.json();
    },
    listBook: async (data: any) => {
      const res = await fetch(`${API_BASE}/books`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to list book"));
      return res.json();
    },
    purchaseBook: async (bookId: number, amount: number) => {
      const res = await fetch(`${API_BASE}/books/purchase`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ bookId, amount }),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to purchase book"));
      return res.json();
    },
  },
  lessonPlans: {
    getAll: async () => {
      const isForcedOffline = localStorage.getItem("force_offline_mode") === "true";
      const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || isForcedOffline;

      if (isOffline) {
        return await offlineStorage.getCachedLessonPlans();
      }

      try {
        const res = await fetch(`${API_BASE}/lesson-plans`, { headers: getHeaders() });
        if (!res.ok) {
          const cached = await offlineStorage.getCachedLessonPlans();
          if (cached.length > 0) return cached;
          throw new Error(await parseResponseError(res, "Failed to fetch lesson plans"));
        }
        const data = await res.json();
        offlineStorage.cacheLessonPlans(data).catch(() => {});
        return data;
      } catch (err: any) {
        const cached = await offlineStorage.getCachedLessonPlans();
        if (cached && cached.length > 0) return cached;
        throw err;
      }
    },
    save: async (data: {
      subjectId: number;
      class: string;
      topic: string;
      competencyOutcome: string;
      duration: string;
      content: string;
    }) => {
      const isForcedOffline = localStorage.getItem("force_offline_mode") === "true";
      const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || isForcedOffline;

      if (isOffline) {
        return await offlineStorage.queueOfflineLessonPlan(data);
      }

      try {
        const res = await fetch(`${API_BASE}/lesson-plans`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await parseResponseError(res, "Failed to save lesson plan"));
        return res.json();
      } catch (err: any) {
        if (
          (typeof navigator !== "undefined" && !navigator.onLine) ||
          err.message?.includes("Failed to fetch") ||
          err.name === "TypeError"
        ) {
          return await offlineStorage.queueOfflineLessonPlan(data);
        }
        throw err;
      }
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/lesson-plans/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to delete lesson plan"));
      return res.json();
    },
    generate: async (data: {
      subjectId: number;
      class: string;
      topic: string;
      competencyOutcome: string;
      duration: string;
    }) => {
      const res = await fetch(`${API_BASE}/lesson-plans/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(await parseResponseError(res, "Failed to generate lesson plan"));
      }
      return res.json();
    },
  },
  sync: {
    batch: async (payload: { submissions?: any[]; lessonPlans?: any[] }) => {
      const res = await fetch(`${API_BASE}/sync/batch`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await parseResponseError(res, "Failed to sync offline items"));
      return res.json();
    },
  },
  system: {
    checkHealth: async () => {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error("Health check failed");
      return res.json();
    },
  },
};

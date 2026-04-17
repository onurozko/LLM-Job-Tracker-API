export type LocationType = "remote" | "onsite" | "hybrid";

export type ApplicationStatus =
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "archived";

export interface Application {
  id: string;
  company: string;
  role: string;
  location_type: LocationType;
  location: string;
  url: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  fit_bullets: string[];
  recruiter_message: string;
  interview_checklist: string[];
}

export interface CreateApplicationPayload {
  company: string;
  role: string;
  location_type: LocationType;
  location: string;
  url: string;
}

export interface TaskResponse {
  task_id: string;
  status: "pending" | "running" | "done" | "failed" | string;
  error?: string;
  result?: unknown;
}

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  listApplications: () => request<Application[]>("/applications"),

  getApplication: (id: string) => request<Application>(`/applications/${id}`),

  createApplication: (payload: CreateApplicationPayload) =>
    request<Application>("/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateApplicationStatus: (id: string, status: ApplicationStatus) =>
    request<Application>(`/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  triggerGeneration: (id: string) =>
    request<{ task_id: string }>(`/applications/${id}/generate`, {
      method: "POST",
    }),

  getTask: (taskId: string) => request<TaskResponse>(`/tasks/${taskId}`),
};

import { MockSignageService } from "./MockSignageService";
import { HttpSignageService } from "./HttpSignageService";

// Data-mode switch: `mock` (default) runs in-browser with localStorage state;
// `http` talks to the backend (docker-compose `backend` service) over REST.
const mode = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? "mock";

export const service =
  mode === "http"
    ? new HttpSignageService((import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000")
    : new MockSignageService();

export * from "./SignageService";
export type { SignageService } from "./SignageService";

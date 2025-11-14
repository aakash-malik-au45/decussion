// client/src/api/index.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4000/api", // adjust if your backend runs elsewhere
  headers: {
    "Content-Type": "application/json",
  },
});

// setAuthToken persists token and sets axios default header
export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
  }
};

// small wrapper that returns an axios response (res.data has payload)
export async function apiFetch(path: string, opts: { method?: string; body?: any } = {}) {
  const method = (opts.method || "get").toLowerCase();

  if (method === "get") return api.get(path);
  if (method === "post") return api.post(path, opts.body);
  if (method === "put") return api.put(path, opts.body);
  if (method === "delete") return api.delete(path);

  return api.request({ url: path, method, data: opts.body });
}

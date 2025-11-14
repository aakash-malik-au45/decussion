import { useState } from "react";
import { api, setAuthToken } from "../api";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await api.post(endpoint, { username, password });

      if (mode === "login") {
        localStorage.setItem("token", res.data.token);
        setAuthToken(res.data.token);
        navigate("/posts");
      } else {
        setMsg("✅ Registered! You can now login.");
        setMode("login");
      }
    } catch (err: any) {
      setMsg(err.response?.data?.error || "Error");
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {mode === "login" ? "Login" : "Register"}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.button} type="submit">
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <span style={styles.link} onClick={() => setMode("register")}>
                Register
              </span>
            </>
          ) : (
            <>
              Already registered?{" "}
              <span style={styles.link} onClick={() => setMode("login")}>
                Login
              </span>
            </>
          )}
        </p>

        {msg && <p style={styles.message}>{msg}</p>}
      </div>
    </div>
  );
}
export function getTokenPayload(): { id?: string; username?: string } | null {
  const t = localStorage.getItem("token");
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split(".")[1]));
  } catch {
    return null;
  }
}
const styles: any = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
  },
  card: {
    width: "360px",
    padding: "2rem",
    borderRadius: "12px",
    background: "white",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
    textAlign: "center",
    fontWeight: 600,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
  },
  button: {
    padding: "0.75rem",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    background: "#3b82f6",
    color: "white",
    cursor: "pointer",
  },
  switchText: {
    marginTop: "1rem",
    textAlign: "center",
    color: "#475569",
  },
  link: {
    color: "#2563eb",
    fontWeight: 600,
    cursor: "pointer",
  },
  message: {
    marginTop: "0.5rem",
    textAlign: "center",
    color: "#dc2626",
  },
};

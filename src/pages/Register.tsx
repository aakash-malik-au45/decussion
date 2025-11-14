import { useState } from "react";
import { api } from "../api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/register", { username, password });
      setMsg(`✅ Registered! Token: ${res.data.token.slice(0, 15)}...`);
    } catch (err: any) {
      setMsg(err.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        /><br/>
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br/>
        <button type="submit">Register</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}

// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from || "/dashboard";

  const [form, setForm]     = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Client-side validation
    if (!form.email || !form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!form.password) {
      toast.error("Password is required");
      return;
    }
    if (form.email.trim().length < 3) {
      toast.error("Invalid email format");
      return;
    }
    
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login error:", err.response?.status, err.response?.data || err.message);
      const errorMsg = 
        err.response?.status === 429 ? "Too many login attempts. Please try again later." :
        err.response?.status === 401 ? "Invalid email or password. Please try again." :
        err.response?.data?.message || "Login failed. Please check your email and password.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 16px", background:"var(--cream)" }}>
      <div className="fade-up" style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:"linear-gradient(135deg,var(--crimson),var(--saffron))",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontFamily:"var(--font-display)", fontWeight:800, fontSize:24,
            margin:"0 auto 16px",
          }}>N</div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700 }}>Sign in to NepalDaan</h1>
          <p style={{ color:"var(--stone)", fontSize:14, marginTop:6 }}>Transparent charity on the blockchain</p>
        </div>

        <div className="card" style={{ padding:32 }}>
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email"
                value={form.email} onChange={handleChange}
                placeholder="you@example.com" required autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password"
                value={form.password} onChange={handleChange}
                placeholder="••••••••" required />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign:"center", fontSize:14, color:"var(--stone)" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color:"var(--crimson)", fontWeight:600 }}>Register</Link>
          </p>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop:20, padding:16, borderRadius:12, background:"rgba(192,57,43,.06)", border:"1px solid rgba(192,57,43,.12)", fontSize:13, color:"var(--stone)" }}>
          <strong style={{ color:"var(--crimson)" }}>Demo accounts:</strong><br />
          Register with any email to start. Use role <em>org_admin</em> to create campaigns.
        </div>
      </div>
    </div>
  );
}

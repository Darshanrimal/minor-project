// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import toast from "react-hot-toast";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "", email: "", password: "", confirm: "", role: "donor",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    if (form.password.length < 6)       return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const user = await register(form.username, form.email, form.password, form.role);
      toast.success("Account created! Welcome 🎉");
      navigate(user.role === "org_admin" ? "/org/register" : "/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      const message = err.response?.data?.message || err.message || "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 16px", background:"var(--cream)" }}>
      <div className="fade-up" style={{ width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:"linear-gradient(135deg,var(--crimson),var(--saffron))",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontFamily:"var(--font-display)", fontWeight:800, fontSize:24,
            margin:"0 auto 16px",
          }}>N</div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700 }}>Create Account</h1>
          <p style={{ color:"var(--stone)", fontSize:14, marginTop:6 }}>Join NepalDaan today</p>
        </div>

        <div className="card" style={{ padding:32 }}>
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" name="username" value={form.username}
                onChange={handleChange} placeholder="yourname" required autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com" required />
            </div>

            <div className="form-group">
              <label className="form-label">I am a</label>
              <select className="form-input" name="role" value={form.role} onChange={handleChange}>
                <option value="donor">Donor — I want to donate</option>
                <option value="org_admin">Organization — I run a charity</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="Min 6 characters" required />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" name="confirm" value={form.confirm}
                onChange={handleChange} placeholder="Repeat password" required />
            </div>

            {form.role === "org_admin" && (
              <div style={{ padding:12, borderRadius:10, background:"rgba(230,126,34,.08)", border:"1px solid rgba(230,126,34,.2)", fontSize:13, color:"var(--ink-soft)" }}>
                🏢 After registration you'll complete your organization profile.
              </div>
            )}

            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign:"center", fontSize:14, color:"var(--stone)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color:"var(--crimson)", fontWeight:600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

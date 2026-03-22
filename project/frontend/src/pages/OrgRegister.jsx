// src/pages/OrgRegister.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { orgAPI } from "../services/api";
import toast from "react-hot-toast";

const PROVINCES = ["Koshi","Madhesh","Bagmati","Gandaki","Lumbini","Karnali","Sudurpashchim"];

export default function OrgRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name:"", description:"", website:"", district:"", province:"",
    registration_number:"", contact_email:"", contact_phone:"",
  });
  const [saving, setSaving] = useState(false);
  const ch = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await orgAPI.create(form);
      toast.success("Organization registered! Awaiting admin verification.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", padding:"40px 0" }}>
      <div className="container" style={{ maxWidth:600 }}>
        <div className="fade-up">
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800 }}>Register Organization</h1>
            <p style={{ color:"var(--stone)", marginTop:6 }}>Your organization will be reviewed by our admin team before you can create campaigns.</p>
          </div>

          <div className="card" style={{ padding:32 }}>
            <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div className="form-group">
                <label className="form-label">Organization Name *</label>
                <input className="form-input" name="name" value={form.name} onChange={ch} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" name="description" value={form.description} onChange={ch} required rows={4}
                  placeholder="What does your organization do?" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <input className="form-input" name="district" value={form.district} onChange={ch} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Province *</label>
                  <select className="form-input" name="province" value={form.province} onChange={ch} required>
                    <option value="">Select province</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email *</label>
                <input className="form-input" type="email" name="contact_email" value={form.contact_email} onChange={ch} required />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input" name="contact_phone" value={form.contact_phone} onChange={ch} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input className="form-input" name="registration_number" value={form.registration_number} onChange={ch}
                    placeholder="Govt. reg. no." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" type="url" name="website" value={form.website} onChange={ch}
                  placeholder="https://" />
              </div>

              <div style={{ padding:14, borderRadius:12, background:"rgba(230,126,34,.08)", border:"1px solid rgba(230,126,34,.2)", fontSize:13, color:"var(--ink-soft)" }}>
                📋 After submission, an admin will verify your organization (usually within 24–48 hours). You'll then be able to create campaigns.
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
                {saving ? "Submitting…" : "Submit for Review"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

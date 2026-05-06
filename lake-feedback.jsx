import { useState, useEffect } from "react";

const STORAGE_KEY = "lake_project_feedback_v3";

async function readFeedback() {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `You are a data store. When asked to READ, respond with ONLY the raw JSON array stored under the key "${STORAGE_KEY}", or an empty array [] if nothing is stored. When asked to WRITE, acknowledge with OK. Never add explanation.`,
        messages: [{ role: "user", content: `READ ${STORAGE_KEY}` }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || "[]";
    try { return JSON.parse(text); } catch { return []; }
  } catch { return []; }
}

async function writeFeedback(entries) {
  await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: `You are a data store for key "${STORAGE_KEY}". Acknowledge all WRITE commands with just OK.`,
      messages: [{ role: "user", content: `WRITE ${STORAGE_KEY} ${JSON.stringify(entries)}` }]
    })
  });
}

function StarRating({ label, group, ratings, setRatings, required }) {
  const [hover, setHover] = useState(0);
  const val = ratings[group] || 0;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3,4,5].map(n => (
          <span
            key={n}
            onClick={() => setRatings(r => ({ ...r, [group]: n }))}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{
              fontSize: 28, cursor: "pointer", lineHeight: 1, userSelect: "none",
              color: n <= (hover || val) ? "#f59e0b" : "#d1d5db",
              transition: "color 0.1s"
            }}
          >★</span>
        ))}
      </div>
    </div>
  );
}

function FeedbackForm({ onSubmitted }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [activities, setActivities] = useState(new Set());
  const [ratings, setRatings] = useState({ overall: 0, org: 0, info: 0 });
  const [enjoy, setEnjoy] = useState("");
  const [improve, setImprove] = useState("");
  const [nps, setNps] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const toggleAct = (act) => {
    setActivities(prev => {
      const next = new Set(prev);
      next.has(act) ? next.delete(act) : next.add(act);
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Required";
    if (!phone.trim()) e.phone = "Required";
    if (!ratings.overall) e.stars = "Please give a rating";
    if (!enjoy.trim()) e.enjoy = "Please share a few words";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError("");
    try {
      const existing = await readFeedback();
      const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString("en-IN"),
        name: name.trim(), age, phone: phone.trim(),
        email: email.trim(), city: city.trim(),
        activities: [...activities],
        stars: { ...ratings },
        enjoy: enjoy.trim(), improve: improve.trim(), nps
      };
      await writeFeedback([entry, ...existing]);
      onSubmitted();
    } catch (err) {
      setSaveError("Could not save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1px solid #e5e7eb", fontSize: 14, outline: "none",
    background: "white", color: "#111", boxSizing: "border-box"
  };
  const errInp = { ...inp, border: "1px solid #ef4444" };
  const card = {
    background: "white", border: "1px solid #e5e7eb",
    borderRadius: 12, padding: "1.25rem", marginBottom: "1rem"
  };
  const label = { fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 };
  const actStyle = (act) => ({
    border: activities.has(act) ? "1.5px solid #10b981" : "1px solid #e5e7eb",
    borderRadius: 8, padding: "9px 12px", fontSize: 13, cursor: "pointer",
    color: activities.has(act) ? "#065f46" : "#6b7280",
    background: activities.has(act) ? "#ecfdf5" : "transparent",
    fontWeight: activities.has(act) ? 500 : 400,
    transition: "all 0.12s", textAlign: "center"
  });

  return (
    <div>
      {saveError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c", marginBottom: "1rem" }}>
          {saveError}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>About you</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={label}>Full name <span style={{ color: "#ef4444" }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={errors.name ? errInp : inp} />
            {errors.name && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>{errors.name}</div>}
          </div>
          <div>
            <label style={label}>Age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 24" style={inp} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={label}>Phone <span style={{ color: "#ef4444" }}>*</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={errors.phone ? errInp : inp} />
            {errors.phone && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>{errors.phone}</div>}
          </div>
          <div>
            <label style={label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />
          </div>
        </div>
        <div>
          <label style={label}>City / area</label>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="Where are you from?" style={inp} />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>Activities you joined</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[["food","🍎 Food labels"],["games","🏃 Traditional games"],["waste","♻️ Waste sorting"]].map(([k,l]) => (
            <button key={k} onClick={() => toggleAct(k)} style={actStyle(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>Rate your experience</div>
        <StarRating label="Overall experience" group="overall" ratings={ratings} setRatings={setRatings} required />
        {errors.stars && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: -8, marginBottom: 8 }}>{errors.stars}</div>}
        <StarRating label="Volunteers & organisation" group="org" ratings={ratings} setRatings={setRatings} />
        <StarRating label="Usefulness of information shared" group="info" ratings={ratings} setRatings={setRatings} />
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>In your own words</div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={label}>What did you enjoy most? <span style={{ color: "#ef4444" }}>*</span></label>
          <textarea value={enjoy} onChange={e => setEnjoy(e.target.value)} placeholder="Tell us what stood out for you…"
            style={{ ...( errors.enjoy ? errInp : inp), minHeight: 72, resize: "vertical" }} />
          {errors.enjoy && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>{errors.enjoy}</div>}
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={label}>What could we do better?</label>
          <textarea value={improve} onChange={e => setImprove(e.target.value)} placeholder="Any suggestions are welcome…"
            style={{ ...inp, minHeight: 60, resize: "vertical" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Would you recommend this event? (1–10)</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setNps(n)} style={{
                width: 34, height: 34, borderRadius: 8, border: nps===n ? "1.5px solid #10b981" : "1px solid #e5e7eb",
                fontSize: 13, cursor: "pointer", background: nps===n ? "#ecfdf5" : "transparent",
                color: nps===n ? "#065f46" : "#6b7280", fontWeight: nps===n ? 500 : 400
              }}>{n}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            <span>Not likely</span><span>Very likely</span>
          </div>
        </div>
      </div>

      <button onClick={submit} disabled={saving} style={{
        width: "100%", padding: 12, borderRadius: 8,
        border: "1px solid #d1d5db", background: saving ? "#f9fafb" : "white",
        fontSize: 15, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer",
        color: saving ? "#9ca3af" : "#111", transition: "all 0.12s"
      }}>
        {saving ? "Saving…" : "Submit feedback"}
      </button>
    </div>
  );
}

function Thanks({ onReset }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{ fontSize: 40, color: "#10b981", marginBottom: 12 }}>✓</div>
      <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 6px" }}>Thank you!</h2>
      <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 1.5rem" }}>Your feedback has been saved. The Lake Project team really appreciates it.</p>
      <button onClick={onReset} style={{
        padding: "8px 22px", borderRadius: 8, border: "1px solid #e5e7eb",
        background: "transparent", fontSize: 14, cursor: "pointer", color: "#374151"
      }}>Submit another response</button>
    </div>
  );
}

function AdminPanel() {
  const [responses, setResponses] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readFeedback().then(r => { setResponses(r); setLoading(false); });
  }, []);

  const exportCSV = () => {
    if (!responses?.length) return;
    const headers = ["Date","Name","Age","Phone","Email","City","Activities","Stars Overall","Stars Org","Stars Info","Enjoyed","Improvement","Recommend"];
    const rows = responses.map(r => [r.date,r.name,r.age,r.phone,r.email,r.city,(r.activities||[]).join("; "),r.stars?.overall,r.stars?.org,r.stars?.info,r.enjoy,r.improve,r.nps]);
    const csv = [headers,...rows].map(row => row.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "lake_feedback.csv"; a.click();
  };

  if (loading) return <p style={{ fontSize: 14, color: "#6b7280" }}>Loading responses…</p>;
  if (!responses?.length) return <p style={{ fontSize: 14, color: "#6b7280" }}>No responses yet.</p>;

  const avgOv = (responses.reduce((a,r) => a+(r.stars?.overall||0),0)/responses.length).toFixed(1);
  const npsRs = responses.filter(r=>r.nps);
  const avgNps = npsRs.length ? (npsRs.reduce((a,r)=>a+r.nps,0)/npsRs.length).toFixed(1) : "—";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={exportCSV} style={{ fontSize: 12, color: "#6b7280", border: "1px solid #e5e7eb", background: "transparent", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>
          ↓ Export CSV
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1.25rem" }}>
        {[["Responses", responses.length, "#111"],["Avg rating", avgOv+"/5","#f59e0b"],["Avg recommend", avgNps+"/10","#111"]].map(([l,v,c]) => (
          <div key={l} style={{ background: "#f9fafb", borderRadius: 8, padding: "0.85rem" }}>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 3px" }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 500, margin: 0, color: c }}>{v}</p>
          </div>
        ))}
      </div>
      {responses.map(r => (
        <div key={r.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.85rem 1rem", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{r.name}{r.city ? " · "+r.city : ""}</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{r.date}</span>
          </div>
          <div style={{ color: "#f59e0b", fontSize: 13, marginBottom: 4 }}>
            {"★".repeat(r.stars?.overall||0)}{"☆".repeat(5-(r.stars?.overall||0))} {r.stars?.overall}/5
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic", margin: "0 0 4px" }}>"{r.enjoy}"</p>
          {r.improve && <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 6px" }}>Suggestion: {r.improve}</p>}
          <div style={{ fontSize: 12, color: "#9ca3af", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span>📱 {r.phone}</span>
            {r.email && <span>✉ {r.email}</span>}
            {r.nps ? <span>Recommend: {r.nps}/10</span> : null}
            {r.activities?.length ? <span>Activities: {r.activities.join(", ")}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("form");
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "system-ui, sans-serif", color: "#111" }}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f3f4f6" }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>Share your experience</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Lake Project · Your feedback helps us improve every event</p>
      </div>

      {view === "form" && <FeedbackForm onSubmitted={() => setView("thanks")} />}
      {view === "thanks" && <Thanks onReset={() => setView("form")} />}

      <div style={{ marginTop: "2rem", borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
        <button onClick={() => setShowAdmin(p => !p)} style={{
          fontSize: 12, color: "#9ca3af", background: "transparent",
          border: "none", cursor: "pointer", padding: 0
        }}>
          🛡 {showAdmin ? "Hide" : "Organiser view — see all responses"}
        </button>
        {showAdmin && (
          <div style={{ marginTop: "1rem" }}>
            <AdminPanel />
          </div>
        )}
      </div>
    </div>
  );
}

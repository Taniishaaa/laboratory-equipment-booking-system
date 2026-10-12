import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("labbook_token") || "");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("labbook_user") || "null"); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "" });
  const [equipment, setEquipment] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [date, setDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [tab, setTab] = useState("book");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => equipment.find((item) => String(item.id) === String(selectedEquipment)), [equipment, selectedEquipment]);

  function saveSession(data) {
    localStorage.setItem("labbook_token", data.token);
    localStorage.setItem("labbook_user", JSON.stringify(data.user));
    setToken(data.token); setUser(data.user);
  }
  function logout() {
    localStorage.removeItem("labbook_token"); localStorage.removeItem("labbook_user");
    setToken(""); setUser(null); setBookings([]); setEquipment([]); setSlots([]);
    setNotice({ type: "success", text: "You have been logged out." });
  }
  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setNotice({ type: "", text: "" });
    try {
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const data = await request(endpoint, { method: "POST", body: JSON.stringify(auth) });
      saveSession(data);
      setNotice({ type: "success", text: data.message });
      setAuth({ name: "", email: "", password: "" });
    } catch (err) { setNotice({ type: "error", text: err.message }); }
    finally { setBusy(false); }
  }
  async function loadEquipment(currentToken = token) {
    const data = await request("/equipment", { token: currentToken });
    setEquipment(data);
    if (data.length && !selectedEquipment) setSelectedEquipment(String(data[0].id));
  }
  async function loadBookings(currentToken = token) {
    const data = await request("/bookings", { token: currentToken });
    setBookings(data);
  }
  async function loadSlots() {
    if (!selectedEquipment || !date) return;
    setSelectedSlot(null);
    try {
      const data = await request(`/equipment/${selectedEquipment}/slots?date=${date}`, { token });
      setSlots(data.slots);
    } catch (err) { setSlots([]); setNotice({ type: "error", text: err.message }); }
  }
  useEffect(() => {
    if (!token) return;
    Promise.all([loadEquipment(token), loadBookings(token)]).catch((err) => {
      setNotice({ type: "error", text: err.message });
      if (/session|log in/i.test(err.message)) logout();
    });
  }, [token]);
  useEffect(() => { if (token && selectedEquipment) loadSlots(); }, [token, selectedEquipment, date]);
  async function refresh() {
    await Promise.all([loadEquipment(), loadBookings()]);
    await loadSlots();
  }
  async function createBooking() {
    if (!selected || !selectedSlot) return;
    setBusy(true);
    try {
      const data = await request("/bookings", {
        token, method: "POST",
        body: JSON.stringify({ equipmentId: selected.id, date, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime })
      });
      setNotice({ type: "success", text: data.message });
      setSelectedSlot(null);
      await refresh();
      setTab("bookings");
    } catch (err) { setNotice({ type: "error", text: err.message }); await loadSlots(); }
    finally { setBusy(false); }
  }
  async function bookingAction(id, action) {
    setBusy(true);
    try {
      const data = await request(`/bookings/${id}/${action}`, { token, method: "PATCH" });
      setNotice({ type: "success", text: data.message });
      await refresh();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
    finally { setBusy(false); }
  }

  if (!token || !user) {
    return <div className="auth-page">
      <div className="auth-visual">
        <div className="brand"><span className="brand-mark">L</span> LabBook</div>
        <div className="visual-copy">
          <span className="eyebrow">LABORATORY RESOURCE MANAGEMENT</span>
          <h1>Make time for<br/><em>discovery.</em></h1>
          <p>One simple place to find equipment, reserve a slot, and keep your lab work moving.</p>
          <div className="visual-stats"><div><strong>01</strong><span>Find equipment</span></div><div><strong>02</strong><span>Choose a slot</span></div><div><strong>03</strong><span>Get to work</span></div></div>
        </div>
        <div className="visual-foot">LABORATORY EQUIPMENT BOOKING SYSTEM <span>•</span> MVP</div>
      </div>
      <main className="auth-panel">
        <div className="mobile-brand"><span className="brand-mark">L</span> LabBook</div>
        <div className="auth-card">
          <span className="eyebrow">{authMode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
          <h2>{authMode === "login" ? "Sign in to your lab" : "Create your account"}</h2>
          <p className="muted">{authMode === "login" ? "Access your equipment bookings and reservations." : "Register to start booking laboratory equipment."}</p>
          {notice.text && <div className={`notice ${notice.type}`}>{notice.text}</div>}
          <form onSubmit={submitAuth}>
            {authMode === "register" && <label>Full name<input required minLength="2" value={auth.name} onChange={(e) => setAuth({...auth, name:e.target.value})} placeholder="e.g. Tanisha Gupta"/></label>}
            <label>Email address<input required type="email" value={auth.email} onChange={(e) => setAuth({...auth, email:e.target.value})} placeholder="you@university.edu"/></label>
            <label>Password<input required minLength="8" type="password" value={auth.password} onChange={(e) => setAuth({...auth, password:e.target.value})} placeholder="At least 8 characters"/></label>
            <button className="primary full" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"} <span>↗</span></button>
          </form>
          <div className="switch-auth">{authMode === "login" ? "New to LabBook?" : "Already have an account?"} <button onClick={() => {setAuthMode(authMode === "login" ? "register" : "login");setNotice({type:"",text:""});}}>{authMode === "login" ? "Create an account" : "Sign in"}</button></div>
          <p className="auth-note">Your account is used only to manage your bookings.</p>
        </div>
      </main>
    </div>;
  }

  const activeCount = bookings.filter((b) => b.status !== "CANCELLED").length;
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">L</span> LabBook <span className="brand-divider">/</span> <span className="brand-sub">Equipment booking</span></div>
      <div className="profile"><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><span className="profile-name">{user.name}</span><button className="text-button" onClick={logout}>Sign out ↗</button></div>
    </header>
    <main className="dashboard">
      <section className="welcome-row">
        <div><span className="eyebrow">LABORATORY RESOURCE MANAGEMENT</span><h1>Good work starts <em>here.</em></h1><p>Find the right equipment and reserve time for your next experiment.</p></div>
        <div className="welcome-icon">✳</div>
      </section>
      {notice.text && <div className={`notice global-notice ${notice.type}`}><span>{notice.text}</span><button onClick={() => setNotice({type:"",text:""})}>×</button></div>}
      <section className="stats-row">
        <div className="stat-card"><span className="stat-label">AVAILABLE EQUIPMENT</span><strong>{equipment.length.toString().padStart(2,"0")}</strong><span className="stat-foot">Ready to reserve</span></div>
        <div className="stat-card"><span className="stat-label">YOUR BOOKINGS</span><strong>{bookings.length.toString().padStart(2,"0")}</strong><span className="stat-foot">All booking records</span></div>
        <div className="stat-card"><span className="stat-label">ACTIVE BOOKINGS</span><strong>{activeCount.toString().padStart(2,"0")}</strong><span className="stat-foot">Pending or confirmed</span></div>
      </section>
      <div className="section-tabs">
        <button className={tab === "book" ? "active" : ""} onClick={() => setTab("book")}>Find equipment <span>01</span></button>
        <button className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}>My bookings <span>02</span></button>
      </div>
      {tab === "book" ? <section className="booking-layout">
        <div className="equipment-panel">
          <div className="section-heading"><div><span className="eyebrow">EQUIPMENT DIRECTORY</span><h2>Choose your equipment</h2></div><span className="result-count">{equipment.length} items</span></div>
          {equipment.length === 0 ? <div className="empty-state">No equipment found. Check that the database seed command has run.</div> :
            <div className="equipment-grid">{equipment.map((item, i) => <button key={item.id} className={`equipment-card ${String(item.id) === String(selectedEquipment) ? "selected" : ""}`} onClick={() => setSelectedEquipment(String(item.id))}>
              <div className={`equipment-art art-${i%4}`}><span>{["⌁","▧","◉","⌬"][i%4]}</span><small>LAB / {String(item.id).padStart(2,"0")}</small></div>
              <div className="equipment-info"><span className="availability"><i/> AVAILABLE</span><h3>{item.name}</h3><p>{item.description}</p><div className="equipment-meta"><span>⌖ {item.location}</span><span>↗</span></div></div>
            </button>)}</div>}
        </div>
        <aside className="slot-panel">
          <div className="section-heading"><div><span className="eyebrow">RESERVATION</span><h2>Pick a time</h2></div><span className="step-number">02</span></div>
          <label className="date-label">Booking date<input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)}/></label>
          <div className="slot-subtitle"><span>{selected?.name || "Select equipment"}</span><span>60 MIN SLOTS</span></div>
          <div className="slots-grid">{slots.map((slot) => <button key={slot.startTime} disabled={!slot.available} onClick={() => setSelectedSlot(slot)} className={`slot ${!slot.available ? "unavailable" : ""} ${selectedSlot?.startTime === slot.startTime ? "chosen" : ""}`}><span>{slot.startTime}</span><small>{slot.available ? "Available" : "Booked"}</small></button>)}</div>
          <div className="slot-legend"><span><i className="legend-open"/> Available</span><span><i className="legend-booked"/> Unavailable</span></div>
          <div className="selection-summary"><div><span className="eyebrow">YOUR SELECTION</span><strong>{selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : "No time selected"}</strong><small>{date} {selected ? `· ${selected.name}` : ""}</small></div><button className="primary" disabled={!selectedSlot || busy} onClick={createBooking}>{busy ? "Sending…" : "Request booking"} <span>↗</span></button></div>
          <p className="fine-print">Requests are pending until you confirm them in My bookings. Slots are held while a request is pending.</p>
        </aside>
      </section> : <section className="bookings-panel">
        <div className="section-heading"><div><span className="eyebrow">YOUR RESERVATIONS</span><h2>My bookings</h2></div><button className="secondary" onClick={refresh}>↻ Refresh</button></div>
        {bookings.length === 0 ? <div className="empty-state"><span className="empty-icon">◷</span><h3>No bookings yet</h3><p>Your requested equipment slots will appear here.</p><button className="primary" onClick={() => setTab("book")}>Find equipment ↗</button></div> :
          <div className="table-wrap"><table><thead><tr><th>Equipment</th><th>Date & time</th><th>Status</th><th>Requested</th><th>Actions</th></tr></thead><tbody>{bookings.map((b) => <tr key={b.id}><td><strong>{b.equipment.name}</strong><small>{b.equipment.location}</small></td><td>{new Date(b.date).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"})}<small>{b.startTime} – {b.endTime}</small></td><td><span className={`status status-${b.status.toLowerCase()}`}>{b.status}</span></td><td>{new Date(b.createdAt).toLocaleDateString()}</td><td><div className="row-actions">{b.status === "PENDING" && <button className="action-confirm" disabled={busy} onClick={() => bookingAction(b.id,"confirm")}>Confirm</button>}{b.status !== "CANCELLED" && <button className="action-cancel" disabled={busy} onClick={() => bookingAction(b.id,"cancel")}>Cancel</button>}</div></td></tr>)}</tbody></table></div>}
      </section>}
      <footer className="footer"><span>LABBOOK <span className="footer-dot">•</span> LABORATORY EQUIPMENT BOOKING SYSTEM</span><span>Built for better lab time.</span></footer>
    </main>
  </div>;
}

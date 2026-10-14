import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ROLE_LABELS = { STUDENT: "Student", FACULTY: "Faculty", LAB_ADMIN: "Lab Admin" };

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
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function prettyDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await request(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST", body: JSON.stringify(form)
      });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="hero-panel">
        <div className="brand"><span className="brand-mark">L</span> LabBook</div>
        <div className="hero-copy">
          <p className="eyebrow">LABORATORY RESOURCE MANAGEMENT</p>
          <h1>Make time for <em>discovery.</em></h1>
          <p className="hero-description">One simple place to find equipment, reserve a slot, and keep your lab work moving.</p>
          <div className="steps"><span><b>01</b>Find equipment</span><span><b>02</b>Choose a slot</span><span><b>03</b>Get to work</span></div>
        </div>
        <p className="hero-foot">LABORATORY EQUIPMENT BOOKING SYSTEM <span>•</span> MVP</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow muted">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</p>
          <h2>{mode === "login" ? "Sign in to your lab" : "Create your account"}</h2>
          <p className="subheading">{mode === "login" ? "Access your equipment bookings and reservations." : "New registrations receive the Student role."}</p>
          <form onSubmit={submit}>
            {mode === "register" && <label>Full name<input name="name" value={form.name} onChange={change} placeholder="Your name" required minLength="2" /></label>}
            <label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="you@university.edu" required /></label>
            <label>Password<input name="password" type="password" value={form.password} onChange={change} placeholder="At least 8 characters" required minLength="8" /></label>
            {error && <p className="alert error">{error}</p>}
            <button className="primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in ↗" : "Create account ↗"}</button>
          </form>
          <p className="switch-auth">{mode === "login" ? "New to LabBook?" : "Already have an account?"} <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
          <p className="privacy-note">Your account is used only to manage your bookings.</p>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("labbook-session");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [tab, setTab] = useState("equipment");
  const [equipment, setEquipment] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({ equipmentId: "", date: "", startTime: "09:00", endTime: "10:00", purpose: "" });
  const [equipmentForm, setEquipmentForm] = useState({ name: "", description: "", location: "Main Laboratory" });

  const user = session?.user;
  const isAdmin = user?.role === "LAB_ADMIN";
  const canBook = user?.role === "STUDENT" || user?.role === "FACULTY";

  function saveSession(data) {
    localStorage.setItem("labbook-session", JSON.stringify(data));
    setSession(data);
    setNotice({ type: "success", text: `Welcome, ${data.user.name}.` });
  }

  function logout() {
    localStorage.removeItem("labbook-session");
    setSession(null);
    setEquipment([]);
    setBookings([]);
    setNotice(null);
  }

  async function loadData() {
    if (!session?.token) return;
    setLoading(true);
    try {
      const [eq, bk] = await Promise.all([
        request("/api/equipment", { token: session.token }),
        request("/api/bookings", { token: session.token })
      ]);
      setEquipment(eq.equipment);
      setBookings(bk.bookings);
    } catch (err) {
      if (/token|auth/i.test(err.message)) logout();
      else setNotice({ type: "error", text: err.message });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [session?.token]);

  const counts = useMemo(() => ({
    total: equipment.length,
    pending: bookings.filter(b => b.status === "PENDING").length,
    confirmed: bookings.filter(b => b.status === "CONFIRMED").length
  }), [equipment, bookings]);

  async function createBooking(event) {
    event.preventDefault();
    try {
      await request("/api/bookings", {
        token: session.token, method: "POST", body: JSON.stringify(bookingForm)
      });
      setNotice({ type: "success", text: "Booking request submitted for review." });
      setBookingForm({ equipmentId: "", date: "", startTime: "09:00", endTime: "10:00", purpose: "" });
      setTab("bookings");
      await loadData();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }

  async function cancelBooking(id) {
    try {
      await request(`/api/bookings/${id}/cancel`, { token: session.token, method: "PATCH" });
      setNotice({ type: "success", text: "Booking cancelled." });
      await loadData();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }

  async function reviewBooking(id, status) {
    try {
      await request(`/api/bookings/${id}/review`, {
        token: session.token, method: "PATCH", body: JSON.stringify({ status })
      });
      setNotice({ type: "success", text: `Booking ${status.toLowerCase()}.` });
      await loadData();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }

  async function addEquipment(event) {
    event.preventDefault();
    try {
      await request("/api/equipment", { token: session.token, method: "POST", body: JSON.stringify(equipmentForm) });
      setEquipmentForm({ name: "", description: "", location: "Main Laboratory" });
      setNotice({ type: "success", text: "Equipment added." });
      await loadData();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }

  async function toggleEquipment(item) {
    try {
      await request(`/api/equipment/${item.id}`, {
        token: session.token, method: "PATCH", body: JSON.stringify({ isAvailable: !item.isAvailable })
      });
      setNotice({ type: "success", text: `Equipment ${item.isAvailable ? "disabled" : "enabled"}.` });
      await loadData();
    } catch (err) { setNotice({ type: "error", text: err.message }); }
  }

  if (!session) return <AuthScreen onAuth={saveSession} />;

  const nav = [
    { id: "equipment", label: "Equipment" },
    { id: "bookings", label: isAdmin ? "All bookings" : "My bookings" },
    ...(canBook ? [{ id: "new-booking", label: "Request a slot" }] : []),
    ...(isAdmin ? [{ id: "manage-equipment", label: "Manage equipment" }] : [])
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span> LabBook</div>
        <p className="side-label">WORKSPACE</p>
        <nav>{nav.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="user-meta"><strong>{user.name}</strong><span>{ROLE_LABELS[user.role] || user.role}</span></div>
          <button className="logout" onClick={logout} title="Sign out">↗</button>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div><p className="eyebrow muted">LABORATORY RESOURCE MANAGEMENT</p><h1>{nav.find(n => n.id === tab)?.label || "Dashboard"}</h1></div><button className="outline" onClick={loadData}>{loading ? "Refreshing…" : "↻ Refresh"}</button></header>
        {notice && <div className={`alert ${notice.type}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}>×</button></div>}
        <section className="stats-grid">
          <article className="stat-card"><span>Equipment listed</span><strong>{counts.total}</strong><small>Resources in your lab</small></article>
          <article className="stat-card"><span>{isAdmin ? "Pending reviews" : "Pending requests"}</span><strong>{counts.pending}</strong><small>Awaiting a decision</small></article>
          <article className="stat-card"><span>Confirmed bookings</span><strong>{counts.confirmed}</strong><small>Approved time slots</small></article>
        </section>

        {tab === "equipment" && <section className="content-section">
          <div className="section-heading"><div><h2>Equipment directory</h2><p>Browse the resources available for laboratory work.</p></div></div>
          <div className="equipment-grid">
            {equipment.map((item, i) => <article className="equipment-card" key={item.id}>
              <div className={`equipment-icon icon-${i % 4}`}>{["◉", "▦", "⌬", "◎"][i % 4]}</div>
              <div className="card-row"><span className={`pill ${item.isAvailable ? "available" : "unavailable"}`}>{item.isAvailable ? "Available" : "Unavailable"}</span><span className="item-id">LAB-{String(item.id).padStart(3, "0")}</span></div>
              <h3>{item.name}</h3><p>{item.description}</p><div className="location">⌖ {item.location}</div>
              {canBook && item.isAvailable && <button className="primary full" onClick={() => { setBookingForm({ ...bookingForm, equipmentId: String(item.id) }); setTab("new-booking"); }}>Request a slot ↗</button>}
              {isAdmin && <button className="outline full" onClick={() => toggleEquipment(item)}>{item.isAvailable ? "Disable equipment" : "Enable equipment"}</button>}
            </article>)}
            {!equipment.length && <div className="empty-state">No equipment found. {isAdmin ? "Add equipment from Manage equipment." : "Please contact the lab administrator."}</div>}
          </div>
        </section>}

        {tab === "new-booking" && canBook && <section className="content-section narrow">
          <div className="section-heading"><div><h2>Request equipment</h2><p>Requests start as pending until a lab administrator reviews them.</p></div></div>
          <form className="panel-form" onSubmit={createBooking}>
            <label>Equipment<select required value={bookingForm.equipmentId} onChange={e => setBookingForm({ ...bookingForm, equipmentId: e.target.value })}><option value="">Choose equipment</option>{equipment.filter(e => e.isAvailable).map(e => <option key={e.id} value={e.id}>{e.name} — {e.location}</option>)}</select></label>
            <label>Date<input type="date" required min={new Date().toISOString().slice(0, 10)} value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })} /></label>
            <div className="form-row"><label>Start time<input type="time" required value={bookingForm.startTime} onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })} /></label><label>End time<input type="time" required value={bookingForm.endTime} onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })} /></label></div>
            <label>Purpose (optional)<textarea rows="3" maxLength="500" value={bookingForm.purpose} onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })} placeholder="Briefly describe the experiment or activity" /></label>
            <button className="primary" disabled={!equipment.some(e => e.id === Number(bookingForm.equipmentId) && e.isAvailable)}>Submit booking request ↗</button>
          </form>
        </section>}

        {tab === "bookings" && <section className="content-section">
          <div className="section-heading"><div><h2>{isAdmin ? "Booking requests" : "Your reservations"}</h2><p>{isAdmin ? "Review requests and manage the booking schedule." : "Track each request from submission to final status."}</p></div></div>
          <div className="table-wrap"><table><thead><tr>{isAdmin && <th>Requester</th>}<th>Equipment</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {bookings.map(b => <tr key={b.id}>
              {isAdmin && <td><strong>{b.user?.name}</strong><small className="cell-sub">{b.user?.role}</small></td>}
              <td><strong>{b.equipment?.name || `Equipment #${b.equipmentId}`}</strong><small className="cell-sub">{b.purpose || "No purpose provided"}</small></td>
              <td>{prettyDate(b.date)}</td><td>{b.startTime}–{b.endTime}</td><td><span className={`pill status-${b.status.toLowerCase()}`}>{b.status}</span></td>
              <td><div className="actions">
                {isAdmin && b.status === "PENDING" && <><button className="mini success" onClick={() => reviewBooking(b.id, "CONFIRMED")}>Confirm</button><button className="mini danger" onClick={() => reviewBooking(b.id, "REJECTED")}>Reject</button></>}
                {["PENDING", "CONFIRMED"].includes(b.status) && <button className="mini" onClick={() => cancelBooking(b.id)}>Cancel</button>}
                {!isAdmin && !["PENDING", "CONFIRMED"].includes(b.status) && <span className="muted-text">—</span>}
              </div></td>
            </tr>)}
            {!bookings.length && <tr><td colSpan={isAdmin ? 6 : 5}><div className="empty-state">No bookings yet.</div></td></tr>}
          </tbody></table></div>
        </section>}

        {tab === "manage-equipment" && isAdmin && <section className="content-section narrow">
          <div className="section-heading"><div><h2>Add equipment</h2><p>Add a resource to the directory.</p></div></div>
          <form className="panel-form" onSubmit={addEquipment}>
            <label>Equipment name<input required value={equipmentForm.name} onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })} /></label>
            <label>Description<textarea required rows="3" value={equipmentForm.description} onChange={e => setEquipmentForm({ ...equipmentForm, description: e.target.value })} /></label>
            <label>Lab location<input required value={equipmentForm.location} onChange={e => setEquipmentForm({ ...equipmentForm, location: e.target.value })} /></label>
            <button className="primary">Add equipment ↗</button>
          </form>
          <div className="management-list">{equipment.map(item => <div className="management-row" key={item.id}><div><strong>{item.name}</strong><span>{item.location}</span></div><button className="outline" onClick={() => toggleEquipment(item)}>{item.isAvailable ? "Disable" : "Enable"}</button></div>)}</div>
        </section>}
        <footer className="footer">LABBOOK <span>•</span> LABORATORY EQUIPMENT BOOKING SYSTEM <span>•</span> DEVELOPMENT MVP</footer>
      </main>
    </div>
  );
}

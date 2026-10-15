import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "/api";
const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORIES = ["TECHNICAL", "BILLING", "ACCOUNT", "GENERAL"];

const emptyStats = { total: 0, open: 0, inProgress: 0, waiting: 0, resolved: 0 };

function formatLabel(value) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [ticketsResponse, statsResponse] = await Promise.all([
        fetch(`${API}/tickets`),
        fetch(`${API}/tickets/stats`),
      ]);
      if (!ticketsResponse.ok || !statsResponse.ok) {
        throw new Error("SupportDesk API is unavailable");
      }
      setTickets(await ticketsResponse.json());
      setStats(await statsResponse.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleTickets = useMemo(
    () => (filter === "ALL" ? tickets : tickets.filter((ticket) => ticket.status === filter)),
    [filter, tickets],
  );

  const updateStatus = async (ticket) => {
    const currentIndex = STATUSES.indexOf(ticket.status);
    const nextStatus = STATUSES[(currentIndex + 1) % STATUSES.length];
    try {
      setError("");
      const response = await fetch(`${API}/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Unable to update the ticket");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeTicket = async (ticket) => {
    if (!window.confirm(`Delete ticket “${ticket.subject}”?`)) return;
    try {
      setError("");
      const response = await fetch(`${API}/tickets/${ticket.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete the ticket");
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createTicket = async (event) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      setError("");
      const response = await fetch(`${API}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.get("subject"),
          description: form.get("description"),
          requester: form.get("requester"),
          category: form.get("category"),
          priority: form.get("priority"),
          assignee: form.get("assignee") || "Unassigned",
          status: "OPEN",
        }),
      });
      if (!response.ok) throw new Error("Unable to create the ticket");
      event.currentTarget.reset();
      setShowForm(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <strong>SupportDesk</strong>
            <small>Customer operations</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <a className="active" href="#dashboard">▦ <span>Ticket queue</span></a>
          <a href="#customers">◎ <span>Customers</span></a>
          <a href="#knowledge">◫ <span>Knowledge base</span></a>
          <a href="#activity">◌ <span>Activity</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="service-note">
            <strong>Resolve with confidence.</strong>
            <p>Track every customer conversation from open to resolved.</p>
          </div>
          <div className="profile">
            <div className="avatar">SA</div>
            <div><strong>Support admin</strong><small>Operations team</small></div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">SUPPORT OPERATIONS / OVERVIEW</p>
            <h1>Good morning, Support team <span aria-hidden="true">👋</span></h1>
            <p className="muted">Keep customer requests moving and close the loop today.</p>
          </div>
          <button className="primary-button" onClick={() => setShowForm(true)}>＋ New ticket</button>
        </header>

        {error && <div className="alert" role="alert">⚠ {error}. Check the backend and PostgreSQL services, then refresh.</div>}

        <section className="stats-grid" aria-label="Ticket statistics">
          <Stat label="All tickets" value={stats.total} icon="▦" />
          <Stat label="Open" value={stats.open} icon="○" tone="blue" />
          <Stat label="In progress" value={stats.inProgress} icon="◔" tone="amber" />
          <Stat label="Resolved" value={stats.resolved} icon="✓" tone="green" />
        </section>

        <section className="dashboard-grid">
          <div className="panel tickets-panel">
            <div className="panel-header">
              <div>
                <h2>Ticket queue</h2>
                <p className="muted">Prioritize customer requests across every support channel.</p>
              </div>
              <div className="filters" aria-label="Ticket filters">
                {["ALL", ...STATUSES].map((status) => (
                  <button className={filter === status ? "selected" : ""} onClick={() => setFilter(status)} key={status}>
                    {status === "ALL" ? "All" : formatLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? <div className="empty-state">Loading ticket queue…</div> : visibleTickets.length === 0 ? (
              <div className="empty-state"><strong>No tickets in this view.</strong><span>Create a ticket to start tracking customer support work.</span></div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Ticket</th><th>Requester</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {visibleTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td><div className="ticket-cell"><span className={`status-dot ${ticket.status.toLowerCase()}`} /><div><strong>{ticket.subject}</strong><small>#{String(ticket.id).padStart(4, "0")} · {formatLabel(ticket.category)}</small></div></div></td>
                        <td><span className="requester">{ticket.requester}</span><small className="sub-cell">Assigned to {ticket.assignee}</small></td>
                        <td><span className={`priority priority-${ticket.priority.toLowerCase()}`}>{formatLabel(ticket.priority)}</span></td>
                        <td><button className={`status-button status-${ticket.status.toLowerCase()}`} onClick={() => updateStatus(ticket)} title="Advance ticket status">{formatLabel(ticket.status)}</button></td>
                        <td><button className="delete-button" onClick={() => removeTicket(ticket)} aria-label={`Delete ${ticket.subject}`}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="panel activity-panel" id="activity">
            <div className="panel-header"><div><h2>Queue health</h2><p className="muted">A quick view of today’s workload.</p></div></div>
            <div className="health-list">
              <HealthRow label="Open tickets" value={stats.open} tone="blue" />
              <HealthRow label="Awaiting customer" value={stats.waiting} tone="amber" />
              <HealthRow label="Resolved today" value={stats.resolved} tone="green" />
            </div>
            <div className="pipeline"><div className="pipeline-title"><strong>Resolution pipeline</strong><span>{stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%</span></div><div className="progress-track"><span style={{ width: `${stats.total ? (stats.resolved / stats.total) * 100 : 0}%` }} /></div><small>Tickets resolved from the current queue</small></div>
          </aside>
        </section>
      </main>

      {showForm && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title"><div className="modal-header"><div><p className="eyebrow">CUSTOMER SUPPORT</p><h2 id="new-ticket-title">Create a ticket</h2></div><button className="close-button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={createTicket}><label>Subject<input name="subject" required maxLength="200" placeholder="What does the customer need help with?" /></label><label>Description<textarea name="description" rows="3" placeholder="Add the context the support team needs…" /></label><div className="form-grid"><label>Requester<input name="requester" required defaultValue="Customer" /></label><label>Category<select name="category" defaultValue="GENERAL">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Priority<select name="priority" defaultValue="MEDIUM">{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label><label>Assignee<input name="assignee" placeholder="Unassigned" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Creating…" : "Create ticket"}</button></div></form></div></div>}
    </div>
  );
}

function Stat({ label, value, icon, tone = "default" }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><small>{label}</small><strong>{value}</strong><span>Updated just now</span></div></div>;
}

function HealthRow({ label, value, tone }) {
  return <div className="health-row"><span className={`health-icon ${tone}`} /> <span>{label}</span><strong>{value}</strong></div>;
}

createRoot(document.getElementById("root")).render(<App />);

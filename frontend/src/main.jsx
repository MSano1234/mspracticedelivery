import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const STATUSES = [
  "Pending",
  "Assigned",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Cancelled"
];

function App() {
  const [deliveries, setDeliveries] = useState([]);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    pickupAddress: "",
    dropoffAddress: "",
    packageDescription: "",
    driverName: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const stats = useMemo(() => ({
    total: deliveries.length,
    active: deliveries.filter((d) =>
      ["Assigned", "Picked Up", "In Transit"].includes(d.status)
    ).length,
    delivered: deliveries.filter((d) => d.status === "Delivered").length,
    pending: deliveries.filter((d) => d.status === "Pending").length
  }), [deliveries]);

  const request = async (path = "", options = {}) => {
    if (!API_URL) throw new Error("VITE_API_URL has not been configured.");
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed.");
    return data;
  };

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      setDeliveries(await request("/deliveries"));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      const created = await request("/deliveries", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setDeliveries((current) => [created, ...current]);
      setForm({
        customerName: "",
        phone: "",
        pickupAddress: "",
        dropoffAddress: "",
        packageDescription: "",
        driverName: ""
      });
      setMessage("Delivery created successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const updated = await request(`/deliveries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setDeliveries((current) =>
        current.map((delivery) => delivery.id === id ? updated : delivery)
      );
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteDelivery = async (id) => {
    if (!window.confirm("Delete this delivery?")) return;
    try {
      await request(`/deliveries/${id}`, { method: "DELETE" });
      setDeliveries((current) => current.filter((delivery) => delivery.id !== id));
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="app-shell">
      <header>
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>SwiftDrop</h1>
            <p>Serverless delivery operations</p>
          </div>
        </div>
        <span className="aws-pill">Built on AWS</span>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">DELIVERY MANAGEMENT</p>
            <h2>Track every delivery from request to doorstep.</h2>
            <p className="hero-copy">
              Create orders, assign drivers, and update delivery progress through
              a serverless AWS application.
            </p>
          </div>
        </section>

        <section className="stats">
          <Stat label="Total deliveries" value={stats.total} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Active" value={stats.active} />
          <Stat label="Delivered" value={stats.delivered} />
        </section>

        <section className="workspace">
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">NEW ORDER</p>
                <h3>Create a delivery</h3>
              </div>
            </div>

            <label>
              Customer name
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="Jordan Smith"
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 555-0123"
              />
            </label>

            <label>
              Pickup address
              <input
                required
                value={form.pickupAddress}
                onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
                placeholder="123 Market Street"
              />
            </label>

            <label>
              Drop-off address
              <input
                required
                value={form.dropoffAddress}
                onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })}
                placeholder="500 Main Avenue"
              />
            </label>

            <label>
              Package
              <input
                value={form.packageDescription}
                onChange={(e) => setForm({ ...form, packageDescription: e.target.value })}
                placeholder="Small electronics box"
              />
            </label>

            <label>
              Driver
              <input
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                placeholder="Optional"
              />
            </label>

            <button disabled={saving} type="submit">
              {saving ? "Creating..." : "Create delivery"}
            </button>
            {message && <p className="message">{message}</p>}
          </form>

          <section className="panel orders-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">LIVE OPERATIONS</p>
                <h3>Delivery orders</h3>
              </div>
              <button className="secondary" onClick={loadDeliveries}>
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="empty">Loading deliveries...</p>
            ) : deliveries.length === 0 ? (
              <p className="empty">No deliveries yet. Create your first order.</p>
            ) : (
              <div className="delivery-list">
                {deliveries.map((delivery) => (
                  <article className="delivery-card" key={delivery.id}>
                    <div className="delivery-top">
                      <div>
                        <span className={`status ${delivery.status.toLowerCase().replaceAll(" ", "-")}`}>
                          {delivery.status}
                        </span>
                        <h4>{delivery.customerName}</h4>
                        <p className="order-id">#{delivery.id.slice(0, 8)}</p>
                      </div>
                      <button
                        className="delete"
                        onClick={() => deleteDelivery(delivery.id)}
                        aria-label="Delete delivery"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="route">
                      <div><span>PICKUP</span><strong>{delivery.pickupAddress}</strong></div>
                      <div className="route-line">↓</div>
                      <div><span>DROP-OFF</span><strong>{delivery.dropoffAddress}</strong></div>
                    </div>

                    <div className="details">
                      <p><span>Driver</span>{delivery.driverName}</p>
                      <p><span>Package</span>{delivery.packageDescription || "Not specified"}</p>
                      <p><span>Created</span>{new Date(delivery.createdAt).toLocaleString()}</p>
                    </div>

                    <label className="status-control">
                      Update status
                      <select
                        value={delivery.status}
                        onChange={(e) => updateStatus(delivery.id, e.target.value)}
                      >
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>

      <footer>
        SwiftDrop portfolio project · React · API Gateway · Lambda · DynamoDB
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);

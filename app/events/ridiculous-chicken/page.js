"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import { useAuth } from "@/lib/auth-context";

const TICKETS = [
  {
    id: "regular",
    name: "Regular Ticket (21+)",
    price: 15,
    currency: "USD",
    inventory: 100,
    description: "For guests aged 21 and older."
  },
  {
    id: "special",
    name: "Special Ticket (18-20)",
    price: 30,
    currency: "USD",
    inventory: 50,
    description: "Exclusive seating for guests aged 18鈥?0."
  }
];

const EVENT = {
  name: "Ridiculous Chicken Night Event",
  description:
    "Enjoy delicious chicken and an unforgettable night at Virginia Tech's most popular pop-up. Fresh ingredients, unique cooking methods, and the warmest service guaranteed.",
  time: "October 25, 2025 8:00 PM",
  venue: "201 N Main St SUITE A, Blacksburg, VA 24060",
  duration: "3 hours",
  ageRestriction: "18+"
};

export default function RidiculousChickenEvent() {
  const { user: authUser } = useAuth();
  const [selectedTicketId, setSelectedTicketId] = useState(TICKETS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAge, setCustomerAge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authUser) {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerAge("");
      return;
    }

    const metadata = authUser.user_metadata ?? {};
    const name = metadata.full_name ?? metadata.name ?? metadata.display_name ?? authUser.email ?? "";
    const email = authUser.email ?? "";
    const age = metadata.age ?? metadata.birth_year ?? "";

    setCustomerName(name);
    setCustomerEmail(email);
    setCustomerAge(age ? String(age) : "");
  }, [authUser]);

  const selectedTicket = useMemo(
    () => TICKETS.find((ticket) => ticket.id === selectedTicketId),
    [selectedTicketId]
  );

  const totalPrice = useMemo(() => {
    if (!selectedTicket) {
      return 0;
    }
    return selectedTicket.price * quantity;
  }, [selectedTicket, quantity]);

  const handlePurchase = async () => {
    setError("");

    if (!selectedTicket) {
      setError("Please select a ticket type.");
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setError("Please enter your name and email.");
      return;
    }

    const ageNumber = Number(customerAge);
    if (Number.isNaN(ageNumber) || ageNumber < 18 || ageNumber > 120) {
      setError("This event is 18+. Please provide a valid age.");
      return;
    }

    if (selectedTicket.inventory !== null && quantity > selectedTicket.inventory) {
      setError("Not enough tickets remaining.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_id: "ridiculous-chicken-night",
          price_id: selectedTicket.id,
          quantity,
          customer_email: customerEmail.trim(),
          customer_name: customerName.trim(),
          customer_age: ageNumber
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(result?.message || "Failed to start checkout.");
      }

      window.location.href = result.url;
    } catch (purchaseError) {
      console.error("Failed to create checkout session", purchaseError);
      setError(purchaseError?.message || "Unable to process your order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard redirectTo="/auth/login">
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)",
          paddingBottom: "64px"
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
          <Link href="/events" style={{ color: "rgba(226,232,240,0.7)", display: "inline-flex", gap: "8px" }}>
            鈫?Back to events
          </Link>

          <div
            style={{
              marginTop: "24px",
              background: "rgba(15, 23, 42, 0.75)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.55)",
              padding: "32px"
            }}
          >
            <header style={{ marginBottom: "24px" }}>
              <h1 style={{ color: "#fff", fontSize: "34px", marginBottom: "12px" }}>{EVENT.name}</h1>
              <p style={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.6 }}>{EVENT.description}</p>
              <ul style={{ listStyle: "none", padding: 0, marginTop: "16px", color: "rgba(226,232,240,0.78)" }}>
                <li><strong>Time:</strong> {EVENT.time}</li>
                <li><strong>Venue:</strong> {EVENT.venue}</li>
                <li><strong>Duration:</strong> {EVENT.duration}</li>
                <li><strong>Age Restriction:</strong> {EVENT.ageRestriction}</li>
              </ul>
            </header>

            <section style={{ display: "grid", gap: "24px" }}>
              <div>
                <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                  Ticket type
                </label>
                <select
                  value={selectedTicketId}
                  onChange={(event) => setSelectedTicketId(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#fff"
                  }}
                >
                  {TICKETS.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.name} 鈥?${ticket.price.toFixed(2)} {ticket.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.min(10, Math.max(1, Number(event.target.value))))}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#fff"
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Your full name"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="example@email.com"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px", marginBottom: "8px", display: "block" }}>
                    Age
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={customerAge}
                    onChange={(event) => setCustomerAge(event.target.value)}
                    placeholder="Age"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: "8px", color: "rgba(226,232,240,0.78)", fontSize: "16px" }}>
                Total: <strong style={{ color: "#fff" }}>${totalPrice.toFixed(2)} USD</strong>
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    borderRadius: "12px",
                    padding: "12px",
                    color: "#fecaca"
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handlePurchase}
                disabled={loading}
                style={{
                  padding: "14px 20px",
                  borderRadius: "14px",
                  border: "none",
                  background: loading
                    ? "rgba(148, 163, 184, 0.25)"
                    : "linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "16px",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Processing..." : "Buy tickets"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
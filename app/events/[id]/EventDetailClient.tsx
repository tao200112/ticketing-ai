"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { requires21Plus } from "@/lib/ticket-helpers";
import type { EventDetail, Price } from "../../../lib/schemas/event";

interface EventDetailClientProps {
  event: EventDetail;
}

const MIN_TICKETS = 1;
const MAX_TICKETS = 10;

function formatDate(value: string | Date | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    console.warn("Failed to format date", error);
    return String(value);
  }
}

export default function EventDetailClient({ event }: EventDetailClientProps) {
  const { user: authUser } = useAuth();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedPriceId, setSelectedPriceId] = useState<string>(event.prices[0]?.id ?? "");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerAge, setCustomerAge] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

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

  const selectedPrice: Price | undefined = useMemo(
    () => event.prices.find((price) => price.id === selectedPriceId),
    [event.prices, selectedPriceId]
  );

  const totalPrice = useMemo(() => {
    if (!selectedPrice) {
      return 0;
    }

    return (selectedPrice.amount * quantity) / 100;
  }, [selectedPrice, quantity]);

  const handlePurchase = async () => {
    setPaymentError("");

    if (!selectedPrice) {
      setPaymentError("Please select a ticket type.");
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setPaymentError("Please provide your name and email.");
      return;
    }

    const ageNumber = Number(customerAge);
    if (Number.isNaN(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      setPaymentError("Please enter a valid age between 1 and 120.");
      return;
    }

    if (requires21Plus(selectedPrice.ticket_kind ?? null) && ageNumber < 21) {
      setPaymentError("This ticket requires you to be at least 21 years old.");
      return;
    }

    if (selectedPrice.inventory !== null && selectedPrice.inventory !== undefined && quantity > selectedPrice.inventory) {
      setPaymentError("Not enough inventory remaining for this ticket type.");
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_id: event.id,
          price_id: selectedPrice.id,
          quantity,
          customer_email: customerEmail.trim(),
          customer_name: customerName.trim(),
          customer_age: ageNumber
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.url) {
        throw new Error(result?.message || "Failed to create checkout session.");
      }

      window.location.href = result.url;
    } catch (error) {
      console.error("Failed to create checkout session", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout. Please try again.";
      setPaymentError(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  const canPurchase = Boolean(selectedPrice) && !paymentLoading;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)",
        paddingBottom: "64px"
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 0" }}>
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
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "32px" }}>
            <header style={{ marginBottom: "32px" }}>
              <p style={{ color: "rgba(165, 180, 252, 0.85)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Featured event
              </p>
              <h1 style={{ color: "#fff", fontSize: "36px", margin: "12px 0" }}>{event.title}</h1>
              {event.description && (
                <p style={{ color: "rgba(226,232,240,0.78)", maxWidth: "760px" }}>{event.description}</p>
              )}
            </header>

            <section
              style={{
                display: "grid",
                gap: "32px",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                marginBottom: "40px"
              }}
            >
              <div>
                <h2 style={{ color: "#fff", fontSize: "18px", marginBottom: "12px" }}>Event details</h2>
                <ul style={{ color: "rgba(226,232,240,0.78)", listStyle: "none", padding: 0, lineHeight: 1.6 }}>
                  <li><strong>Starts:</strong> {formatDate(event.start_time)}</li>
                  {event.end_time && <li><strong>Ends:</strong> {formatDate(event.end_time)}</li>}
                  {event.venue && <li><strong>Venue:</strong> {event.venue}</li>}
                  {event.location && <li><strong>Location:</strong> {event.location}</li>}
                </ul>
              </div>

              <div>
                <h2 style={{ color: "#fff", fontSize: "18px", marginBottom: "12px" }}>Purchase</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px" }}>Ticket type</label>
                  <select
                    value={selectedPriceId}
                    onChange={(event) => setSelectedPriceId(event.target.value)}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  >
                    {event.prices.map((price) => (
                      <option key={price.id} value={price.id}>
                        {price.label} 鈥?${(price.amount / 100).toFixed(2)} {price.currency || "USD"}
                      </option>
                    ))}
                  </select>

                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px" }}>Quantity</label>
                  <input
                    type="number"
                    min={MIN_TICKETS}
                    max={MAX_TICKETS}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.min(MAX_TICKETS, Math.max(MIN_TICKETS, Number(event.target.value))))}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />

                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px" }}>Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Your full name"
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />

                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px" }}>Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="example@email.com"
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />

                  <label style={{ color: "rgba(226,232,240,0.78)", fontSize: "14px" }}>Age</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={customerAge}
                    onChange={(event) => setCustomerAge(event.target.value)}
                    placeholder="Age"
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(15,23,42,0.6)",
                      color: "#fff"
                    }}
                  />

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px"
                  }}>
                    <span style={{ color: "rgba(226,232,240,0.78)" }}>Total</span>
                    <strong style={{ color: "#fff", fontSize: "20px" }}>
                      ${totalPrice.toFixed(2)} {selectedPrice?.currency || "USD"}
                    </strong>
                  </div>

                  {paymentError && (
                    <div
                      style={{
                        background: "rgba(248,113,113,0.12)",
                        border: "1px solid rgba(248,113,113,0.3)",
                        borderRadius: "12px",
                        padding: "12px",
                        color: "#fecaca"
                      }}
                    >
                      {paymentError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePurchase}
                    disabled={!canPurchase}
                    style={{
                      marginTop: "8px",
                      padding: "14px 20px",
                      borderRadius: "14px",
                      border: "none",
                      background: canPurchase
                        ? "linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)"
                        : "rgba(148, 163, 184, 0.25)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "16px",
                      cursor: canPurchase ? "pointer" : "not-allowed",
                      transition: "opacity 0.2s ease"
                    }}
                  >
                    {paymentLoading ? "Processing..." : "Proceed to checkout"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
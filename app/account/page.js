"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import NavbarPartyTix from "../../components/NavbarPartyTix";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseClient } from "@/lib/supabase-client";
import { QRCodeSVG } from "qrcode.react";
import { getTicketKindDisplayName, getTicketKindCategoryName } from "@/lib/ticket-helpers";
import { requiresPasswordSetup } from "@/lib/auth/password-placeholder";

function AccountPageContent() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!authUser) {
      return;
    }

    if (!supabase) {
      setErrorMessage("Supabase client is not configured.");
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const [userResult, ordersResult, ticketsResult] = await Promise.all([
          supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("*")
            .or(`user_id.eq.${authUser.id},customer_email.eq.${authUser.email || ""}`)
            .order("created_at", { ascending: false }),
          supabase
            .from("tickets")
            .select(
              `*,
              orders ( id, status, total_amount_cents, created_at ),
              events ( id, title, start_at, venue_name, address )`
            )
            .or(`user_id.eq.${authUser.id},holder_email.eq.${authUser.email || ""}`)
            .order("created_at", { ascending: false })
        ]);

        if (isCancelled) {
          return;
        }

        if (userResult.error) {
          console.error("Failed to load user profile", userResult.error);
        }

        const enrichedProfile = userResult.data
          ? {
              ...userResult.data,
              has_password:
                !!userResult.data.password_hash &&
                !requiresPasswordSetup(userResult.data)
            }
          : {
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.full_name || authUser.email,
              has_password: true
            };

        setProfile(enrichedProfile);
        setOrders(Array.isArray(ordersResult.data) ? ordersResult.data : []);
        setTickets(Array.isArray(ticketsResult.data) ? ticketsResult.data : []);
      } catch (error) {
        console.error("Failed to load account data", error);
        if (!isCancelled) {
          setErrorMessage(error.message || "Failed to load account data");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [authLoading, authUser, supabase]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  const handleResendVerification = async () => {
    if (!authUser?.email || !supabase) {
      return;
    }

    setResendingVerification(true);
    setVerificationMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: authUser.email
      });

      if (error) {
        setVerificationMessage(error.message || "Failed to send verification email.");
        return;
      }

      setVerificationMessage("Verification email has been resent, please check your inbox.");
    } catch (error) {
      console.error("Failed to resend verification email", error);
      setVerificationMessage("Network error, please try again later.");
    } finally {
      setResendingVerification(false);
    }
  };

  const renderLoading = () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)"
      }}
    >
      <div
        style={{
          width: "3rem",
          height: "3rem",
          border: "4px solid rgba(255,255,255,0.2)",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}
      />
    </div>
  );

  const groupedTickets = useMemo(() => {
    const groups = new Map();

    for (const ticket of tickets) {
      const category = getTicketKindCategoryName(ticket.ticket_kind);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(ticket);
    }

    return Array.from(groups.entries());
  }, [tickets]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)"
      }}
    >
      <NavbarPartyTix />

      {loading || authLoading ? (
        renderLoading()
      ) : (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.65)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.45)",
              padding: "32px"
            }}
          >
            {errorMessage && (
              <div
                style={{
                  background: "rgba(248, 113, 113, 0.15)",
                  border: "1px solid rgba(248, 113, 113, 0.35)",
                  borderRadius: "12px",
                  padding: "16px",
                  color: "#fecaca",
                  marginBottom: "24px"
                }}
              >
                {errorMessage}
              </div>
            )}

            <header
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "32px"
              }}
            >
              <div>
                <p style={{ color: "rgba(148, 163, 184, 0.9)", marginBottom: "8px" }}>Welcome back</p>
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0
                  }}
                >
                  {profile?.name || authUser?.user_metadata?.full_name || authUser?.email}
                </h1>
                <p style={{ color: "rgba(226, 232, 240, 0.75)", marginTop: "6px" }}>
                  {profile?.email || authUser?.email}
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "12px",
                    border: "1px solid rgba(248, 113, 113, 0.4)",
                    background: "rgba(248, 113, 113, 0.15)",
                    color: "#fecaca",
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  Logout
                </button>

                {!authUser?.email_confirmed_at && (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "1px solid rgba(251, 191, 36, 0.4)",
                      background: "rgba(251, 191, 36, 0.15)",
                      color: "#facc15",
                      fontWeight: 500,
                      cursor: resendingVerification ? "not-allowed" : "pointer"
                    }}
                  >
                    {resendingVerification ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </div>

              {verificationMessage && (
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    color: "#bbf7d0",
                    maxWidth: "420px"
                  }}
                >
                  {verificationMessage}
                </div>
              )}

              {profile?.has_password === false && (
                <div
                  style={{
                    background: "rgba(96, 165, 250, 0.18)",
                    border: "1px solid rgba(96, 165, 250, 0.35)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    color: "#bfdbfe",
                    maxWidth: "420px"
                  }}
                >
                  For added security please set a password via the reset password flow.
                </div>
              )}
            </header>

            <section style={{ marginBottom: "32px" }}>
              <h2 style={{ color: "#fff", fontSize: "20px", marginBottom: "16px" }}>Recent Orders</h2>
              {orders.length === 0 ? (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    padding: "24px",
                    color: "rgba(226, 232, 240, 0.7)"
                  }}
                >
                  No orders yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "16px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px"
                      }}
                    >
                      <div>
                        <p style={{ color: "rgba(226, 232, 240, 0.75)", marginBottom: "6px" }}>
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p style={{ color: "#fff", fontWeight: 600 }}>
                          ${(order.total_amount_cents || 0) / 100} USD
                        </p>
                        <p style={{ color: "rgba(148, 163, 184, 0.75)", marginTop: "4px" }}>
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span
                          style={{
                            background: "rgba(94, 234, 212, 0.12)",
                            color: "#99f6e4",
                            padding: "6px 12px",
                            borderRadius: "12px",
                            textTransform: "capitalize",
                            fontSize: "12px"
                          }}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 style={{ color: "#fff", fontSize: "20px", marginBottom: "16px" }}>Tickets</h2>
              {tickets.length === 0 ? (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    padding: "24px",
                    color: "rgba(226, 232, 240, 0.7)"
                  }}
                >
                  You do not have any tickets yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "20px" }}>
                  {groupedTickets.map(([category, ticketsInCategory]) => (
                    <div key={category}
                      style={{
                        background: "rgba(15, 23, 42, 0.5)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "16px",
                        padding: "20px"
                      }}
                    >
                      <h3 style={{ color: "#fff", fontSize: "18px", marginBottom: "16px" }}>
                        {category} ({ticketsInCategory.length})
                      </h3>
                      <div style={{ display: "grid", gap: "16px" }}>
                        {ticketsInCategory.map((ticket) => (
                          <div
                            key={ticket.id}
                            style={{
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "16px",
                              padding: "16px",
                              display: "grid",
                              gridTemplateColumns: "1fr 160px",
                              gap: "16px"
                            }}
                          >
                            <div>
                              <p style={{ color: "#fff", fontWeight: 600, marginBottom: "6px" }}>
                                {ticket.events?.title || ticket.event_title_snapshot || "Event"}
                              </p>
                              <p style={{ color: "rgba(226, 232, 240, 0.7)", marginBottom: "4px" }}>
                                Tier: {ticket.tier || "General"}
                              </p>
                              <p style={{ color: "rgba(148, 163, 184, 0.75)", marginBottom: "4px" }}>
                                {ticket.ticket_kind ? getTicketKindDisplayName(ticket.ticket_kind) : "Ticket"}
                              </p>
                              <p style={{ color: "rgba(148, 163, 184, 0.75)" }}>
                                {ticket.events?.venue_name || ticket.event_venue_snapshot}
                              </p>
                            </div>
                            <div
                              style={{
                                background: "#fff",
                                borderRadius: "12px",
                                padding: "12px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "8px"
                              }}
                            >
                              <QRCodeSVG
                                value={`${typeof window !== "undefined" ? window.location.origin : ""}/ticket/${ticket.short_id || ticket.id}`}
                                size={120}
                                level="M"
                              />
                              <span style={{ fontSize: "12px", color: "#4b5563" }}>
                                #{ticket.short_id || ticket.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard redirectTo="/auth/login">
      <AccountPageContent />
    </AuthGuard>
  );
}
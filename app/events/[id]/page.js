"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import EventDetailClient from "./EventDetailClient";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params?.id[0] : undefined;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let isCancelled = false;

    const fetchEvent = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/events/${eventId}`);
        const result = await response.json();

        if (!isCancelled) {
          if (result.success && result.data) {
            setEvent(result.data);
          } else {
            setError(result.message || "Event not found");
          }
        }
      } catch (fetchError) {
        if (!isCancelled) {
          console.error("Failed to load event", fetchError);
          setError("Failed to load event, please try again later.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  return (
    <AuthGuard redirectTo="/auth/login">
      {loading ? (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)",
            color: "#fff"
          }}
        >
          Loading event...
        </div>
      ) : error ? (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%)",
            color: "#fff",
            textAlign: "center"
          }}
        >
          {error}
        </div>
      ) : event ? (
        <EventDetailClient event={event} />
      ) : null}
    </AuthGuard>
  );
}
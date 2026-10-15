import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  BookingConfirmation,
  Confirmation,
} from "../components/BookingConfirmation";

/** Paystack sends guests here (?reference=…) after paying for a booking. */
export function PublicPaymentComplete() {
  const { identifier, org_id } = useParams();
  const storeIdentifier = identifier || org_id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [data, setData] = useState<Confirmation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setError("No payment reference was provided.");
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    axios
      .post(`${baseUrl}/public/payments/verify/`, { reference })
      .then((res) => setData(res.data))
      .catch((e) =>
        setError(
          e.response?.data?.error ||
            "We couldn't confirm your payment. If you were charged, contact the vendor with your payment reference.",
        ),
      );
  }, [reference]);

  const back = () => navigate(`/public/store/${storeIdentifier}`);

  if (data) {
    return (
      <BookingConfirmation
        data={data}
        paid
        onDone={back}
        doneLabel="Back to rentals"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-8 text-center shadow-xl">
        {error ? (
          <>
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-main)]">
              Payment not confirmed
            </h2>
            <p className="text-[var(--text-muted)] mt-2 text-sm">{error}</p>
            {reference && (
              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Payment reference:{" "}
                <span className="font-mono text-[var(--text-main)]">
                  {reference}
                </span>
              </p>
            )}
            <button
              onClick={back}
              className="mt-6 w-full py-3 bg-brand-primary text-[var(--text-on-brand)] rounded-xl font-bold hover:opacity-90"
            >
              Back to rentals
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[var(--text-link)] mx-auto" />
            <h2 className="text-xl font-black text-[var(--text-main)] mt-5">
              Confirming your payment…
            </h2>
            <p className="text-[var(--text-muted)] mt-2 text-sm">
              Please don't close this page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

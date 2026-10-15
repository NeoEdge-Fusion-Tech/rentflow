import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import { formatPrice } from "../components/StoreFilters";
import {
  BookingConfirmation,
  Confirmation,
} from "../components/BookingConfirmation";
import {
  OpeningHours,
  openingStatus,
  checkBookingTime,
} from "../components/OpeningHours";

// datetime-local values are wall-clock times in the customer's own zone.
const toInstant = (value: string) => (value ? new Date(value).getTime() : NaN);
const toISO = (value: string) => {
  const t = toInstant(value);
  return isNaN(t) ? value : new Date(t).toISOString();
};

export function PublicRentalCheckout() {
  const { org_id, identifier } = useParams();
  const storeIdentifier = identifier || org_id;
  const location = useLocation();
  const navigate = useNavigate();
  const cart = location.state?.cart || [];

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState("");
  // Which button submitted the form.
  const [payMode, setPayMode] = useState<"pay" | "request">("pay");
  const [settings, setSettings] = useState<any>(null);

  const [formData, setFormData] = useState({
    contact_name: "",
    email: "",
    contact_phone: "",
    event_name: "",
    event_type: "corporate",
    country: "Nigeria",
    city: "",
    address: "",
    setup_date: "",
    event_date: "",
    set_down_date: "",
    note_for_org: "",
  });

  useEffect(() => {
    if (cart.length === 0) {
      navigate(`/public/store/${storeIdentifier}`);
      return;
    }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const res = await axios.get(
        `${baseUrl}/public/organizations/${storeIdentifier}/availability/`,
      );
      setSettings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const dateErrors = {
    setup_date: checkBookingTime(
      settings,
      "Setup",
      toInstant(formData.setup_date),
    ),
    set_down_date:
      checkBookingTime(
        settings,
        "Set down",
        toInstant(formData.set_down_date),
      ) ||
      (formData.setup_date &&
      formData.set_down_date &&
      formData.set_down_date <= formData.setup_date
        ? "Set down must be after setup."
        : ""),
  };
  const notAccepting = settings && !settings.is_accepting_requests;
  const isFormValid = Boolean(
    formData.contact_name.trim() &&
      formData.email.trim() &&
      formData.contact_phone.trim() &&
      formData.event_name.trim() &&
      formData.city.trim() &&
      formData.address.trim() &&
      formData.setup_date &&
      formData.event_date &&
      formData.set_down_date &&
      !dateErrors.setup_date &&
      !dateErrors.set_down_date,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || notAccepting) return;
    const payNow = canPayOnline && payMode === "pay";
    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";

      const payload = {
        ...formData,
        // Send real instants so the vendor reads them in its own time zone.
        setup_date: toISO(formData.setup_date),
        set_down_date: toISO(formData.set_down_date),
        event_date: toISO(formData.event_date),
        note_for_org: formData.note_for_org.trim(),
        items: cart.map((item: any) => ({
          product_unit_id: item.unit.product_unit_id,
          quantity_booked: item.quantity,
        })),
        pay_now: payNow,
        // Paystack sends the guest back here to confirm the payment.
        return_url: `${window.location.origin}/public/store/${storeIdentifier}/payment/complete`,
      };

      const res = await axios.post(
        `${baseUrl}/public/organizations/${storeIdentifier}/booking-requests/`,
        payload,
      );
      if (res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
        return;
      }
      if (res.data.payment_error) {
        setNotice(
          "Online payment couldn't start, so your request was sent without payment. The vendor will contact you.",
        );
      }
      setConfirmation(res.data.confirmation || null);
      setSuccess(true);
    } catch (e: any) {
      console.error(e);
      const data = e.response?.data;
      const detail =
        data && typeof data === "object"
          ? Object.values(data).flat().filter(Boolean).join("\n")
          : "";
      alert(
        detail ||
          "Failed to submit booking request. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const canPayOnline = Boolean(settings?.online_payments_enabled);
  const depositPercent = Math.min(
    100,
    Math.max(1, Number(settings?.deposit_percent) || 100),
  );

  const currencySymbol: string | undefined = cart.find(
    (item: any) => item.product?.currency_symbol,
  )?.product?.currency_symbol;
  const totalAmount = cart.reduce((acc: number, item: any) => {
    const price =
      item.unit?.rental_price || item.product.units?.[0]?.rental_price || 0;
    return acc + price * item.quantity;
  }, 0);

  if (success && confirmation) {
    return (
      <BookingConfirmation
        data={confirmation}
        paid={false}
        notice={notice}
        onDone={() => navigate(`/public/store/${storeIdentifier}`)}
        doneLabel="Back to rentals"
      />
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--bg-surface)] rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">
            Request Received!
          </h2>
          <p className="text-[var(--text-muted)] mb-8">
            Thank you for your rental request. We have noted your request and
            will reach out to you shortly with a formal quotation and next
            steps.
          </p>
          <button
            onClick={() => navigate(`/public/store/${storeIdentifier}`)}
            className="w-full py-3 bg-brand-primary text-[var(--text-on-brand)] rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Return to Rentals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to rentals
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-soft)] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">
                Booking Details
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)]"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)]"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)]"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Event Name *
                    </label>
                    <input
                      required
                      type="text"
                      name="event_name"
                      value={formData.event_name}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)]"
                      placeholder="Annual Gala 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Event Type *
                    </label>
                    <select
                      required
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)] appearance-none"
                    >
                      <option value="corporate">Corporate Event</option>
                      <option value="wedding">Wedding</option>
                      <option value="party">Party / Social Gathering</option>
                      <option value="festival">Festival / Concert</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Country *
                    </label>
                    <select
                      required
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)] appearance-none"
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      City *
                    </label>
                    <input
                      required
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)]"
                      placeholder="Lagos"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                    Event Address *
                  </label>
                  <input
                    required
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)]"
                    placeholder="123 Main St..."
                  />
                </div>

                <div>
                  <OpeningHours availability={settings} />
                  {settings && openingStatus(settings) && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 px-1">
                      Pick times in your own time zone (
                      {Intl.DateTimeFormat()
                        .resolvedOptions()
                        .timeZone.replace(/_/g, " ")}
                      ). Setup and set-down must fall within the opening hours
                      above.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[var(--border-soft)]">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Setup Date & Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="setup_date"
                      min={nowLocal}
                      value={formData.setup_date}
                      onChange={handleChange}
                      className={`w-full border rounded-xl p-3 outline-none text-[var(--text-main)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)] text-sm ${
                        dateErrors.setup_date
                          ? "border-rose-400"
                          : "border-[var(--border-soft)]"
                      }`}
                    />
                    {dateErrors.setup_date && (
                      <p className="text-xs text-rose-600 mt-1">
                        {dateErrors.setup_date}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Event Date & Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="event_date"
                      min={nowLocal}
                      value={formData.event_date}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                      Set Down Date & Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="set_down_date"
                      min={nowLocal}
                      value={formData.set_down_date}
                      onChange={handleChange}
                      className={`w-full border rounded-xl p-3 outline-none text-[var(--text-main)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)] text-sm ${
                        dateErrors.set_down_date
                          ? "border-rose-400"
                          : "border-[var(--border-soft)]"
                      }`}
                    />
                    {dateErrors.set_down_date && (
                      <p className="text-xs text-rose-600 mt-1">
                        {dateErrors.set_down_date}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="note_for_org"
                    className="block text-sm font-medium text-[var(--text-main)] mb-1"
                  >
                    Note to the vendor{" "}
                    <span className="text-[var(--text-muted)] font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="note_for_org"
                    name="note_for_org"
                    value={formData.note_for_org}
                    onChange={handleChange}
                    maxLength={1000}
                    rows={4}
                    className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-[var(--bg-app)] resize-none"
                    placeholder="E.g. delivery instructions, venue access, colour preferences, or questions for the vendor…"
                  ></textarea>
                  <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
                    <span>The vendor sees this with your request.</span>
                    <span className="tabular-nums">
                      {formData.note_for_org.length}/1000
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--border-soft)] space-y-3">
                  {notAccepting ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-4 bg-brand-primary text-[var(--text-on-brand)] rounded-xl font-bold text-lg opacity-50 cursor-not-allowed"
                    >
                      Currently Not Accepting Requests
                    </button>
                  ) : canPayOnline && totalAmount > 0 ? (
                    <>
                      <button
                        type="submit"
                        onClick={() => setPayMode("pay")}
                        disabled={loading || !isFormValid}
                        className="w-full py-4 bg-brand-primary text-[var(--text-on-brand)] rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex flex-col items-center"
                      >
                        <span style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                          {loading && payMode === "pay"
                            ? "Starting payment…"
                            : `Pay ${formatPrice(
                                { currency_symbol: currencySymbol },
                                (totalAmount * depositPercent) / 100,
                              )} & book now`}
                        </span>
                        {depositPercent < 100 && (
                          <span className="text-xs font-medium opacity-80">
                            {depositPercent}% deposit · balance paid later
                          </span>
                        )}
                      </button>
                      <button
                        type="submit"
                        onClick={() => setPayMode("request")}
                        disabled={loading || !isFormValid}
                        className="w-full py-3 rounded-xl font-bold border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading && payMode === "request"
                          ? "Sending…"
                          : "Just send a request (pay later)"}
                      </button>
                      <p className="text-xs text-[var(--text-muted)] text-center">
                        Paying now secures your booking. A request lets the
                        vendor confirm availability and send a quotation first.
                      </p>
                    </>
                  ) : (
                    <button
                      type="submit"
                      onClick={() => setPayMode("request")}
                      disabled={loading || !isFormValid}
                      className="w-full py-4 bg-brand-primary text-[var(--text-on-brand)] rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {loading ? "Submitting..." : "Submit Rental Request"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="w-full lg:w-96">
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border-soft)] p-6 sticky top-24">
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-primary" />
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                {cart.map((item: any) => {
                  const price = item.product.units?.[0]?.rental_price || 0;
                  return (
                    <div
                      key={item.product.product_id}
                      className="flex justify-between items-start gap-4 pb-4 border-b border-[var(--border-soft)] last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-[var(--text-main)] leading-snug">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-[var(--text-main)]">
                        {formatPrice(item.product, price * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[var(--border-soft)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[var(--text-muted)]">Subtotal</span>
                  <span className="font-medium text-[var(--text-main)]">
                    {formatPrice(
                      { currency_symbol: currencySymbol },
                      totalAmount,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[var(--text-muted)]">
                    Estimated Tax (0%)
                  </span>
                  <span className="font-medium text-[var(--text-main)]">
                    {currencySymbol || ""}0
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-[var(--border-soft)]">
                  <span className="font-bold text-[var(--text-main)]">
                    Total
                  </span>
                  <span className="font-black text-2xl text-[var(--text-link)]">
                    {formatPrice(
                      { currency_symbol: currencySymbol },
                      totalAmount,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

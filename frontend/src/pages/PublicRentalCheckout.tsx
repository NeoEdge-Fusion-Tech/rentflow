import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, CheckCircle } from "lucide-react";
import axios from "axios";

export function PublicRentalCheckout() {
  const { org_id, identifier } = useParams();
  const storeIdentifier = identifier || org_id;
  const location = useLocation();
  const navigate = useNavigate();
  const cart = location.state?.cart || [];

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";

      const payload = {
        ...formData,
        items: cart.map((item: any) => ({
          product_unit_id: item.unit.product_unit_id,
          quantity_booked: item.quantity,
        })),
      };

      await axios.post(
        `${baseUrl}/public/organizations/${storeIdentifier}/booking-requests/`,
        payload,
      );
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert(
        "Failed to submit booking request. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart.reduce((acc: number, item: any) => {
    const price =
      item.unit?.rental_price || item.product.units?.[0]?.rental_price || 0;
    return acc + price * item.quantity;
  }, 0);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Request Received!
          </h2>
          <p className="text-gray-500 mb-8">
            Thank you for your rental request. We have noted your request and
            will reach out to you shortly with a formal quotation and next
            steps.
          </p>
          <button
            onClick={() => navigate(`/public/store/${storeIdentifier}`)}
            className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-accent transition-colors"
          >
            Return to Rentals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to rentals
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Booking Details
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Name *
                    </label>
                    <input
                      required
                      type="text"
                      name="event_name"
                      value={formData.event_name}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50"
                      placeholder="Annual Gala 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type *
                    </label>
                    <select
                      required
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50 appearance-none"
                    >
                      <option value="corporate">Corporate Event</option>
                      <option value="wedding">Wedding</option>
                      <option value="party">Party / Social Gathering</option>
                      <option value="festival">Festival / Concert</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      required
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50 appearance-none"
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="USA">USA</option>
                      <option value="UK">UK</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      required
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50"
                      placeholder="Lagos"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Address *
                  </label>
                  <input
                    required
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50"
                    placeholder="123 Main St..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Setup Date & Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="setup_date"
                      value={formData.setup_date}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Date & Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="event_date"
                      value={formData.event_date}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Set Down Date & Time *
                    </label>
                    <input
                      required
                      type="datetime-local"
                      name="set_down_date"
                      value={formData.set_down_date}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="note_for_org"
                    value={formData.note_for_org}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all bg-gray-50 resize-none"
                    placeholder="Any specific requirements..."
                  ></textarea>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={
                      loading || (settings && !settings.is_accepting_requests)
                    }
                    className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-lg hover:bg-brand-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {loading
                      ? "Submitting..."
                      : settings && !settings.is_accepting_requests
                        ? "Currently Not Accepting Requests"
                        : "Submit Rental Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="w-full lg:w-96">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-primary" />
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                {cart.map((item: any) => {
                  const price = item.product.units?.[0]?.rental_price || 0;
                  return (
                    <div
                      key={item.product.product_id}
                      className="flex justify-between items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900 leading-snug">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">
                        ${(price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500">Estimated Tax (0%)</span>
                  <span className="font-medium text-gray-900">$0.00</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-black text-2xl text-brand-primary">
                    ${totalAmount.toFixed(2)}
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

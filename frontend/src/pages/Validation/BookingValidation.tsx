import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookingService, ProductService } from "../../api";
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  ArrowLeft,
  Package,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { cn } from "@/src/utils";
import { useNotification } from "../../context/NotificationContext";

export function BookingValidation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [serialCode, setSerialCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // single or bulk can be detected or we can just pass what user wants
  // For validation app, we assume they are scanning the item's serial or bulk code.
  const [actionType, setActionType] = useState<"pickup" | "return">("pickup");
  const [quantity, setQuantity] = useState(1);
  const [qtyDamaged, setQtyDamaged] = useState(0);
  const [condition, setCondition] = useState<"good" | "damaged">("good");

  // We determine single/bulk dynamically or let the user choose like Scanner.tsx?
  // Let's assume the user enters the serial number. The backend handles finding the unit.
  // Wait, ProductService.scan expects 'quantity' for bulk, but single doesn't need it.
  const [unitType, setUnitType] = useState<"single" | "bulk">("single");

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const res = await BookingService.get(id as string);
      setBooking(res.data);
      // Auto-set action based on booking status
      if (res.data.status === "confirmed") {
        setActionType("pickup");
      } else if (res.data.status === "picked_up") {
        setActionType("return");
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to load booking details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false,
      );

      scanner.render(
        (decodedText) => {
          setSerialCode(decodedText);
          setIsScanning(false);
          if (scanner) scanner.clear();
        },
        () => {},
      );
    }

    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [isScanning]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!serialCode.trim()) {
      showNotification("Please enter or scan a serial code.", "error");
      return;
    }

    if (quantity < 1) {
      showNotification("Quantity must be at least 1.", "error");
      return;
    }

    if (qtyDamaged > quantity) {
      showNotification(
        "Damaged quantity cannot exceed total quantity.",
        "error",
      );
      return;
    }

    setIsProcessing(true);

    try {
      const payload: any = {
        serial_number: serialCode.trim(),
        action: actionType,
      };

      if (unitType === "bulk") {
        if (actionType === "pickup") {
          payload.quantity = quantity;
        } else {
          payload.qty_good = quantity - qtyDamaged;
          payload.qty_damaged = qtyDamaged;
        }
      } else {
        if (actionType === "return") {
          payload.condition = condition;
          payload.condition_submitted = true;
        }
      }

      const res = await ProductService.scan(payload);

      if (res.data.requires_quantity || res.data.requires_condition) {
        throw new Error(
          res.data.error ||
            res.data.message ||
            "Verification required by server.",
        );
      }

      showNotification(
        `${actionType === "pickup" ? "Picked up" : "Returned"} successfully: ${
          res.data.product_name
        }`,
        "success",
      );

      // Clear form
      setSerialCode("");
      setQuantity(1);
      setQtyDamaged(0);
      setCondition("good");

      // Refresh booking to update item quantities visually
      fetchBooking();
    } catch (err: any) {
      showNotification(
        err.response?.data?.error || err.message || "Action failed",
        "error",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[var(--text-muted)]">
          Loading booking details...
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-main)] font-medium">
          Booking not found.
        </p>
        <button
          onClick={() => navigate("/validation")}
          className="mt-4 text-brand-primary font-bold"
        >
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3 px-4 sm:px-0">
        <button
          onClick={() => navigate("/validation")}
          className="p-2 -ml-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Validate Booking #{booking.booking_id}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {booking.client?.business_name || booking.client?.contact_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 sm:px-0">
        {/* Booking Details & Items */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-soft)] shadow-xl">
            <h2 className="font-bold text-[var(--text-main)] mb-4">
              Items in Booking
            </h2>

            {booking.items?.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No items found.
              </p>
            ) : (
              <div className="space-y-3">
                {booking.items?.map((item: any) => (
                  <div
                    key={item.item_id}
                    className="p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)]"
                  >
                    <p className="font-bold text-[var(--text-main)] text-sm">
                      {item.product_name}
                    </p>
                    <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center justify-between">
                      <span>Total: {item.quantity}</span>
                      <span>Picked up: {item.total_picked_up || 0}</span>
                      <span>Returned: {item.total_returned || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scanner Form */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-soft)] shadow-xl h-fit">
          <h2 className="font-bold text-[var(--text-main)] mb-6 text-xl">
            Scan Item
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex p-1 bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)] mb-6">
              <button
                type="button"
                onClick={() => setActionType("pickup")}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  actionType === "pickup"
                    ? "bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm border border-[var(--border-soft)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50",
                )}
              >
                Pickup
              </button>
              <button
                type="button"
                onClick={() => setActionType("return")}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  actionType === "return"
                    ? "bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm border border-[var(--border-soft)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50",
                )}
              >
                Return
              </button>
            </div>

            <div className="flex p-1 bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)] mb-6">
              <button
                type="button"
                onClick={() => setUnitType("single")}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  unitType === "single"
                    ? "bg-brand-primary text-brand-accent shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50",
                )}
              >
                Single Item
              </button>
              <button
                type="button"
                onClick={() => setUnitType("bulk")}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  unitType === "bulk"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]/50",
                )}
              >
                Bulk Item
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  {unitType === "single"
                    ? "Serial Number (SN)"
                    : "Bulk Item Code"}
                </label>
                {isScanning ? (
                  <button
                    type="button"
                    onClick={() => setIsScanning(false)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <RefreshCcw className="w-3 h-3" /> Close Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="text-xs font-bold text-brand-primary hover:text-brand-primary/80 flex items-center gap-1 bg-brand-primary/10 px-2 py-1 rounded-md"
                  >
                    <Camera className="w-3 h-3" /> Open Camera
                  </button>
                )}
              </div>

              {isScanning && (
                <div className="relative mb-4">
                  <div
                    id="reader"
                    className="w-full overflow-hidden rounded-xl border-4 border-[var(--border-soft)] min-h-[250px]"
                  />
                </div>
              )}

              <div className="relative">
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={serialCode}
                  onChange={(e) => setSerialCode(e.target.value)}
                  placeholder={
                    unitType === "single"
                      ? "Enter or scan serial number..."
                      : "Enter bulk asset code..."
                  }
                  className="w-full h-12 pl-12 pr-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-sm font-bold uppercase text-[var(--text-main)]"
                  required
                />
              </div>
            </div>

            {/* Bulk Fields */}
            {unitType === "bulk" && (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {actionType === "pickup"
                      ? "Quantity to Pickup"
                      : "Total Returned"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                    required
                  />
                </div>

                {actionType === "return" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-rose-500 uppercase tracking-widest">
                      Quantity Damaged
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={quantity}
                      value={qtyDamaged}
                      onChange={(e) =>
                        setQtyDamaged(
                          Math.min(
                            quantity,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        )
                      }
                      className="w-full h-12 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 text-sm font-bold"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Single Condition Fields */}
            {unitType === "single" && actionType === "return" && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  Item Condition
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={cn(
                      "flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all",
                      condition === "good"
                        ? "bg-emerald-500/10 border-emerald-500"
                        : "bg-[var(--bg-app)] border-[var(--border-soft)] hover:border-emerald-500/50",
                    )}
                  >
                    <input
                      type="radio"
                      value="good"
                      checked={condition === "good"}
                      onChange={() => setCondition("good")}
                      className="hidden"
                    />
                    <CheckCircle2
                      className={cn(
                        "w-5 h-5",
                        condition === "good"
                          ? "text-emerald-500"
                          : "text-[var(--text-muted)]",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-bold flex-1",
                        condition === "good"
                          ? "text-emerald-500"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      Good
                    </span>
                  </label>
                  <label
                    className={cn(
                      "flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all",
                      condition === "damaged"
                        ? "bg-rose-500/10 border-rose-500"
                        : "bg-[var(--bg-app)] border-[var(--border-soft)] hover:border-rose-500/50",
                    )}
                  >
                    <input
                      type="radio"
                      value="damaged"
                      checked={condition === "damaged"}
                      onChange={() => setCondition("damaged")}
                      className="hidden"
                    />
                    <AlertCircle
                      className={cn(
                        "w-5 h-5",
                        condition === "damaged"
                          ? "text-rose-500"
                          : "text-[var(--text-muted)]",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-bold flex-1",
                        condition === "damaged"
                          ? "text-rose-500"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      Damaged
                    </span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !serialCode.trim()}
              className="w-full h-14 bg-brand-primary text-brand-accent rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Submit {actionType}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

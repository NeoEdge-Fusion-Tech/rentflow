import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "../components/marketing/MarketingLayout";
import {
  Download,
  FileSpreadsheet,
  Plus,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  ChevronDown,
} from "lucide-react";
import { WaitlistService, BudgetCalculatorService } from "../api";

interface CostItem {
  id: string;
  name: string;
  amount: number | string;
}

const DEFAULT_COSTS: CostItem[] = [
  { id: "1", name: "Vendors and suppliers", amount: 450000 },
  { id: "2", name: "Crew and staff", amount: 180000 },
  { id: "3", name: "Transport and logistics", amount: 60000 },
  { id: "4", name: "Equipment rental", amount: 150000 },
  { id: "5", name: "Venue and permits", amount: 0 },
  { id: "6", name: "Other", amount: 30000 },
];

const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "₦ NGN" },
  { code: "USD", symbol: "$", label: "$ USD" },
  { code: "GBP", symbol: "£", label: "£ GBP" },
  { code: "EUR", symbol: "€", label: "€ EUR" },
  { code: "CAD", symbol: "C$", label: "C$ CAD" },
  { code: "AUD", symbol: "A$", label: "A$ AUD" },
  { code: "KES", symbol: "KSh", label: "KSh KES" },
  { code: "GHS", symbol: "GH₵", label: "GH₵ GHS" },
  { code: "ZAR", symbol: "R", label: "R ZAR" },
];

export function EventBudgetCalculator() {
  const [clientPrice, setClientPrice] = useState<number | string>(1500000);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [costs, setCosts] = useState<CostItem[]>(DEFAULT_COSTS);
  const [contingencyPercent, setContingencyPercent] = useState<number>(10);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(30);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Lead modal state
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<"pdf" | "excel">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<
    string | null
  >(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Lead form fields
  const [leadForm, setLeadForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
  });

  // Calculate numbers
  const numericClientPrice =
    typeof clientPrice === "number"
      ? clientPrice
      : parseFloat(clientPrice) || 0;

  const totalDirectCosts = useMemo(() => {
    return costs.reduce((sum, item) => {
      const val =
        typeof item.amount === "number"
          ? item.amount
          : parseFloat(item.amount) || 0;
      return sum + val;
    }, 0);
  }, [costs]);

  const contingencyAmount = useMemo(() => {
    return totalDirectCosts * (contingencyPercent / 100);
  }, [totalDirectCosts, contingencyPercent]);

  const totalCosts = useMemo(() => {
    return totalDirectCosts + contingencyAmount;
  }, [totalDirectCosts, contingencyAmount]);

  const profit = useMemo(() => {
    return numericClientPrice - totalCosts;
  }, [numericClientPrice, totalCosts]);

  const marginPercent = useMemo(() => {
    if (numericClientPrice <= 0) return 0;
    return (profit / numericClientPrice) * 100;
  }, [profit, numericClientPrice]);

  const priceForTargetMargin = useMemo(() => {
    const divider = 1 - targetMarginPercent / 100;
    if (divider <= 0) return totalCosts;
    return Math.round(totalCosts / divider);
  }, [totalCosts, targetMarginPercent]);

  const formatCurrency = (val: number) => {
    const rounded = Math.round(val);
    return `${currency.symbol}${rounded.toLocaleString()}`;
  };

  const getMarginBadge = () => {
    if (marginPercent >= 20) {
      return {
        label: "Healthy margin",
        bg: "rgba(34, 197, 94, 0.2)",
        text: "#4ade80",
        border: "rgba(34, 197, 94, 0.4)",
      };
    }
    if (marginPercent >= 10) {
      return {
        label: "Moderate margin",
        bg: "rgba(245, 158, 11, 0.2)",
        text: "#fbbf24",
        border: "rgba(245, 158, 11, 0.4)",
      };
    }
    if (marginPercent >= 0) {
      return {
        label: "Low margin",
        bg: "rgba(249, 115, 22, 0.2)",
        text: "#fb923c",
        border: "rgba(249, 115, 22, 0.4)",
      };
    }
    return {
      label: "Loss on event",
      bg: "rgba(239, 68, 68, 0.25)",
      text: "#f87171",
      border: "rgba(239, 68, 68, 0.5)",
    };
  };

  const badge = getMarginBadge();

  // Cost items handlers
  const handleCostChange = (
    id: string,
    field: "name" | "amount",
    value: string,
  ) => {
    setCosts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === "amount") {
            return { ...item, amount: value === "" ? "" : Number(value) };
          }
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  const handleAddCost = () => {
    const newId = (Date.now() + Math.random()).toString();
    setCosts((prev) => [...prev, { id: newId, name: "", amount: "" }]);
  };

  const handleRemoveCost = (id: string) => {
    setCosts((prev) => prev.filter((item) => item.id !== id));
  };

  // Check login state or saved lead
  const isLoggedIn = () => {
    return !!(localStorage.getItem("token") || sessionStorage.getItem("token"));
  };

  const getSavedLead = () => {
    try {
      const stored = localStorage.getItem("neoops_waitlist_lead");
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  };

  const triggerDownload = async (
    fmt: "pdf" | "excel",
    userInfo?: {
      firstName: string;
      lastName: string;
      company: string;
      email: string;
    },
  ) => {
    setIsExporting(true);
    setModalError(null);

    const payload = {
      format: fmt,
      client_price: numericClientPrice,
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      costs: costs.map((c) => ({
        name: c.name || "Expense Item",
        amount:
          typeof c.amount === "number" ? c.amount : parseFloat(c.amount) || 0,
      })),
      contingency_percent: contingencyPercent,
      target_margin_percent: targetMarginPercent,
      user_info: userInfo
        ? {
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
            company: userInfo.company,
            email: userInfo.email,
          }
        : undefined,
    };

    try {
      const response = await BudgetCalculatorService.exportReport(payload);
      const ext = fmt === "pdf" ? "pdf" : "csv";
      const mime = fmt === "pdf" ? "application/pdf" : "text/csv;charset=utf-8";
      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `event_budget_report_${Date.now()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportSuccessMessage(
        fmt === "pdf"
          ? "Your Event Budget PDF report has been downloaded!"
          : "Your Event Budget Excel spreadsheet has been downloaded!",
      );
      setTimeout(() => setExportSuccessMessage(null), 5000);
      setShowLeadModal(false);
    } catch (err: any) {
      console.error("Export error:", err);
      setModalError(
        err?.response?.data?.error ||
          "Failed to download report. Please check your network and try again.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportClick = (fmt: "pdf" | "excel") => {
    if (isLoggedIn()) {
      triggerDownload(fmt);
      return;
    }

    const saved = getSavedLead();
    if (saved && saved.email) {
      triggerDownload(fmt, saved);
      return;
    }

    // Unauthenticated: prompt for contact details
    setPendingFormat(fmt);
    setShowLeadModal(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !leadForm.firstName.trim() ||
      !leadForm.lastName.trim() ||
      !leadForm.email.trim()
    ) {
      setModalError(
        "Please provide your first name, last name, and a valid email.",
      );
      return;
    }

    setIsExporting(true);
    setModalError(null);

    try {
      // Record lead to waitlist model
      await WaitlistService.create({
        first_name: leadForm.firstName.trim(),
        last_name: leadForm.lastName.trim(),
        company: leadForm.company.trim(),
        email: leadForm.email.trim(),
        referral_type: "event_budget",
      });

      // Save locally
      localStorage.setItem("neoops_waitlist_lead", JSON.stringify(leadForm));

      // Trigger export
      await triggerDownload(pendingFormat, leadForm);
    } catch (err: any) {
      console.error("Lead submission error:", err);
      // Fallback: still attempt to export if server returns response or validation issue
      try {
        await triggerDownload(pendingFormat, leadForm);
      } catch {
        setModalError(
          "Something went wrong while saving your details. Please try again.",
        );
        setIsExporting(false);
      }
    }
  };

  return (
    <MarketingLayout title="Event Budget & Profit Calculator | NeoOps">
      <div
        className="ne-sec"
        style={{ padding: "60px 0 100px", minHeight: "85vh" }}
      >
        <div className="ne-wrap">
          {/* Hero Banner Header */}
          <div style={{ maxWidth: "800px", marginBottom: "48px" }}>
            <span
              className="ne-pill"
              style={{
                marginBottom: "20px",
                letterSpacing: "0.18em",
                fontWeight: "700",
                fontSize: "11px",
              }}
            >
              FREE TOOL
            </span>
            <h1
              className="ne-h2"
              style={{
                fontSize: "clamp(36px, 5vw, 62px)",
                color: "#07294C",
                letterSpacing: "-0.04em",
                lineHeight: "1.08",
                margin: "0 0 18px",
              }}
            >
              Event budget and{" "}
              <span
                className="ne-serif"
                style={{
                  boxShadow: "inset 0 -0.26em 0 #FFC17D",
                  display: "inline-block",
                }}
              >
                profit calculator.
              </span>
            </h1>
            <p
              style={{
                fontSize: "18px",
                lineHeight: "1.6",
                color: "#4A5663",
                maxWidth: "680px",
                margin: 0,
              }}
            >
              Enter what the client pays and what the event costs you. See your
              profit, your margin and the price you should be charging, before
              you send the quote.
            </p>
          </div>

          {/* Success Notification Banner */}
          {exportSuccessMessage && (
            <div
              style={{
                background: "#DCFCE7",
                border: "1px solid #86EFAC",
                color: "#166534",
                borderRadius: "14px",
                padding: "14px 20px",
                marginBottom: "28px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontWeight: "600",
                fontSize: "15px",
              }}
            >
              <CheckCircle2
                style={{ width: "20px", height: "20px", flexShrink: 0 }}
              />
              <span>{exportSuccessMessage}</span>
            </div>
          )}

          {/* Main 2-Column Calculator */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "36px",
              alignItems: "start",
            }}
          >
            {/* Left Card: Input fields */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "24px",
                border: "1px solid #E2E8F0",
                padding: "32px",
                boxShadow: "0 10px 30px rgba(7, 41, 76, 0.04)",
              }}
            >
              {/* Client Price and Currency */}
              <div style={{ marginBottom: "36px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#07294C",
                    }}
                  >
                    What the client pays you
                  </label>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#64748B",
                    }}
                  >
                    Currency
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ position: "relative", flex: "1 1 auto" }}>
                    <input
                      type="number"
                      value={clientPrice}
                      onChange={(e) => setClientPrice(e.target.value)}
                      placeholder="0"
                      style={{
                        width: "100%",
                        height: "50px",
                        borderRadius: "12px",
                        border: "1px solid #CBD5E1",
                        padding: "0 16px",
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#07294C",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#FFFFFF",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#07294C")}
                      onBlur={(e) => (e.target.style.borderColor = "#CBD5E1")}
                    />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      width: "125px",
                      flexShrink: 0,
                    }}
                  >
                    <select
                      value={currency.code}
                      onChange={(e) => {
                        const sel = CURRENCIES.find(
                          (c) => c.code === e.target.value,
                        );
                        if (sel) setCurrency(sel);
                      }}
                      aria-label="Select Currency"
                      style={{
                        width: "100%",
                        height: "50px",
                        borderRadius: "12px",
                        border: "1px solid #CBD5E1",
                        padding: "0 34px 0 14px",
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#07294C",
                        outline: "none",
                        background: "#F8FAFC",
                        appearance: "none",
                        cursor: "pointer",
                      }}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "18px",
                        width: "16px",
                        height: "16px",
                        pointerEvents: "none",
                        color: "#64748B",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* What the event costs you */}
              <div style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#07294C",
                      margin: 0,
                    }}
                  >
                    What the event costs you
                  </h3>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#64748B",
                    }}
                  >
                    Example figures, change them
                  </span>
                </div>

                {/* List of cost items */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {costs.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleCostChange(item.id, "name", e.target.value)
                        }
                        placeholder="Cost item name"
                        style={{
                          flex: "1 1 55%",
                          height: "46px",
                          borderRadius: "10px",
                          border: "1px solid #E2E8F0",
                          padding: "0 14px",
                          fontSize: "14px",
                          color: "#0A0D12",
                          background: "#FFFFFF",
                          outline: "none",
                        }}
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) =>
                          handleCostChange(item.id, "amount", e.target.value)
                        }
                        placeholder="0"
                        style={{
                          flex: "1 1 35%",
                          height: "46px",
                          borderRadius: "10px",
                          border: "1px solid #E2E8F0",
                          padding: "0 14px",
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "#07294C",
                          background: "#FFFFFF",
                          outline: "none",
                          textAlign: "right",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCost(item.id)}
                        title="Remove cost"
                        aria-label="Remove cost"
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "8px",
                          border: "1px solid #E2E8F0",
                          background: "#FFFFFF",
                          color: "#94A3B8",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#DC2626";
                          e.currentTarget.style.borderColor = "#FCA5A5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#94A3B8";
                          e.currentTarget.style.borderColor = "#E2E8F0";
                        }}
                      >
                        <X style={{ width: "16px", height: "16px" }} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add cost button */}
                <button
                  type="button"
                  onClick={handleAddCost}
                  style={{
                    width: "100%",
                    height: "44px",
                    marginTop: "14px",
                    borderRadius: "10px",
                    border: "1.5px dashed #CBD5E1",
                    background: "transparent",
                    color: "#07294C",
                    fontSize: "14px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F8FAFC";
                    e.currentTarget.style.borderColor = "#94A3B8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                >
                  <Plus style={{ width: "16px", height: "16px" }} />
                  Add a cost
                </button>
              </div>

              {/* Advanced Assumptions toggle */}
              <div
                style={{
                  borderTop: "1px solid #E2E8F0",
                  paddingTop: "18px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#07294C",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Sliders style={{ width: "14px", height: "14px" }} />
                  {showAdvanced
                    ? "Hide settings"
                    : "Customise contingency & margin target"}
                </button>

                {showAdvanced && (
                  <div
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      background: "#F8FAFC",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#07294C",
                          marginBottom: "6px",
                        }}
                      >
                        <span>Contingency Buffer</span>
                        <span>{contingencyPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={contingencyPercent}
                        onChange={(e) =>
                          setContingencyPercent(Number(e.target.value))
                        }
                        style={{ width: "100%", accentColor: "#07294C" }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#07294C",
                          marginBottom: "6px",
                        }}
                      >
                        <span>Target Profit Margin</span>
                        <span>{targetMarginPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={targetMarginPercent}
                        onChange={(e) =>
                          setTargetMarginPercent(Number(e.target.value))
                        }
                        style={{ width: "100%", accentColor: "#07294C" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Dark Navy Profit Card */}
            <div
              style={{
                background: "#07294C",
                borderRadius: "28px",
                padding: "36px",
                color: "#FFFFFF",
                boxShadow: "0 20px 40px rgba(7, 41, 76, 0.22)",
                display: "flex",
                flexDirection: "column",
                position: "sticky",
                top: "100px",
              }}
            >
              {/* Card Header Label */}
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#FFC17D",
                  marginBottom: "8px",
                }}
              >
                YOUR PROFIT ON THIS EVENT
              </div>

              {/* Big Profit Display */}
              <div
                style={{
                  fontSize: "clamp(40px, 4.5vw, 54px)",
                  fontWeight: "800",
                  letterSpacing: "-0.04em",
                  color: profit >= 0 ? "#FFFFFF" : "#F87171",
                  lineHeight: "1.05",
                  marginBottom: "16px",
                }}
              >
                {formatCurrency(profit)}
              </div>

              {/* Margin Pill Badge */}
              <div style={{ marginBottom: "28px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`,
                    borderRadius: "999px",
                    padding: "4px 14px",
                    fontSize: "12px",
                    fontWeight: "800",
                    letterSpacing: "0.02em",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: badge.text,
                    }}
                  />
                  {badge.label}
                </span>
              </div>

              {/* Breakdown Rows */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                  paddingTop: "22px",
                  marginBottom: "28px",
                  fontSize: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                    Costs
                  </span>
                  <span style={{ fontWeight: "700" }}>
                    {formatCurrency(totalDirectCosts)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                    Contingency ({contingencyPercent}%)
                  </span>
                  <span style={{ fontWeight: "700" }}>
                    {formatCurrency(contingencyAmount)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                    Total costs
                  </span>
                  <span style={{ fontWeight: "700" }}>
                    {formatCurrency(totalCosts)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                    Your margin
                  </span>
                  <span style={{ fontWeight: "700" }}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px dashed rgba(255, 255, 255, 0.15)",
                    paddingTop: "14px",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.72)" }}>
                    Price for your target margin ({targetMarginPercent}%)
                  </span>
                  <span
                    style={{
                      fontWeight: "800",
                      color: "#FFC17D",
                      fontSize: "17px",
                    }}
                  >
                    {formatCurrency(priceForTargetMargin)}
                  </span>
                </div>
              </div>

              {/* Explanatory Note */}
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: "rgba(255, 255, 255, 0.65)",
                  margin: "0 0 24px",
                }}
              >
                NeoOps Premium works this out for every event from your real
                invoices and expenses.
              </p>

              {/* Export Buttons */}
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "16px" }}
              >
                <button
                  type="button"
                  onClick={() => handleExportClick("pdf")}
                  disabled={isExporting}
                  style={{
                    flex: "1 1 50%",
                    height: "44px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.16)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <FileText
                    style={{ width: "16px", height: "16px", color: "#FFC17D" }}
                  />
                  PDF Report
                </button>
                <button
                  type="button"
                  onClick={() => handleExportClick("excel")}
                  disabled={isExporting}
                  style={{
                    flex: "1 1 50%",
                    height: "44px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.16)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <FileSpreadsheet
                    style={{ width: "16px", height: "16px", color: "#4ADE80" }}
                  />
                  Excel (CSV)
                </button>
              </div>

              {/* Primary CTA button */}
              <Link
                to="/register"
                style={{
                  width: "100%",
                  height: "52px",
                  borderRadius: "14px",
                  background: "#FFC17D",
                  color: "#07294C",
                  fontSize: "16px",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  transition: "transform 0.2s, background 0.2s",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FFB259";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FFC17D";
                  e.currentTarget.style.transform = "none";
                }}
              >
                Start for free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Capture Modal for Non-logged-in Users */}
      {showLeadModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7, 41, 76, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "24px",
              maxWidth: "480px",
              width: "100%",
              padding: "36px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowLeadModal(false)}
              aria-label="Close dialog"
              style={{
                position: "absolute",
                right: "20px",
                top: "20px",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                color: "#64748B",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: "18px", height: "18px" }} />
            </button>

            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#FFEBD2",
                  color: "#07294C",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: "800",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Instant Download
              </span>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#07294C",
                  margin: "0 0 8px",
                  letterSpacing: "-0.02em",
                }}
              >
                Get your {pendingFormat.toUpperCase()} report
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#64748B",
                  margin: 0,
                }}
              >
                Enter your details to download your customized event budget and
                profit analysis.
              </p>
            </div>

            {modalError && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#B91C1C",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle
                  style={{ width: "16px", height: "16px", flexShrink: 0 }}
                />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={handleLeadSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: "1 1 50%" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#07294C",
                      marginBottom: "6px",
                    }}
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.firstName}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, firstName: e.target.value })
                    }
                    placeholder="e.g. Sarah"
                    style={{
                      width: "100%",
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid #CBD5E1",
                      padding: "0 14px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ flex: "1 1 50%" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#07294C",
                      marginBottom: "6px",
                    }}
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.lastName}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, lastName: e.target.value })
                    }
                    placeholder="e.g. Jenkins"
                    style={{
                      width: "100%",
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid #CBD5E1",
                      padding: "0 14px",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#07294C",
                    marginBottom: "6px",
                  }}
                >
                  Company / Agency *
                </label>
                <input
                  type="text"
                  required
                  value={leadForm.company}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, company: e.target.value })
                  }
                  placeholder="e.g. Apex Events & Productions"
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid #CBD5E1",
                    padding: "0 14px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#07294C",
                    marginBottom: "6px",
                  }}
                >
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={leadForm.email}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, email: e.target.value })
                  }
                  placeholder="sarah@apexevents.com"
                  style={{
                    width: "100%",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid #CBD5E1",
                    padding: "0 14px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: "#94A3B8",
                  margin: "4px 0 6px",
                  lineHeight: "1.4",
                }}
              >
                By continuing, you agree to receive your calculation report and
                occasional event operations insights from NeoOps.
              </p>

              <button
                type="submit"
                disabled={isExporting}
                style={{
                  height: "48px",
                  borderRadius: "12px",
                  background: "#07294C",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: "700",
                  border: "none",
                  cursor: isExporting ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#0D3B6C")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#07294C")
                }
              >
                <Download style={{ width: "16px", height: "16px" }} />
                {isExporting
                  ? "Generating report..."
                  : `Download ${pendingFormat.toUpperCase()} Report`}
              </button>
            </form>
          </div>
        </div>
      )}
    </MarketingLayout>
  );
}

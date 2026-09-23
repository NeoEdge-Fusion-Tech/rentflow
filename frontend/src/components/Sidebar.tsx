import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Calendar,
  CreditCard,
  QrCode,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Coins,
  FileText,
  FileSpreadsheet,
  Truck,
  Briefcase,
  ListChecks,
  ScanLine,
  HelpCircle,
  MessageSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo } from "./Logo";
import { UserOrganizationSelector } from "./UserOrganizationSelector";
import { cn } from "@/src/utils";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useVisibility } from "../context/VisibilityContext";
import { usePermissions } from "../context/usePermissions";

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  isSuperuser?: boolean;
  currentUser?: any;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Package, label: "Inventory", path: "/inventory" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: Truck, label: "Vendors", path: "/vendors" },
  { icon: Calendar, label: "Bookings", path: "/bookings" },
  { icon: FileText, label: "Invoices", path: "/invoices" },
  { icon: FileSpreadsheet, label: "Quotations", path: "/quotations" },
  { icon: Briefcase, label: "Projects", path: "/events" },
  { icon: Coins, label: "General Expenses", path: "/general-expenses" },
  { icon: MessageSquare, label: "Feedback Forms", path: "/feedback-forms" },
  { icon: ListChecks, label: "Task Checklist", path: "/task-checklist" },
  { icon: CreditCard, label: "Payments", path: "/payments" },
  { icon: QrCode, label: "Scanner", path: "/scanner" },
  { icon: ScanLine, label: "Validation App", path: "/validation" },
  { icon: HelpCircle, label: "Help & Support", path: "/support" },
  { icon: Calendar, label: "Rental Settings", path: "/rental-settings" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: CreditCard, label: "Billing & Plans", path: "/settings?tab=billing" },
];

const superAdminItems = [
  { icon: LayoutDashboard, label: "Global Dashboard", path: "/superadmin" },
  { icon: Users, label: "Organizations", path: "/superadmin/organizations" },
  { icon: Users, label: "Internal Users", path: "/superadmin/users" },
  { icon: Calendar, label: "Global Bookings", path: "/superadmin/bookings" },
  { icon: FileText, label: "Global Invoices", path: "/superadmin/invoices" },
  { icon: Coins, label: "Currencies", path: "/superadmin/currencies" },
  {
    icon: CreditCard,
    label: "Subscriptions",
    path: "/superadmin/subscriptions",
  },
  {
    icon: CreditCard,
    label: "Subscription Plans",
    path: "/superadmin/subscription-plans",
  },
  { icon: Coins, label: "Revenue & Payments", path: "/superadmin/revenue" },
  { icon: Settings, label: "Global Config", path: "/superadmin/global-config" },
];

export function Sidebar({
  isOpen,
  toggle,
  isSuperuser,
  currentUser,
}: SidebarProps) {
  const { theme } = useTheme();
  const { isRevenueHidden, toggleRevenueVisibility } = useVisibility();
  const { hasPermission } = usePermissions(currentUser);
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", next.toString());
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[var(--bg-app)]/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[var(--bg-surface)] border-r border-[var(--border-soft)] transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-64 lg:w-20" : "w-64",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-4 border-b border-[var(--border-subtle)] justify-between overflow-hidden">
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-lg border border-transparent hover:border-[var(--border-soft)] transition-colors shrink-0"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div
              className={cn(
                "flex-1 min-w-0 transition-opacity duration-300 ml-2",
                isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100",
              )}
            >
              {!isSuperuser && currentUser ? (
                <UserOrganizationSelector
                  organizations={currentUser?.organizations_list || []}
                  currentOrgId={currentUser?.organization_id}
                />
              ) : (
                <Logo className="h-9" dark={theme === "dark"} showText={true} />
              )}
            </div>
            <button
              onClick={toggle}
              className="ml-auto lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)] shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems
              .filter((item) => {
                if (isSuperuser) return true;
                if (currentUser?.role === "validator") {
                  return item.label === "Validation App";
                }
                if (item.label === "Validation App") {
                  return (
                    currentUser?.role === "staff" &&
                    currentUser?.has_booking !== false
                  );
                }
                if (
                  item.label === "Inventory" &&
                  (currentUser?.has_booking === false ||
                    !hasPermission("inventory", "read"))
                ) {
                  return false;
                }
                if (
                  item.label === "Bookings" &&
                  (currentUser?.has_booking === false ||
                    !hasPermission("bookings", "read"))
                ) {
                  return false;
                }
                if (
                  item.label === "Clients" &&
                  !hasPermission("clients", "read")
                ) {
                  return false;
                }
                if (
                  item.label === "Vendors" &&
                  !hasPermission("vendors", "read")
                ) {
                  return false;
                }
                if (
                  item.label === "Projects" &&
                  !hasPermission("events", "read")
                ) {
                  return false;
                }
                if (
                  item.label === "Scanner" &&
                  currentUser?.has_booking === false
                ) {
                  return false;
                }
                if (currentUser?.role === "staff") {
                  if (
                    item.label === "Settings" ||
                    item.label === "Payments" ||
                    item.label === "Rental Settings"
                  ) {
                    return false;
                  }
                }
                if (
                  item.label === "Invoices" &&
                  currentUser?.has_invoice === false
                ) {
                  return false;
                }
                return true;
              })
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors overflow-hidden",
                      isActive
                        ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary",
                      isCollapsed ? "justify-center" : "gap-3",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <ChevronRight className="ml-auto w-4 h-4 shrink-0" />
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}

            {isSuperuser && (
              <>
                {!isCollapsed && (
                  <div className="pt-6 pb-2 px-3">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase opacity-80 truncate">
                      Platform Management
                    </p>
                  </div>
                )}
                {superAdminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors overflow-hidden",
                        isActive
                          ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary",
                        isCollapsed ? "justify-center" : "gap-3",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <ChevronRight className="ml-auto w-4 h-4 shrink-0" />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Usage Tracker */}
          {currentUser &&
            currentUser.subscription_usage &&
            !isSuperuser &&
            !isCollapsed && (
              <div className="px-4 py-2 space-y-4">
                {currentUser.has_invoice && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--text-muted)]">Invoices</span>
                      <span className="text-[var(--text-main)]">
                        {currentUser.subscription_usage.invoices_used} /{" "}
                        {currentUser.subscription_usage.invoices_limit === -1
                          ? "∞"
                          : currentUser.subscription_usage.invoices_limit}
                      </span>
                    </div>
                    {currentUser.subscription_usage.invoices_limit !== -1 && (
                      <div className="h-1.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            currentUser.subscription_usage.invoices_used >=
                            currentUser.subscription_usage.invoices_limit
                              ? "bg-rose-500"
                              : "bg-brand-primary"
                          }`}
                          style={{
                            width: `${Math.min(
                              (currentUser.subscription_usage.invoices_used /
                                currentUser.subscription_usage.invoices_limit) *
                                100,
                              100,
                            )}%`,
                          }}
                        ></div>
                      </div>
                    )}
                    {currentUser.subscription_usage.invoices_limit !== -1 &&
                      currentUser.subscription_usage.invoices_used >=
                        currentUser.subscription_usage.invoices_limit && (
                        <p className="text-[10px] text-rose-500 font-medium">
                          Limit reached
                        </p>
                      )}
                  </div>
                )}

                {currentUser.has_booking && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--text-muted)]">Bookings</span>
                      <span className="text-[var(--text-main)]">
                        {currentUser.subscription_usage.bookings_used} /{" "}
                        {currentUser.subscription_usage.bookings_limit === -1
                          ? "∞"
                          : currentUser.subscription_usage.bookings_limit}
                      </span>
                    </div>
                    {currentUser.subscription_usage.bookings_limit !== -1 && (
                      <div className="h-1.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            currentUser.subscription_usage.bookings_used >=
                            currentUser.subscription_usage.bookings_limit
                              ? "bg-rose-500"
                              : "bg-brand-primary"
                          }`}
                          style={{
                            width: `${Math.min(
                              (currentUser.subscription_usage.bookings_used /
                                currentUser.subscription_usage.bookings_limit) *
                                100,
                              100,
                            )}%`,
                          }}
                        ></div>
                      </div>
                    )}
                    {currentUser.subscription_usage.bookings_limit !== -1 &&
                      currentUser.subscription_usage.bookings_used >=
                        currentUser.subscription_usage.bookings_limit && (
                        <p className="text-[10px] text-rose-500 font-medium">
                          Limit reached
                        </p>
                      )}
                  </div>
                )}
              </div>
            )}

          {/* Footer */}
          <div
            className={cn(
              "border-t border-[var(--border-soft)] mt-auto bg-[var(--bg-app)]/50",
              isCollapsed ? "p-2" : "p-4",
            )}
          >
            <div
              className={cn(
                "flex items-center mb-2 overflow-hidden",
                isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
              )}
            >
              <div className="w-8 h-8 shrink-0 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-brand-accent uppercase shadow-sm">
                {currentUser?.first_name?.[0] || currentUser?.email?.[0] || "U"}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-main)] truncate">
                    {currentUser?.first_name
                      ? `${currentUser.first_name} ${currentUser.last_name}`
                      : currentUser?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate capitalize">
                    {currentUser?.role ||
                      (isSuperuser ? "Super Admin" : "Member")}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={toggleRevenueVisibility}
              title={
                isCollapsed
                  ? isRevenueHidden
                    ? "Show Revenue"
                    : "Hide Revenue"
                  : undefined
              }
              className={cn(
                "flex items-center w-full py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary rounded-xl transition-all duration-200 mb-1 overflow-hidden",
                isCollapsed ? "justify-center" : "px-3 gap-3",
              )}
            >
              {isRevenueHidden ? (
                <EyeOff className="w-5 h-5 shrink-0" />
              ) : (
                <Eye className="w-5 h-5 shrink-0" />
              )}
              {!isCollapsed && (
                <span className="truncate">
                  {isRevenueHidden ? "Show Revenue" : "Hide Revenue"}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              title={isCollapsed ? "Sign Out" : undefined}
              className={cn(
                "flex items-center w-full py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all duration-200 overflow-hidden",
                isCollapsed ? "justify-center" : "px-3 gap-3",
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

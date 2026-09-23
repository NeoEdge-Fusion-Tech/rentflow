import re

with open("frontend/src/components/Sidebar.tsx", "r") as f:
    content = f.read()

# 1. Add isCollapsed state
state_code = """
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", next.toString());
      return next;
    });
  };

  const handleLogout = () => {
"""
content = content.replace("  const handleLogout = () => {", state_code)

# 2. Update <aside> classes
aside_old = """      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-surface)] border-r border-[var(--border-soft)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >"""
aside_new = """      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-[var(--bg-surface)] border-r border-[var(--border-soft)] transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-64 lg:w-20" : "w-64"
        )}
      >"""
content = content.replace(aside_old, aside_new)

# 3. Update header
header_old = """          <div className="h-16 flex items-center px-4 border-b border-[var(--border-subtle)]">
            {!isSuperuser && currentUser ? (
              <div className="flex-1 min-w-0">
                <UserOrganizationSelector
                  organizations={currentUser?.organizations_list || []}
                  currentOrgId={currentUser?.organization_id}
                />
              </div>
            ) : (
              <Logo className="h-9" dark={theme === "dark"} />
            )}
            <button
              onClick={toggle}
              className="ml-auto lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>"""
header_new = """          <div className="h-16 flex items-center px-4 border-b border-[var(--border-subtle)] justify-between overflow-hidden">
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-lg border border-transparent hover:border-[var(--border-soft)] transition-colors shrink-0"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={cn("flex-1 min-w-0 transition-opacity duration-300 ml-2", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
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
          </div>"""
content = content.replace(header_old, header_new)

# 4. Nav links
nav_old = """                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-5 h-5" />
                      {item.label}
                      {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                    </>
                  )}
                </NavLink>"""
nav_new = """                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors overflow-hidden",
                      isActive
                        ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary",
                      isCollapsed ? "justify-center" : "gap-3"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {isActive && <ChevronRight className="ml-auto w-4 h-4 shrink-0" />}
                        </>
                      )}
                    </>
                  )}
                </NavLink>"""
content = content.replace(nav_old, nav_new)

nav_old_super = """                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className="w-5 h-5" />
                        {item.label}
                        {isActive && (
                          <ChevronRight className="ml-auto w-4 h-4" />
                        )}
                      </>
                    )}
                  </NavLink>"""
nav_new_super = """                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors overflow-hidden",
                        isActive
                          ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary",
                        isCollapsed ? "justify-center" : "gap-3"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {isActive && <ChevronRight className="ml-auto w-4 h-4 shrink-0" />}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>"""
content = content.replace(nav_old_super, nav_new_super)


# 5. Usage Tracker and Platform Management
usage_tracker_old = (
    "{currentUser && currentUser.subscription_usage && !isSuperuser && ("
)
usage_tracker_new = "{currentUser && currentUser.subscription_usage && !isSuperuser && !isCollapsed && ("
content = content.replace(usage_tracker_old, usage_tracker_new)

platform_old = """              <>
                <div className="pt-6 pb-2 px-3">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase opacity-80">
                    Platform Management
                  </p>
                </div>"""
platform_new = """              <>
                {!isCollapsed && (
                  <div className="pt-6 pb-2 px-3">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase opacity-80 truncate">
                      Platform Management
                    </p>
                  </div>
                )}"""
content = content.replace(platform_old, platform_new)

# 6. Footer
footer_old = """          <div className="p-4 border-t border-[var(--border-soft)] mt-auto bg-[var(--bg-app)]/50">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-brand-accent uppercase shadow-sm">
                {currentUser?.first_name?.[0] || currentUser?.email?.[0] || "U"}
              </div>
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
            </div>
            <button
              onClick={toggleRevenueVisibility}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary rounded-xl transition-all duration-200 mb-1"
            >
              {isRevenueHidden ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
              {isRevenueHidden ? "Show Revenue" : "Hide Revenue"}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>"""
footer_new = """          <div className={cn("border-t border-[var(--border-soft)] mt-auto bg-[var(--bg-app)]/50", isCollapsed ? "p-2" : "p-4")}>
            <div className={cn("flex items-center mb-2 overflow-hidden", isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2")}>
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
              title={isCollapsed ? (isRevenueHidden ? "Show Revenue" : "Hide Revenue") : undefined}
              className={cn(
                "flex items-center w-full py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary rounded-xl transition-all duration-200 mb-1 overflow-hidden",
                isCollapsed ? "justify-center" : "px-3 gap-3"
              )}
            >
              {isRevenueHidden ? (
                <EyeOff className="w-5 h-5 shrink-0" />
              ) : (
                <Eye className="w-5 h-5 shrink-0" />
              )}
              {!isCollapsed && <span className="truncate">{isRevenueHidden ? "Show Revenue" : "Hide Revenue"}</span>}
            </button>
            <button
              onClick={handleLogout}
              title={isCollapsed ? "Sign Out" : undefined}
              className={cn(
                "flex items-center w-full py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all duration-200 overflow-hidden",
                isCollapsed ? "justify-center" : "px-3 gap-3"
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">Sign Out</span>}
            </button>
          </div>"""
content = content.replace(footer_old, footer_new)

with open("frontend/src/components/Sidebar.tsx", "w") as f:
    f.write(content)

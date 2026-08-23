import React, { useEffect, useState } from "react";
import {
  Users as UsersIcon,
  Search,
  Shield,
  MoreVertical,
  Mail,
  Building2,
  Filter,
  UserCheck,
  UserMinus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SuperAdminService } from "../../api";

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id: number;
  organization_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  const fetchUsers = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = { page };
      if (searchQuery) params.search = searchQuery;
      const res = await SuperAdminService.getUsers(params);
      setUsers(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchQuery]);

  // Backend handles search, no need to filter on frontend

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Internal Users
          </h1>
          <p className="text-[var(--text-muted)]">
            Manage all users across the entire platform.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <UsersIcon className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Total Users
              </p>
              <h3 className="text-2xl font-bold text-[var(--text-main)]">
                {users.length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Shield className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Super Admins
              </p>
              <h3 className="text-2xl font-bold text-[var(--text-main)]">
                {users.filter((u) => u.is_superuser).length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <UserCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Active Accounts
              </p>
              <h3 className="text-2xl font-bold text-[var(--text-main)]">
                {users.filter((u) => u.is_active).length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all text-sm w-full md:w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl transition-colors border border-[var(--border-soft)]">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-app)]/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Loading platform users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[var(--text-muted)]"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[var(--bg-app)]/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            user.is_superuser
                              ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20"
                              : "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)]"
                          }`}
                        >
                          {user.first_name?.[0] ||
                            user.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-main)]">
                            {user.first_name} {user.last_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.is_superuser && (
                          <Shield className="w-4 h-4 text-brand-primary" />
                        )}
                        <span
                          className={`text-sm font-medium capitalize ${
                            user.is_superuser
                              ? "text-brand-primary"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {user.is_superuser
                            ? "Super Admin"
                            : user.role === "staff"
                              ? "Staff"
                              : user.role === "validator"
                                ? "Validator"
                                : user.role === "admin"
                                  ? "Admin"
                                  : user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm text-[var(--text-muted)]">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                          <span className="font-medium text-[var(--text-main)]">
                            {user.organization_name || "System / Platform"}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] ml-6 opacity-70">
                          ID: {user.organization_id || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          user.subscription_plan === "free"
                            ? "bg-gray-500/10 text-gray-500"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {user.subscription_plan || "Free"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.is_active
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {user.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.is_active ? (
                          <button
                            className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Deactivate User"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="Activate User"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-lg transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && totalCount > 0 && (
        <div className="flex items-center justify-between mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}{" "}
            results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(Math.ceil(totalCount / itemsPerPage), p + 1),
                )
              }
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

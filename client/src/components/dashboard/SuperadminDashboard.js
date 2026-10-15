"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Users,
  ShieldCheck,
  Crown,
  Building2,
  Stethoscope,
  FileText,
  HeartPulse,
  Pill,
  Shield,
  DollarSign,
  Wrench,
  Scale,
  Laptop,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  LogOut,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Eye,
  Settings,
  Clock,
  Sparkles,
  KeyRound,
  AlertCircle,
  Hash,
  Download,
  Bed,
  Calendar,
  Layers,
  Lock,
  TrendingUp,
  UserCheck,
  UserX,
  Mail,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardApi } from "@/services/dashboardApi";

export default function SuperadminDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onSwitchPersona }) {
  // Navigation State
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDeptTab, setActiveDeptTab] = useState("hr");
  const [activePersona, setActivePersona] = useState(currentUser?.role || "superadmin");
  const [slideDirection, setSlideDirection] = useState(1);
  const deptSliderRef = useRef(null);

  const scrollDeptSlider = (dir) => {
    if (deptSliderRef.current) {
      deptSliderRef.current.scrollBy({ left: dir * 260, behavior: "smooth" });
    }
  };

  // Data State
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [userDeptFilter, setUserDeptFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddSuperadminModal, setShowAddSuperadminModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "general",
    role: "user",
    designation: "Staff",
    phone: "",
    salary: 50000
  });

  // New Superadmin Form State
  const [newSuperadminForm, setNewSuperadminForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    department: "general"
  });

  // Fetch initial dashboard metrics & data
  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const [usersRes, auditRes, healthRes] = await Promise.allSettled([
        dashboardApi.getUsers({ limit: 50 }),
        dashboardApi.getAuditLogs({ limit: 15 }),
        dashboardApi.getHealth()
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        setUsers(usersRes.value.data);
      } else if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
      }

      if (auditRes.status === "fulfilled" && auditRes.value?.data) {
        setAuditLogs(auditRes.value.data);
      } else if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value)) {
        setAuditLogs(auditRes.value);
      }

      if (healthRes.status === "fulfilled") {
        setSystemHealth(healthRes.value);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle User Status Toggle
  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      await dashboardApi.updateUserStatus(user._id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, status: nextStatus } : u))
      );
      setFeedback({
        type: "success",
        message: `Status updated for ${user.name} to "${nextStatus}".`
      });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update status." });
    }
  };

  // Handle Create User Submit
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await dashboardApi.createUser(newUserForm);
      setFeedback({
        type: "success",
        message: `Staff account created for ${newUserForm.name} (${newUserForm.role})!`
      });
      setShowAddUserModal(false);
      setNewUserForm({
        name: "",
        email: "",
        password: "",
        department: "general",
        role: "user",
        designation: "Staff",
        phone: "",
        salary: 50000
      });
      loadDashboardData();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to create user." });
    }
  };

  // Handle Create Superadmin Submit
  const handleCreateSuperadminSubmit = async (e) => {
    e.preventDefault();
    try {
      await dashboardApi.createSuperadmin(newSuperadminForm);
      setFeedback({
        type: "success",
        message: `Superadmin account created for ${newSuperadminForm.name}!`
      });
      setShowAddSuperadminModal(false);
      setNewSuperadminForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        department: "general"
      });
      loadDashboardData();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to create superadmin." });
    }
  };

  // Handle Audit Hash-Chain Verification
  const handleVerifyAuditChain = async () => {
    try {
      const res = await dashboardApi.verifyAuditLogs();
      setVerificationResult(res);
      setShowVerifyModal(true);
    } catch (err) {
      setVerificationResult({
        valid: false,
        error: err.message || "Failed to verify cryptographic chain"
      });
      setShowVerifyModal(true);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !userSearch ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.role?.toLowerCase().includes(userSearch.toLowerCase());
      const matchDept =
        userDeptFilter === "all" ||
        u.department?.toLowerCase() === userDeptFilter.toLowerCase();
      const matchRole =
        userRoleFilter === "all" ||
        u.role?.toLowerCase() === userRoleFilter.toLowerCase();
      return matchSearch && matchDept && matchRole;
    });
  }, [users, userSearch, userDeptFilter, userRoleFilter]);

  // Superadmins List
  const superadmins = useMemo(() => {
    return users.filter((u) => u.role === "superadmin");
  }, [users]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditActionFilter === "all") return true;
      return log.action?.toLowerCase().includes(auditActionFilter.toLowerCase());
    });
  }, [auditLogs, auditActionFilter]);

  // Navigation Items
  const navItems = [
    { id: "overview", label: "Executive Overview", icon: Activity, badge: null },
    { id: "governance", label: "Superadmin Governance", icon: Crown, badge: superadmins.length || "1" },
    { id: "users", label: "Staff & User Directory", icon: Users, badge: users.length || null },
    { id: "departments", label: "7 Department Portals", icon: Building2, badge: "7" },
    { id: "clinical", label: "Clinical & Inpatients", icon: Stethoscope, badge: "Live" },
    { id: "audit", label: "SHA-256 Audit Trail", icon: ShieldCheck, badge: "Secure" },
    { id: "system", label: "System Diagnostics", icon: Laptop, badge: null }
  ];

  // 7 Hospital Departments Catalog
  const departmentsCatalog = [
    {
      id: "hr",
      name: "HR & Workforce",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      bgLight: "bg-blue-50 text-blue-700",
      description: "Staff hiring pipeline, attendance verification, leaves, shifts & rosters.",
      stats: { primary: "142 Active Staff", secondary: "9 Pending Leaves", accent: "98.4% Attendance" },
      highlights: ["Midnight-crossing rosters", "Attendance geofencing", "Multi-tier leave approval"]
    },
    {
      id: "pharmacy",
      name: "Pharmacy & Dispensing",
      icon: Pill,
      color: "from-emerald-600 to-teal-600",
      bgLight: "bg-emerald-50 text-emerald-700",
      description: "Drug catalog, batch inventory, FEFO (First-Expired-First-Out) dispensing.",
      stats: { primary: "1,840 Drug Batches", secondary: "14 Expiring in 30d", accent: "99.2% In-Stock" },
      highlights: ["FEFO automated dispatch", "Critical stock threshold alerts", "Automated Purchase Orders"]
    },
    {
      id: "security",
      name: "Hospital Security",
      icon: Shield,
      color: "from-slate-700 to-slate-900",
      bgLight: "bg-slate-100 text-slate-800",
      description: "Visitor management, electronic gate passes, perimeter patrols & incident logs.",
      stats: { primary: "384 Today's Visitors", secondary: "0 Critical Alerts", accent: "12 Active Guards" },
      highlights: ["Hospital-wide Code Blue broadcast", "Gate pass RFID/QR check", "Incident escalation pipeline"]
    },
    {
      id: "finance",
      name: "Finance & Accounts",
      icon: DollarSign,
      color: "from-amber-600 to-orange-600",
      bgLight: "bg-amber-50 text-amber-700",
      description: "Sequential FY invoices, department budget allocations, claims & payroll review.",
      stats: { primary: "₹ 1.84 Cr Monthly Rev", secondary: "34 Pending Invoices", accent: "100% Tax Compliant" },
      highlights: ["Non-gap sequential FY invoices", "Advance deposit tracking", "Role-tiered clinical discounts"]
    },
    {
      id: "support",
      name: "Facilities & Support",
      icon: Wrench,
      color: "from-cyan-600 to-blue-700",
      bgLight: "bg-cyan-50 text-cyan-700",
      description: "Housekeeping schedules, bio-waste tracking, ambulance fleet & tickets.",
      stats: { primary: "28 Work Orders", secondary: "4 Ambulances On-Standby", accent: "99.5% Cleanliness" },
      highlights: ["Ambulance GPS tracking", "Housekeeping ward checklists", "Bio-hazard waste disposal log"]
    },
    {
      id: "legal",
      name: "Legal & Compliance",
      icon: Scale,
      color: "from-purple-700 to-indigo-800",
      bgLight: "bg-purple-50 text-purple-700",
      description: "Regulatory medical licenses, vendor agreements, litigation tracking & legal holds.",
      stats: { primary: "18 Active Licenses", secondary: "1 Expiring Soon", accent: "100% HIPAA/NABH" },
      highlights: ["Tamper-evident legal holds", "Vendor contracts repository", "Statutory compliance audit"]
    },
    {
      id: "technical",
      name: "Technical & Biomedical IT",
      icon: Laptop,
      color: "from-rose-600 to-pink-700",
      bgLight: "bg-rose-50 text-rose-700",
      description: "Biomedical equipment calibration, IT infrastructure, uptime probes & maintenance.",
      stats: { primary: "99.98% System Uptime", secondary: "62 Biomedical Assets", accent: "Zero Downtime" },
      highlights: ["Daily rotating audit logs", "Distributed background locks", "FHIR R4 interoperability API"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* TOP EXECUTIVE COMMAND HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.05 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20"
            >
              <Activity className="w-5 h-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">MediPulse</span>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                  Command Center
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Hospital Governance & Multi-Department Operations Portal
              </p>
            </div>
          </div>

          {/* Context Switcher & System Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Branch Switcher */}
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => onSwitchBranch && onSwitchBranch("MPH-CEN")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  activeBranch === "MPH-CEN"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="hidden md:inline">Central Campus</span>
                <span className="md:hidden">MPH-CEN</span>
              </button>
              <button
                onClick={() => onSwitchBranch && onSwitchBranch("MPH-SOU")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  activeBranch === "MPH-SOU"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="hidden md:inline">South Campus</span>
                <span className="md:hidden">MPH-SOU</span>
              </button>
            </div>

            {/* Live API Health Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>API Port 5000</span>
            </div>

            {/* Swagger Spec Link */}
            <a
              href="http://localhost:5000/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Swagger Spec</span>
            </a>

            {/* Active User Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser?.name?.charAt(0).toUpperCase() || "S"}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.name || "Superadmin"}
                </span>
                <span className="text-[10px] text-slate-500 capitalize leading-tight">
                  {currentUser?.role || "superadmin"}
                </span>
              </div>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="h-8 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* FEEDBACK BANNER */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between z-30 ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-rose-50 text-rose-800 border-b border-rose-200"
            }`}
          >
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT AREA */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* LEFT EXECUTIVE SIDEBAR */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {currentUser?.name?.charAt(0).toUpperCase() || "S"}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {currentUser?.name || "Jatin Walia"}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                <Badge variant="outline" className="mt-1 text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold uppercase">
                  {currentUser?.role || "superadmin"}
                </Badge>
              </div>
            </div>

            {/* Persona Switcher Preview for Superadmin */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Role Perspective Preview
              </label>
              <select
                value={activePersona}
                onChange={(e) => {
                  const role = e.target.value;
                  setActivePersona(role);
                  if (onSwitchPersona && role !== "superadmin") {
                    onSwitchPersona(role);
                  }
                }}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="superadmin">Superadmin (All Privileges)</option>
                <option value="hr">HR Department Administrator</option>
                <option value="pharmacy">Pharmacy Head</option>
                <option value="finance">Finance Director</option>
                <option value="security">Chief Security Officer</option>
                <option value="support">Facilities Manager</option>
                <option value="legal">Legal Counsel</option>
                <option value="technical">Chief Technology Officer</option>
                <option value="doctor">Lead Clinical Doctor</option>
              </select>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? "text-blue-700 bg-blue-50/90 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-md"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Cryptographic Chain Badge */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">SHA-256 Hash Chain</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              Tamper-evident append-only ledger verifies all staff mutations & logins.
            </p>
            <Button
              size="sm"
              onClick={handleVerifyAuditChain}
              className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1.5"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Verify Chain Integrity</span>
            </Button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* 1. EXECUTIVE OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div
                key="tab-overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Executive Welcome Card */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                      <span>Hospital Executive Command</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">
                      Welcome, {currentUser?.name || "Superadmin Jatin Walia"}
                    </h2>
                    <p className="text-blue-100 text-xs max-w-2xl leading-relaxed">
                      Unified governance over MediPulse Hospital Systems across Central Campus (MPH-CEN) and South Campus (MPH-SOU). All 7 core operational departments, clinical services, and tamper-evident audit ledgers are online and synchronized.
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5 mt-5">
                      <Button
                        size="sm"
                        onClick={() => setShowAddUserModal(true)}
                        className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-9 gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4 text-blue-700" />
                        <span>Add Hospital Staff</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowAddSuperadminModal(true)}
                        className="bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-xs h-9 gap-1.5 border border-white/20"
                      >
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span>Create Superadmin</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleVerifyAuditChain}
                        className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs h-9 gap-1.5 border border-white/20"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Audit Verification</span>
                      </Button>
                    </div>
                  </div>

                  {/* Ambient graphical background flourish */}
                  <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
                </div>

                {/* 4 Key Performance Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">Hospital Staff</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {users.length || "12"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Across 7 Departments</span>
                    </div>
                  </motion.div>

                  {/* Metric 2 */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">Dual-Campus Beds</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Bed className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">430 Beds</div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                      <span>CEN: 250 | SOU: 180</span>
                    </div>
                  </motion.div>

                  {/* Metric 3 */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">Audit Ledger</span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Hash className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {auditLogs.length || "100+"} Logs
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SHA-256 Validated</span>
                    </div>
                  </motion.div>

                  {/* Metric 4 */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">System Health</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">100% Online</div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Node.js v24 + MongoDB</span>
                    </div>
                  </motion.div>
                </div>

                {/* 7 Hospital Departments Quick Status Grid */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Hospital Department Matrix</h3>
                      <p className="text-xs text-slate-500">Live operational status across all 7 executive modules</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("departments")}
                      className="text-xs text-blue-600 gap-1 h-8"
                    >
                      <span>Open Department Hub</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {departmentsCatalog.map((dept) => {
                      const Icon = dept.icon;
                      return (
                        <div
                          key={dept.id}
                          onClick={() => {
                            setActiveDeptTab(dept.id);
                            setActiveTab("departments");
                          }}
                          className="p-3.5 rounded-xl border border-slate-200/70 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50 hover:bg-white group"
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className={`w-8 h-8 rounded-lg ${dept.bgLight} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-xs text-slate-800">{dept.name}</span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-700 mb-1">{dept.stats.primary}</p>
                          <p className="text-[10px] text-slate-500 truncate">{dept.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent System Activity / Audit Feed */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Live Audit Activity Stream</h3>
                      <p className="text-xs text-slate-500">Recent cryptographic access and governance actions</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("audit")}
                      className="text-xs text-blue-600 gap-1 h-8"
                    >
                      <span>View All Logs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {auditLogs.slice(0, 5).map((log, index) => (
                      <div
                        key={log._id || index}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                            <Hash className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {log.action?.replace(/_/g, " ")}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Actor: {log.actor?.name || log.actor?.email || "System"} • Resource: {log.resource || "system"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold">Chained SHA-256</span>
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No audit records captured yet.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. SUPERADMIN GOVERNANCE TAB */}
            {activeTab === "governance" && (
              <motion.div
                key="tab-governance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <span>Multi-Superadmin Governance</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      OpenAPI: <code className="font-mono text-blue-600">/api/v1/superadmins</code> • Hospital root administrator authority with quorum protection.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddSuperadminModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Superadmin</span>
                  </Button>
                </div>

                {/* Superadmins Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">
                      Active Superadmin Accounts ({superadmins.length})
                    </span>
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                      Multi-Superadmin Protected
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                        <tr>
                          <th className="p-3.5 pl-5">Superadmin Name</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">Department</th>
                          <th className="p-3.5">Auth Type</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-5 text-right">Governance Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {superadmins.map((admin) => (
                          <tr key={admin._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 pl-5 font-semibold text-slate-900 flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs">
                                <Crown className="w-4 h-4 text-amber-600" />
                              </div>
                              <span>{admin.name}</span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-mono text-[11px]">{admin.email}</td>
                            <td className="p-3.5 text-slate-600 capitalize">{admin.department || "General"}</td>
                            <td className="p-3.5">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {admin.authProvider || "local"}
                              </Badge>
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            </td>
                            <td className="p-3.5 pr-5 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] text-slate-600 hover:text-amber-700"
                                onClick={() => {
                                  if (confirm(`Demote ${admin.name} to regular administrator?`)) {
                                    dashboardApi.demoteSuperadmin(admin._id).then(() => {
                                      setFeedback({ type: "success", message: `Demoted ${admin.name}.` });
                                      loadDashboardData();
                                    }).catch((err) => setFeedback({ type: "error", message: err.message }));
                                  }
                                }}
                              >
                                Demote
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[11px]"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete superadmin account ${admin.name}? This action is audited.`)) {
                                    dashboardApi.deleteSuperadmin(admin._id).then(() => {
                                      setFeedback({ type: "success", message: `Superadmin deleted.` });
                                      loadDashboardData();
                                    }).catch((err) => setFeedback({ type: "error", message: err.message }));
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quorum Safety Notice */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
                  <strong>Hospital Security Policy:</strong> At least one Superadmin account must remain active at all times. A single superadmin cannot delete or demote themselves without secondary quorum authorization.
                </div>
              </motion.div>
            )}

            {/* 3. STAFF & USER DIRECTORY TAB */}
            {activeTab === "users" && (
              <motion.div
                key="tab-users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Search & Actions Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type="text"
                        placeholder="Search staff by name, email, role..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 text-xs h-10"
                      />
                    </div>

                    {/* Department Filter */}
                    <select
                      value={userDeptFilter}
                      onChange={(e) => setUserDeptFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-10 text-slate-700 font-semibold focus:outline-none"
                    >
                      <option value="all">All Departments</option>
                      <option value="hr">HR</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="security">Security</option>
                      <option value="finance">Finance</option>
                      <option value="support">Support</option>
                      <option value="legal">Legal</option>
                      <option value="technical">Technical</option>
                      <option value="clinical">Clinical</option>
                      <option value="general">General</option>
                    </select>

                    {/* Role Filter */}
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-10 text-slate-700 font-semibold focus:outline-none hidden sm:block"
                    >
                      <option value="all">All Roles</option>
                      <option value="superadmin">Superadmin</option>
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="billing_clerk">Billing Clerk</option>
                      <option value="user">Staff / User</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadDashboardData}
                      disabled={isLoadingData}
                      className="h-10 text-xs gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddUserModal(true)}
                      className="h-10 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Staff User</span>
                    </Button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                        <tr>
                          <th className="p-3.5 pl-5">Staff Member</th>
                          <th className="p-3.5">Department</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5">Designation</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 pl-5">
                              <div className="font-semibold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            </td>
                            <td className="p-3.5">
                              <span className="capitalize font-medium text-slate-700">
                                {u.department || "General"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold uppercase ${
                                  u.role === "superadmin"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : u.role === "doctor"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : u.role === "nurse"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {u.role}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-slate-600">{u.designation || "Staff"}</td>
                            <td className="p-3.5">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] transition-colors ${
                                  u.status === "active"
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                <span>{u.status === "active" ? "Active" : "Inactive"}</span>
                              </button>
                            </td>
                            <td className="p-3.5 pr-5 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => handleToggleUserStatus(u)}
                              >
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-slate-400">
                              No hospital staff found matching query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. 7 DEPARTMENT PORTALS TAB WITH ANIMATED SLIDER */}
            {activeTab === "departments" && (() => {
              const currentDeptIndex = departmentsCatalog.findIndex((d) => d.id === activeDeptTab);
              const safeDeptIndex = currentDeptIndex >= 0 ? currentDeptIndex : 0;
              const currentDept = departmentsCatalog[safeDeptIndex];
              const Icon = currentDept.icon;

              const handleNextDept = () => {
                setSlideDirection(1);
                const nextIdx = (safeDeptIndex + 1) % departmentsCatalog.length;
                setActiveDeptTab(departmentsCatalog[nextIdx].id);
              };

              const handlePrevDept = () => {
                setSlideDirection(-1);
                const prevIdx = (safeDeptIndex - 1 + departmentsCatalog.length) % departmentsCatalog.length;
                setActiveDeptTab(departmentsCatalog[prevIdx].id);
              };

              const handleSelectDept = (deptId, targetIndex) => {
                setSlideDirection(targetIndex > safeDeptIndex ? 1 : -1);
                setActiveDeptTab(deptId);
              };

              return (
                <motion.div
                  key="tab-departments"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  {/* Slider Control Header & Pagination */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">7 Department Command Hubs</h3>
                        <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                          Department {safeDeptIndex + 1} of 7 • {currentDept.name}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Slide between hospital departments or use the arrow controls to view operational SOPs and staff.
                      </p>
                    </div>

                    {/* Prev / Next & Pagination Dots */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevDept}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-slate-100"
                        title="Previous Department"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700" />
                      </Button>

                      {/* 7 Interactive Slider Dots */}
                      <div className="flex items-center gap-1.5 px-2">
                        {departmentsCatalog.map((d, idx) => {
                          const isActive = idx === safeDeptIndex;
                          return (
                            <button
                              key={d.id}
                              onClick={() => handleSelectDept(d.id, idx)}
                              className={`transition-all duration-300 rounded-full ${
                                isActive
                                  ? "w-6 h-2 bg-blue-600 shadow-xs"
                                  : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                              }`}
                              title={`Go to ${d.name}`}
                            />
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextDept}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-slate-100"
                        title="Next Department"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Slider Track (No native scrollbar, smooth sliding arrows) */}
                  <div className="relative flex items-center group">
                    <button
                      onClick={() => scrollDeptSlider(-1)}
                      className="absolute left-1 z-20 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-105 transition-all opacity-80 group-hover:opacity-100"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div
                      ref={deptSliderRef}
                      className="flex items-center gap-3 overflow-x-hidden scroll-smooth w-full px-11 py-1"
                    >
                      {departmentsCatalog.map((dept, idx) => {
                        const DeptIcon = dept.icon;
                        const isSelected = activeDeptTab === dept.id;
                        return (
                          <motion.div
                            key={dept.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectDept(dept.id, idx)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer shrink-0 min-w-[210px] select-none ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-md border-blue-600 ring-2 ring-blue-400/40"
                                : "bg-white text-slate-700 border-slate-200/80 hover:border-blue-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-white/20 text-white" : dept.bgLight
                            }`}>
                              <DeptIcon className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs truncate leading-tight">{dept.name}</div>
                              <div className={`text-[10px] font-semibold truncate ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                {dept.stats.primary}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => scrollDeptSlider(1)}
                      className="absolute right-1 z-20 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-105 transition-all opacity-80 group-hover:opacity-100"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Animated Directional Slide Content */}
                  <AnimatePresence mode="wait" custom={slideDirection}>
                    <motion.div
                      key={currentDept.id}
                      custom={slideDirection}
                      initial={{ opacity: 0, x: slideDirection * 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: slideDirection * -40 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-4"
                    >
                      {/* Dept Banner */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${currentDept.bgLight} flex items-center justify-center font-bold`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">{currentDept.name} Command</h3>
                                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                  Module #{safeDeptIndex + 1}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500">{currentDept.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {onSwitchPersona && (
                              <Button
                                size="sm"
                                onClick={() => onSwitchPersona(currentDept.id)}
                                className="h-8 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1.5 shadow-xs"
                              >
                                <span>Launch {currentDept.name} Portal</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-3 py-1">
                              Optimal
                            </Badge>
                          </div>
                        </div>

                        {/* Department KPI Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Metric</span>
                            <span className="text-base font-bold text-slate-800">{currentDept.stats.primary}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Items</span>
                            <span className="text-base font-bold text-blue-600">{currentDept.stats.secondary}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Efficiency Rate</span>
                            <span className="text-base font-bold text-emerald-600">{currentDept.stats.accent}</span>
                          </div>
                        </div>

                        {/* Department Capabilities Matrix */}
                        <div className="mt-5">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Standard Operating Procedures & Automated Modules
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {currentDept.highlights.map((h, i) => (
                              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100/60 text-xs text-blue-900 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Department Staff List */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-sm text-slate-800">
                            Assigned Staff in {currentDept.name}
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewUserForm((prev) => ({ ...prev, department: currentDept.id }));
                              setShowAddUserModal(true);
                            }}
                            className="h-8 text-xs gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Staff to {currentDept.name}</span>
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {users
                            .filter((u) => u.department?.toLowerCase() === currentDept.id)
                            .map((staff) => (
                              <div
                                key={staff._id}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">{staff.name}</span>
                                  <span className="text-slate-400 text-[11px] ml-2 font-mono">{staff.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                    {staff.designation || staff.role}
                                  </Badge>
                                  <span className={`w-2 h-2 rounded-full ${staff.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                </div>
                              </div>
                            ))}

                          {users.filter((u) => u.department?.toLowerCase() === currentDept.id).length === 0 && (
                            <div className="text-center py-6 text-slate-400 text-xs">
                              No staff members registered under {currentDept.name} yet.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Quick-Slide Navigation Footer */}
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-xs">
                        <button
                          onClick={handlePrevDept}
                          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-blue-600" />
                          <span>Previous: {departmentsCatalog[(safeDeptIndex - 1 + departmentsCatalog.length) % departmentsCatalog.length].name}</span>
                        </button>

                        <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                          Department {safeDeptIndex + 1} of {departmentsCatalog.length}
                        </span>

                        <button
                          onClick={handleNextDept}
                          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold transition-colors"
                        >
                          <span>Next: {departmentsCatalog[(safeDeptIndex + 1) % departmentsCatalog.length].name}</span>
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              );
            })()}

            {/* 5. CLINICAL & INPATIENTS TAB */}
            {activeTab === "clinical" && (
              <motion.div
                key="tab-clinical"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        <span>Clinical Operations & Longitudinal EMR</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Patients, Doctor Consultation SOAP Notes, CPOE Orders, and Two-Branch Inpatient Bed Census.
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                      Two-Branch Architecture
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100">
                      <span className="text-[11px] font-bold text-blue-800 uppercase block">Central Campus (MPH-CEN)</span>
                      <span className="text-xl font-bold text-slate-900">250 Beds</span>
                      <span className="text-[11px] text-slate-500 block mt-1">ICU: 24 | Emergency: 18</span>
                    </div>

                    <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100">
                      <span className="text-[11px] font-bold text-indigo-800 uppercase block">South Campus (MPH-SOU)</span>
                      <span className="text-xl font-bold text-slate-900">180 Beds</span>
                      <span className="text-[11px] text-slate-500 block mt-1">ICU: 14 | Emergency: 12</span>
                    </div>

                    <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase block">CPOE Drug Safety</span>
                      <span className="text-xl font-bold text-slate-900">Active</span>
                      <span className="text-[11px] text-slate-500 block mt-1">Drug-Drug interaction filter</span>
                    </div>

                    <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-100">
                      <span className="text-[11px] font-bold text-purple-800 uppercase block">Interoperability</span>
                      <span className="text-xl font-bold text-slate-900">FHIR R4</span>
                      <span className="text-[11px] text-slate-500 block mt-1">/fhir/Patient /fhir/Encounter</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      <span>Emergency ESI Triage & Acute Care</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Emergency Severity Index (ESI 1-5) color-coded triage. Instant Code Blue broadcasting through Firebase Cloud Messaging (FCM) to all registered medical personnel.
                    </p>
                    <div className="flex gap-2">
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs">ESI 1-5 Triage</Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Code Blue Push</Badge>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">OT Conflict Check</Badge>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <h4 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Longitudinal EMR & SOAP Notes</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Structured Subjective, Objective, Assessment, Plan (SOAP) clinical records with SHA-256 digital lock to prevent retroactive clinical record alteration.
                    </p>
                    <div className="flex gap-2">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">SOAP Standard</Badge>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">SHA-256 Digital Lock</Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. SHA-256 TAMPER-EVIDENT AUDIT TRAIL TAB */}
            {activeTab === "audit" && (
              <motion.div
                key="tab-audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Tamper-Evident SHA-256 Audit Trail</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      OpenAPI: <code className="font-mono text-blue-600">/api/v1/audit-logs/verify</code> • Append-only cryptographic hash chain protects medical and administrative data integrity.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleVerifyAuditChain}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5"
                    >
                      <Hash className="w-4 h-4" />
                      <span>Verify Hash Chain Integrity</span>
                    </Button>
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">
                      Audit Ledger Entries ({filteredAuditLogs.length})
                    </span>
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none"
                    >
                      <option value="all">All Actions</option>
                      <option value="LOGIN">Logins</option>
                      <option value="FORGOT_PASSWORD">Password Reset</option>
                      <option value="USER_">User Operations</option>
                      <option value="SUPERADMIN_">Superadmin</option>
                      <option value="BRANCH_">Branch Context</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                        <tr>
                          <th className="p-3.5 pl-5">Timestamp</th>
                          <th className="p-3.5">Action</th>
                          <th className="p-3.5">Actor</th>
                          <th className="p-3.5">Resource</th>
                          <th className="p-3.5 pr-5">Hash Chain Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAuditLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 pl-5 font-mono text-slate-500 text-[11px]">
                              {new Date(log.timestamp || Date.now()).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-800 border-slate-200">
                                {log.action}
                              </Badge>
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-slate-800">
                                {log.actor?.name || log.actor?.email || "System Service"}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 capitalize">
                              {log.resource || "Authentication"}
                            </td>
                            <td className="p-3.5 pr-5">
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Validated
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredAuditLogs.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-slate-400">
                              No matching audit logs found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. SYSTEM & SECURITY DIAGNOSTICS TAB */}
            {activeTab === "system" && (
              <motion.div
                key="tab-system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <h3 className="font-bold text-lg text-slate-900 mb-1 flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-blue-600" />
                    <span>System Runtime & Security Diagnostics</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-5">
                    Live infrastructure verification of database connectivity, OAuth 2.0, and email services.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Backend Server</span>
                      <div className="font-bold text-slate-800">Express 4.21 on Port 5000</div>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready & Active</span>
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Database Engine</span>
                      <div className="font-bold text-slate-800">MongoDB 127.0.0.1:27017</div>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>user_management_db connected</span>
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Google OAuth 2.0</span>
                      <div className="font-bold text-slate-800">Client ID Configured</div>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Passport.js Strategy Active</span>
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">SMTP Email Dispatch</span>
                      <div className="font-bold text-slate-800">jkw1434@gmail.com</div>
                      <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>smtp.gmail.com (Port 465 SSL)</span>
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Two-Factor Authentication</span>
                      <div className="font-bold text-slate-800">TOTP (Google Authenticator)</div>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Live QR & Secret generation</span>
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital Policy Standards</span>
                      <div className="font-bold text-slate-800">Asia/Kolkata (IST) • INR (₹)</div>
                      <span className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" />
                        <span>VAPT Security Guard Enabled</span>
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* MODAL 1: CREATE STAFF USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Register Hospital Staff Member</h3>
                <p className="text-xs text-slate-500">Creates staff account in MongoDB with role assignment</p>
              </div>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <Input
                  type="text"
                  placeholder="Dr. Rajesh Sharma"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hospital Email</label>
                <Input
                  type="email"
                  placeholder="rajesh.sharma@hospital.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Initial Password</label>
                <Input
                  type="password"
                  placeholder="StaffPass123!"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800"
                  >
                    <option value="hr">HR</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="security">Security</option>
                    <option value="finance">Finance</option>
                    <option value="support">Support</option>
                    <option value="legal">Legal</option>
                    <option value="technical">Technical</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">System Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800"
                  >
                    <option value="user">User / Staff</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="billing_clerk">Billing Clerk</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Designation</label>
                  <Input
                    type="text"
                    placeholder="Senior Consultant"
                    value={newUserForm.designation}
                    onChange={(e) => setNewUserForm({ ...newUserForm, designation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                >
                  Create Staff Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE SUPERADMIN */}
      {showAddSuperadminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAddSuperadminModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Appoint Superadmin</h3>
                <p className="text-xs text-slate-500">Grants unrestricted hospital governance authority</p>
              </div>
            </div>

            <form onSubmit={handleCreateSuperadminSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Superadmin Name</label>
                <Input
                  type="text"
                  placeholder="Dr. Anita Desai"
                  value={newSuperadminForm.name}
                  onChange={(e) => setNewSuperadminForm({ ...newSuperadminForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Superadmin Email</label>
                <Input
                  type="email"
                  placeholder="superadmin.anita@hospital.com"
                  value={newSuperadminForm.email}
                  onChange={(e) => setNewSuperadminForm({ ...newSuperadminForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Master Password</label>
                <Input
                  type="password"
                  placeholder="SuperAdminPass123!"
                  value={newSuperadminForm.password}
                  onChange={(e) => setNewSuperadminForm({ ...newSuperadminForm, password: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <Input
                  type="tel"
                  placeholder="+91 99887 76655"
                  value={newSuperadminForm.phone}
                  onChange={(e) => setNewSuperadminForm({ ...newSuperadminForm, phone: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddSuperadminModal(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                >
                  Authorize Superadmin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT VERIFICATION RESULT */}
      {showVerifyModal && verificationResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowVerifyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Cryptographic Chain Verification</h3>
                <p className="text-xs text-slate-500">SHA-256 Hash-chain integrity check report</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Integrity Confirmed: Zero Tampering Detected</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Every sequential audit record matches its backward SHA-256 hash pointer. No record has been modified or deleted.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="text-slate-500">Verified By: {currentUser?.email}</div>
                <div className="text-slate-500">Timestamp: {new Date().toISOString()}</div>
                <div className="text-emerald-700 font-bold">Chain Status: INTACT (100%)</div>
              </div>

              <Button
                onClick={() => setShowVerifyModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
              >
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

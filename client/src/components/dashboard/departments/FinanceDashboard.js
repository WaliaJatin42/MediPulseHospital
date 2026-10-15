"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  FileText,
  TrendingUp,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  PieChart,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";
import { dashboardApi } from "@/services/dashboardApi";

export default function FinanceDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [activeTab, setActiveTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setInvoices([
      { invoiceNo: "INV/2026/0014", patientName: "Aarav Gupta", uhid: "UHID-2026-0042", amount: 48500, status: "paid", date: "2026-10-14", department: "Cardiology" },
      { invoiceNo: "INV/2026/0015", patientName: "Priyanka Nair", uhid: "UHID-2026-0089", amount: 12500, status: "pending", date: "2026-10-15", department: "OPD General" },
      { invoiceNo: "INV/2026/0016", patientName: "Mohd. Zeeshan", uhid: "UHID-2026-0104", amount: 94000, status: "paid", date: "2026-10-15", department: "Orthopedics" }
    ]);

    setExpenses([
      { _id: "1", claimant: "Dr. Vikram Seth", department: "Cardiology", description: "CATH-LAB Consumables & Stents", amount: 35000, status: "pending", date: "2026-10-14" },
      { _id: "2", claimant: "Sister Reena", department: "Nursing", description: "Emergency Crash Cart Restock", amount: 8400, status: "approved", date: "2026-10-12" }
    ]);
  }, []);

  const handleExpenseDecision = (id, newStatus) => {
    setExpenses((prev) =>
      prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e))
    );
    setFeedback({ type: "success", text: `Expense claim marked as ${newStatus}.` });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Finance & Accounts Hub"
        badgeText="Sequential FY Invoices, Budgets & Payroll Review"
        badgeColor="bg-amber-50 text-amber-800 border-amber-200/60"
      />

      {feedback && (
        <div className="bg-amber-50 text-amber-800 border-b border-amber-200 px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Hospital Billing & Financial Ledgers</h2>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 font-semibold">
                Sequential Invoices (Non-Gap)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Audit-compliant FY sequential billing, department budget allocations, and expense approvals.
            </p>
          </div>

          {onBackToSuperadmin && (
            <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
              ← Back to Superadmin
            </Button>
          )}
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Monthly Clinical Revenue" value="₹ 1.84 Cr" subtitle="Central & South Campuses" icon={DollarSign} iconColor="text-amber-600 bg-amber-50" badge="+14.2% MoM" />
          <StatsCard title="Total Invoices Generated" value="482 Invoices" subtitle="Zero-Gap FY Sequence" icon={FileText} iconColor="text-blue-600 bg-blue-50" />
          <StatsCard title="Budget Consumed" value="64.8%" subtitle="Across 7 Departments" icon={PieChart} iconColor="text-indigo-600 bg-indigo-50" badge="On Track" />
          <StatsCard title="Pending Claims" value={`${expenses.filter(e => e.status === "pending").length} Claims`} subtitle="Awaiting Financial Approval" icon={Clock} iconColor="text-rose-600 bg-rose-50" />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "invoices" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Sequential Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "expenses" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Expense Claims Review
          </button>
        </div>

        {/* Tab 1: Invoices */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                  <tr>
                    <th className="p-3.5 pl-5">Invoice #</th>
                    <th className="p-3.5">Patient Name</th>
                    <th className="p-3.5">UHID</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Billed Amount</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 pr-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.invoiceNo} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{inv.patientName}</td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{inv.uhid}</td>
                      <td className="p-3.5 text-slate-600">{inv.department}</td>
                      <td className="p-3.5 font-bold font-mono text-slate-900">₹ {inv.amount.toLocaleString()}</td>
                      <td className="p-3.5 text-slate-500">{inv.date}</td>
                      <td className="p-3.5 pr-5 text-right">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${inv.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Expenses */}
        {activeTab === "expenses" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">Department Expense Claims & Approvals</h3>
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div key={exp._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{exp.description}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Claimant: {exp.claimant} ({exp.department}) • Date: {exp.date}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold font-mono text-sm text-slate-900">₹ {exp.amount.toLocaleString()}</span>
                    {exp.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleExpenseDecision(exp._id, "approved")} className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => handleExpenseDecision(exp._id, "rejected")} className="h-7 text-[11px] text-rose-600">Reject</Button>
                      </div>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Approved</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

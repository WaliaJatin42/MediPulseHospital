"use client";

import React, { useState } from "react";
import { Scale, FileText, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";

export default function LegalDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [licenses] = useState([
    { name: "Hospital Establishment Act License", authority: "State Directorate of Health", expiry: "2027-08-31", daysLeft: 320, status: "active" },
    { name: "Atomic Energy Radiation Safety (AERB)", authority: "AERB India", expiry: "2026-12-15", daysLeft: 61, status: "renewal_due" },
    { name: "Pharmacy Drug Retail License (Form 20/21)", authority: "Drugs Control Dept", expiry: "2028-03-31", daysLeft: 532, status: "active" },
    { name: "Bio-Medical Waste Authorization", authority: "Pollution Control Board", expiry: "2026-11-30", daysLeft: 46, status: "renewal_due" }
  ]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Legal & Compliance Hub"
        badgeText="Statutory Licenses, Contracts & Legal Holds"
        badgeColor="bg-purple-50 text-purple-700 border-purple-200/60"
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hospital Legal & Statutory Compliance</h2>
            <p className="text-xs text-slate-500 mt-1">
              Regulatory hospital license tracking, vendor confidentiality NDAs, and tamper-evident legal holds.
            </p>
          </div>
          {onBackToSuperadmin && (
            <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
              ← Back to Superadmin
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Statutory Licenses" value="18 Active" subtitle="Zero Expired Licenses" icon={Scale} iconColor="text-purple-600 bg-purple-50" badge="100% Compliant" />
          <StatsCard title="Upcoming Renewals" value="2 Licenses" subtitle="Due in Next 90 Days" icon={AlertTriangle} iconColor="text-amber-600 bg-amber-50" badge="Action Required" />
          <StatsCard title="Active Vendor NDAs" value="64 Contracts" subtitle="Signed & Encrypted" icon={FileText} iconColor="text-blue-600 bg-blue-50" />
          <StatsCard title="Tamper-Evident Holds" value="0 Pending" subtitle="Audit Ready" icon={ShieldCheck} iconColor="text-emerald-600 bg-emerald-50" badge="Verified" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Hospital Regulatory & Environmental Licenses</h3>
          <div className="space-y-3">
            {licenses.map((lic, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{lic.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Authority: {lic.authority} • Expiry: {lic.expiry}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={lic.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                    {lic.status === "active" ? "Valid" : "Renewal Due"}
                  </Badge>
                  <span className="text-[10px] text-slate-500 block mt-1">{lic.daysLeft} days remaining</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

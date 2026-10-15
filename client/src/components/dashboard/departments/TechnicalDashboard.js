"use client";

import React, { useState } from "react";
import { Laptop, Activity, Server, Database, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";

export default function TechnicalDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [assets] = useState([
    { assetTag: "BIO-MRI-001", name: "1.5 Tesla MRI Scanner", location: "Radiology Central", lastCalibrated: "2026-08-10", nextDue: "2027-02-10", status: "operational" },
    { assetTag: "BIO-VENT-014", name: "Hamilton C6 ICU Ventilator", location: "ICU Bed 04 CEN", lastCalibrated: "2026-09-01", nextDue: "2026-11-01", status: "operational" },
    { assetTag: "BIO-DEFIB-008", name: "Biphasic Defibrillator Crash Cart", location: "Emergency SOU", lastCalibrated: "2026-10-01", nextDue: "2026-12-01", status: "operational" },
    { assetTag: "IT-SRV-PROD1", name: "Core EMR & Database Rack", location: "Server Room CEN", lastCalibrated: "2026-10-15", nextDue: "Continuous", status: "operational" }
  ]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Technical & Biomedical Hub"
        badgeText="Biomedical Asset Calibration & IT Infrastructure"
        badgeColor="bg-rose-50 text-rose-700 border-rose-200/60"
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Biomedical Engineering & IT Infrastructure</h2>
            <p className="text-xs text-slate-500 mt-1">
              Critical medical equipment calibration schedules, PACS radiology integration, and server uptime monitoring.
            </p>
          </div>
          {onBackToSuperadmin && (
            <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
              ← Back to Superadmin
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Biomedical Assets" value="62 Units" subtitle="Zero Critical Faults" icon={Laptop} iconColor="text-rose-600 bg-rose-50" badge="100% Online" />
          <StatsCard title="System Uptime" value="99.98%" subtitle="API Port 5000 Active" icon={Server} iconColor="text-emerald-600 bg-emerald-50" badge="Verified" />
          <StatsCard title="Database Latency" value="1.8 ms" subtitle="MongoDB Local Replicas" icon={Database} iconColor="text-blue-600 bg-blue-50" />
          <StatsCard title="Scheduled Maintenance" value="3 Due Soon" subtitle="Biomedical Calibrations" icon={Activity} iconColor="text-amber-600 bg-amber-50" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Active Biomedical & Hospital IT Equipment</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                <tr>
                  <th className="p-3.5 pl-5">Asset Tag</th>
                  <th className="p-3.5">Equipment Name</th>
                  <th className="p-3.5">Campus Location</th>
                  <th className="p-3.5">Last Calibration</th>
                  <th className="p-3.5">Next Due</th>
                  <th className="p-3.5 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((a) => (
                  <tr key={a.assetTag} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">{a.assetTag}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{a.name}</td>
                    <td className="p-3.5 text-slate-600">{a.location}</td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{a.lastCalibrated}</td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{a.nextDue}</td>
                    <td className="p-3.5 pr-5 text-right">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Operational
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

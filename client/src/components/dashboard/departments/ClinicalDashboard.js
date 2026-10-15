"use client";

import React, { useState } from "react";
import { Stethoscope, HeartPulse, Bed, FileText, CheckCircle2, UserCheck, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";

export default function ClinicalDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [patients] = useState([
    { uhid: "UHID-2026-0042", name: "Aarav Gupta", age: 48, gender: "Male", department: "Cardiology", room: "ICU Bed 04 CEN", doctor: "Dr. Vikram Seth", status: "admitted" },
    { uhid: "UHID-2026-0089", name: "Priyanka Nair", age: 34, gender: "Female", department: "OPD General", room: "OPD Room 102", doctor: "Dr. Anita Desai", status: "consulting" },
    { uhid: "UHID-2026-0104", name: "Mohd. Zeeshan", age: 52, gender: "Male", department: "Orthopedics", room: "Ward 3 Bed 18 SOU", doctor: "Dr. Arvind Patel", status: "admitted" }
  ]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Clinical & EMR Hub"
        badgeText="Longitudinal EMR, SOAP Notes & Bed Census"
        badgeColor="bg-blue-50 text-blue-700 border-blue-200/60"
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Clinical Care, Inpatients & Doctor EMR</h2>
            <p className="text-xs text-slate-500 mt-1">
              Patient longitudinal records, SOAP consultation notes with SHA-256 digital locking, and dual-campus bed census.
            </p>
          </div>
          {onBackToSuperadmin && (
            <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
              ← Back to Superadmin
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Dual-Campus Beds" value="430 Beds" subtitle="CEN: 250 | SOU: 180" icon={Bed} iconColor="text-blue-600 bg-blue-50" badge="84% Occupied" />
          <StatsCard title="Today's OPD Queue" value="64 Consultations" subtitle="18 Doctors on Duty" icon={Stethoscope} iconColor="text-emerald-600 bg-emerald-50" />
          <StatsCard title="Emergency ESI Triage" value="100% Screened" subtitle="Zero Critical Delay" icon={HeartPulse} iconColor="text-rose-600 bg-rose-50" badge="Active" />
          <StatsCard title="CPOE Safety Filter" value="0 Drug Conflicts" subtitle="Auto-screened Prescriptions" icon={CheckCircle2} iconColor="text-emerald-600 bg-emerald-50" badge="Protected" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Active Patient Inpatient Census</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                <tr>
                  <th className="p-3.5 pl-5">UHID</th>
                  <th className="p-3.5">Patient Name</th>
                  <th className="p-3.5">Demographics</th>
                  <th className="p-3.5">Assigned Ward / Bed</th>
                  <th className="p-3.5">Consultant Doctor</th>
                  <th className="p-3.5 pr-5 text-right">Care Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.uhid} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-700">{p.uhid}</td>
                    <td className="p-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3.5 text-slate-500">{p.age} Yrs • {p.gender}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{p.room}</td>
                    <td className="p-3.5 text-slate-700">{p.doctor}</td>
                    <td className="p-3.5 pr-5 text-right">
                      <Badge className={p.status === "admitted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {p.status}
                      </Badge>
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

"use client";

import React, { useState, useEffect } from "react";
import { Wrench, CheckCircle2, Clock, Truck, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";

export default function SupportDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [tickets, setTickets] = useState([
    { _id: "TICK-001", title: "HVAC Thermostat Calibration in ICU 2B", priority: "high", status: "in_progress", department: "ICU", reporter: "Sister Meena" },
    { _id: "TICK-002", title: "Biomedical Waste Bins Replacement", priority: "critical", status: "open", department: "Operation Theatre", reporter: "Dr. Sharma" },
    { _id: "TICK-003", title: "OPD 3rd Floor Water Dispenser Filter Change", priority: "low", status: "resolved", department: "OPD", reporter: "Reception Staff" }
  ]);
  const [ambulances, setAmbulances] = useState([
    { vehicleNo: "DL-01-AMB-2026", type: "Advanced Life Support (ALS)", status: "on_standby", driver: "Sunil Kumar", location: "Central Campus Bay 1" },
    { vehicleNo: "DL-01-AMB-2027", type: "Basic Life Support (BLS)", status: "dispatched", driver: "Mohan Lal", location: "En route to South Campus" }
  ]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Support & Facilities Hub"
        badgeText="Housekeeping, Maintenance & Ambulance Fleet"
        badgeColor="bg-cyan-50 text-cyan-700 border-cyan-200/60"
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hospital Support & Facility Services</h2>
            <p className="text-xs text-slate-500 mt-1">
              Biomedical housekeeping schedules, SLA work order tickets, and GPS ambulance fleet dispatch.
            </p>
          </div>
          {onBackToSuperadmin && (
            <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
              ← Back to Superadmin
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Open Work Orders" value={`${tickets.filter(t => t.status !== "resolved").length} Tickets`} subtitle="SLA 98.4% On-Time" icon={Wrench} iconColor="text-cyan-600 bg-cyan-50" />
          <StatsCard title="Ambulance Fleet" value="4 Vehicles" subtitle="1 Dispatched | 3 Ready" icon={Truck} iconColor="text-blue-600 bg-blue-50" badge="Ready" />
          <StatsCard title="Ward Cleanliness" value="99.5% Score" subtitle="ICU & OT Audited" icon={CheckCircle2} iconColor="text-emerald-600 bg-emerald-50" badge="Optimal" />
          <StatsCard title="Bio-Waste Logs" value="100% Certified" subtitle="Authorized Incineration" icon={Clock} iconColor="text-amber-600 bg-amber-50" />
        </div>

        {/* Maintenance Work Orders */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Active Facility Maintenance Tickets</h3>
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{t.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Location: {t.department} • Reporter: {t.reporter}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold ${t.priority === "critical" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {t.priority}
                  </Badge>
                  <span className="font-semibold text-slate-700 capitalize">{t.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ambulance Fleet Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900">Hospital Ambulance Fleet & GPS Tracking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ambulances.map((amb) => (
              <div key={amb.vehicleNo} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{amb.vehicleNo}</span>
                  <Badge className={amb.status === "on_standby" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                    {amb.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="text-slate-600">{amb.type}</div>
                <div className="text-[11px] text-slate-500">Driver: {amb.driver} • Location: {amb.location}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

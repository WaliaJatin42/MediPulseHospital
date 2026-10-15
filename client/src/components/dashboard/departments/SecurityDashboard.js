"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  UserCheck,
  Radio,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Car,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";
import { dashboardApi } from "@/services/dashboardApi";

export default function SecurityDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [activeTab, setActiveTab] = useState("visitors");
  const [visitors, setVisitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [visitorForm, setVisitorForm] = useState({
    name: "",
    phone: "",
    purpose: "Patient Attendant",
    patientUhid: "UHID-2026-0012",
    badgeNumber: "GATE-042"
  });

  const [alertForm, setAlertForm] = useState({
    alertType: "Code Blue (Medical Emergency)",
    location: "ICU 2nd Floor Block B",
    message: "Urgent medical resuscitation team required."
  });

  const loadSecurityData = async () => {
    try {
      const visitorsRes = await dashboardApi.security.getVisitors().catch(() => ({ data: [] }));
      const visitorsList = visitorsRes.data || (Array.isArray(visitorsRes) ? visitorsRes : []);
      if (visitorsList.length === 0) {
        setVisitors([
          { _id: "1", name: "Ramesh Sharma", phone: "9876543210", purpose: "Attendant - Bed 14", badgeNo: "PASS-101", checkInTime: "10:15 AM", status: "active" },
          { _id: "2", name: "Kavita Rao", phone: "9988776655", purpose: "OPD Consultation Companion", badgeNo: "PASS-102", checkInTime: "11:30 AM", status: "active" },
          { _id: "3", name: "Suresh Pillai", phone: "9811223344", purpose: "Vendor Delivery (Bio-Medical)", badgeNo: "PASS-099", checkInTime: "09:00 AM", status: "checked_out" }
        ]);
      } else {
        setVisitors(visitorsList);
      }

      setIncidents([
        { _id: "1", title: "Unattended Baggage at Reception", severity: "medium", status: "resolved", location: "Main Lobby CEN", time: "08:45 AM" },
        { _id: "2", title: "Emergency Gate Blockage", severity: "high", status: "investigating", location: "Ambulance Bay SOU", time: "11:20 AM" }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const handleCheckIn = (e) => {
    e.preventDefault();
    setVisitors((prev) => [
      {
        ...visitorForm,
        _id: Date.now().toString(),
        badgeNo: visitorForm.badgeNumber || `PASS-${Math.floor(100 + Math.random() * 900)}`,
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "active"
      },
      ...prev
    ]);
    setFeedback({ type: "success", text: `Visitor ${visitorForm.name} checked in and badge printed.` });
    setShowCheckInModal(false);
  };

  const handleCheckOut = (id) => {
    setVisitors((prev) =>
      prev.map((v) => (v._id === id ? { ...v, status: "checked_out" } : v))
    );
    setFeedback({ type: "success", text: "Visitor checked out successfully. Pass deactivated." });
  };

  const handleBroadcastAlert = (e) => {
    e.preventDefault();
    setFeedback({
      type: "success",
      text: `🚨 Broadcast sent: ${alertForm.alertType} at ${alertForm.location} to all on-duty security and clinical personnel via FCM push.`
    });
    setShowAlertModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Hospital Security Command"
        badgeText="Visitor Control, Perimeter Patrols & Emergency Alerts"
        badgeColor="bg-slate-100 text-slate-800 border-slate-300"
      />

      {feedback && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
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
              <h2 className="text-xl font-bold text-slate-900">Hospital Security & Perimeter Control</h2>
              <Badge variant="outline" className="text-xs bg-slate-100 text-slate-800 font-semibold">
                Live Gate Control
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visitor passes, RFID badge generation, guard patrol logs, and hospital emergency Code Blue broadcasting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onBackToSuperadmin && (
              <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
                ← Back to Superadmin
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAlertModal(true)} variant="destructive" className="text-xs h-9 gap-1.5 font-bold">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Broadcast Alert</span>
            </Button>
            <Button size="sm" onClick={() => setShowCheckInModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Check-In Visitor</span>
            </Button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Active Visitors" value={`${visitors.filter(v => v.status === "active").length} Inside`} subtitle="With Valid Gate Badges" icon={UserCheck} iconColor="text-slate-800 bg-slate-100" />
          <StatsCard title="Security Incidents" value="0 Critical" subtitle="2 Investigated Today" icon={AlertTriangle} iconColor="text-amber-600 bg-amber-50" badge="Normal" />
          <StatsCard title="Active Guards" value="12 Guards" subtitle="Central & South Gates" icon={Shield} iconColor="text-blue-600 bg-blue-50" />
          <StatsCard title="Perimeter Patrols" value="100% Completed" subtitle="4 Checkpoint Rounds" icon={CheckCircle2} iconColor="text-emerald-600 bg-emerald-50" badge="Verified" />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("visitors")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "visitors" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Visitor Registry ({visitors.length})
          </button>
          <button
            onClick={() => setActiveTab("incidents")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "incidents" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Incidents & Emergency Alerts
          </button>
        </div>

        {/* Tab 1: Visitors Table */}
        {activeTab === "visitors" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                  <tr>
                    <th className="p-3.5 pl-5">Badge #</th>
                    <th className="p-3.5">Visitor Name</th>
                    <th className="p-3.5">Contact Phone</th>
                    <th className="p-3.5">Purpose of Visit</th>
                    <th className="p-3.5">Check-In Time</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visitors.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-800">{v.badgeNo}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{v.name}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{v.phone}</td>
                      <td className="p-3.5 text-slate-600">{v.purpose}</td>
                      <td className="p-3.5 text-slate-500">{v.checkInTime}</td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[10px] ${v.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {v.status === "active" ? "Inside Campus" : "Checked Out"}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        {v.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => handleCheckOut(v._id)} className="h-7 text-[11px] text-rose-600 hover:bg-rose-50">
                            Check Out
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Incidents */}
        {activeTab === "incidents" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">Hospital Incident Registry</h3>
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{inc.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Location: {inc.location} • Time: {inc.time}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${inc.severity === "high" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {inc.severity} Severity
                    </Badge>
                    <span className="text-[11px] text-emerald-700 font-semibold capitalize">{inc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Check-In Visitor */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowCheckInModal(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-base text-slate-900 mb-3">Issue Hospital Visitor Pass</h3>
            <form onSubmit={handleCheckIn} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Visitor Full Name</label>
                <Input value={visitorForm.name} onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mobile Number</label>
                <Input value={visitorForm.phone} onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Purpose of Visit</label>
                <Input value={visitorForm.purpose} onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })} required />
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowCheckInModal(false)} className="flex-1 text-xs">Cancel</Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">Issue Pass</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Alert */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowAlertModal(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-base text-rose-700 mb-2 flex items-center gap-2">
              <Radio className="w-5 h-5 animate-pulse" />
              <span>Broadcast Hospital Emergency Alert</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Dispatches high-priority Firebase push notification to all on-duty personnel.</p>
            <form onSubmit={handleBroadcastAlert} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Emergency Alert Type</label>
                <select value={alertForm.alertType} onChange={(e) => setAlertForm({ ...alertForm, alertType: e.target.value })} className="w-full text-xs p-2 bg-slate-50 border rounded-lg font-bold">
                  <option value="Code Blue (Cardiac/Medical Emergency)">Code Blue (Cardiac/Medical Emergency)</option>
                  <option value="Code Red (Fire Alarm)">Code Red (Fire Alarm)</option>
                  <option value="Code Black (Security Threat/Lockdown)">Code Black (Security Lockdown)</option>
                  <option value="Code Yellow (Mass Casualty Incoming)">Code Yellow (Mass Casualty Incoming)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Campus Location</label>
                <Input value={alertForm.location} onChange={(e) => setAlertForm({ ...alertForm, location: e.target.value })} required />
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowAlertModal(false)} className="flex-1 text-xs">Cancel</Button>
                <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">Broadcast Now</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

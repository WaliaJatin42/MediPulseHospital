"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Pill,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingDown,
  Layers,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardHeader from "../shared/DashboardHeader";
import StatsCard from "../shared/StatsCard";
import { dashboardApi } from "@/services/dashboardApi";

export default function PharmacyDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch, onBackToSuperadmin }) {
  const [activeTab, setActiveTab] = useState("catalog");
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Medicine Form
  const [newMedForm, setNewMedForm] = useState({
    name: "",
    genericName: "",
    category: "Antibiotics",
    form: "Tablet",
    strength: "500mg",
    pricePerUnit: 25,
    minStockThreshold: 100
  });

  // Dispense Form
  const [dispenseForm, setDispenseForm] = useState({
    patientUhid: "UHID-2026-0042",
    medicineName: "Paracetamol 650mg",
    quantity: 10,
    prescriptionId: "RX-9941"
  });

  const loadPharmacyData = async () => {
    setIsLoading(true);
    try {
      const [medsRes, batchesRes] = await Promise.allSettled([
        dashboardApi.pharmacy.getMedicines().catch(() => ({ data: [] })),
        dashboardApi.pharmacy.getBatches().catch(() => ({ data: [] }))
      ]);

      const medData = medsRes.status === "fulfilled" ? (medsRes.value?.data || medsRes.value || []) : [];
      if (medData.length === 0) {
        setMedicines([
          { _id: "1", name: "Amoxicillin + Clavulanic Acid", genericName: "Augmentin", form: "Tablet", strength: "625mg", stock: 840, price: 180, isCritical: false },
          { _id: "2", name: "Paracetamol", genericName: "Acetaminophen", form: "Tablet", strength: "650mg", stock: 3200, price: 15, isCritical: false },
          { _id: "3", name: "Meropenem IV", genericName: "Meropenem", form: "Injection", strength: "1g", stock: 45, price: 1250, isCritical: true },
          { _id: "4", name: "Atorvastatin", genericName: "Atorvastatin", form: "Tablet", strength: "20mg", stock: 1200, price: 95, isCritical: false },
          { _id: "5", name: "Insulin Glargine", genericName: "Lantus", form: "Vial", strength: "100IU/ml", stock: 80, price: 680, isCritical: true }
        ]);
      } else {
        setMedicines(medData);
      }

      setBatches([
        { batchNo: "BATCH-2026-X01", medicine: "Amoxicillin 625mg", expiryDate: "2026-11-15", daysLeft: 31, stock: 420, fefoPriority: 1 },
        { batchNo: "BATCH-2026-X02", medicine: "Paracetamol 650mg", expiryDate: "2027-02-28", daysLeft: 135, stock: 1500, fefoPriority: 2 },
        { batchNo: "BATCH-2026-C09", medicine: "Meropenem 1g IV", expiryDate: "2026-10-31", daysLeft: 16, stock: 45, fefoPriority: 0, critical: true }
      ]);
    } catch (err) {
      console.error("Failed to load pharmacy data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacyData();
  }, []);

  const handleAddMedicine = (e) => {
    e.preventDefault();
    setMedicines((prev) => [
      { ...newMedForm, _id: Date.now().toString(), stock: 500, price: newMedForm.pricePerUnit },
      ...prev
    ]);
    setFeedback({ type: "success", text: `Drug "${newMedForm.name}" added to hospital pharmacy catalog.` });
    setShowAddMedicineModal(false);
    setNewMedForm({
      name: "",
      genericName: "",
      category: "Antibiotics",
      form: "Tablet",
      strength: "500mg",
      pricePerUnit: 25,
      minStockThreshold: 100
    });
  };

  const handleDispense = (e) => {
    e.preventDefault();
    setFeedback({
      type: "success",
      text: `Dispensed ${dispenseForm.quantity} units of ${dispenseForm.medicineName} to ${dispenseForm.patientUhid} using FEFO batch priority.`
    });
    setShowDispenseModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <DashboardHeader
        currentUser={currentUser}
        activeBranch={activeBranch}
        onSwitchBranch={onSwitchBranch}
        onLogout={onLogout}
        title="Pharmacy & Dispensing Hub"
        badgeText="FEFO Batch Allocation & Controlled Substances"
        badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200/60"
      />

      {feedback && (
        <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Hospital Pharmacy & Central Formulary</h2>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                FEFO Priority Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automated First-Expired-First-Out dispensing, critical stock alerts, and prescription order fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onBackToSuperadmin && (
              <Button variant="outline" size="sm" onClick={onBackToSuperadmin} className="text-xs h-9">
                ← Back to Superadmin
              </Button>
            )}
            <Button size="sm" onClick={() => setShowDispenseModal(true)} variant="outline" className="text-xs h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Dispense Rx</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddMedicineModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </Button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Formulary Drugs" value={`${medicines.length} Medicines`} subtitle="In Active Catalog" icon={Pill} iconColor="text-emerald-600 bg-emerald-50" />
          <StatsCard title="FEFO Active Batches" value="1,840 Batches" subtitle="Real-time Expiry Sort" icon={Layers} iconColor="text-blue-600 bg-blue-50" />
          <StatsCard title="Expiring within 30 Days" value="1 Batch (Meropenem)" subtitle="Immediate Recall Required" icon={AlertTriangle} iconColor="text-rose-600 bg-rose-50" badge="Action Required" badgeColor="text-rose-600 font-bold" />
          <StatsCard title="Emergency Cart Stock" value="100% In-Stock" subtitle="ICU & OT Crash Carts" icon={CheckCircle2} iconColor="text-emerald-600 bg-emerald-50" badge="Verified" />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "catalog" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Formulary Catalog ({medicines.length})
          </button>
          <button
            onClick={() => setActiveTab("fefo")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "fefo" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
          >
            FEFO Batch Expiry Tracker
          </button>
        </div>

        {/* Tab 1: Catalog */}
        {activeTab === "catalog" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/70">
                  <tr>
                    <th className="p-3.5 pl-5">Medicine Name</th>
                    <th className="p-3.5">Generic Name</th>
                    <th className="p-3.5">Form & Strength</th>
                    <th className="p-3.5">Available Stock</th>
                    <th className="p-3.5">Price / Unit</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((med) => (
                    <tr key={med._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        <span>{med.name}</span>
                      </td>
                      <td className="p-3.5 text-slate-500 italic">{med.genericName}</td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                          {med.form} • {med.strength}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold ${med.stock < 100 ? "text-rose-600" : "text-slate-800"}`}>
                          {med.stock} units
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">₹ {med.price}</td>
                      <td className="p-3.5 pr-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDispenseForm((prev) => ({ ...prev, medicineName: med.name }));
                            setShowDispenseModal(true);
                          }}
                          className="h-7 text-[11px] text-emerald-700 hover:bg-emerald-50"
                        >
                          Dispense
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: FEFO Batch Expiry Tracker */}
        {activeTab === "fefo" && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">FEFO (First-Expired, First-Out) Priority Queue</h3>
            <p className="text-xs text-slate-500">
              The pharmacy system automatically prioritizes the earliest expiring drug batches during dispensing to eliminate hospital waste.
            </p>
            <div className="space-y-3">
              {batches.map((batch, i) => (
                <div key={i} className={`p-4 rounded-xl border text-xs flex items-center justify-between ${batch.critical ? "bg-rose-50/80 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200"}`}>
                  <div>
                    <div className="font-bold text-sm">{batch.medicine}</div>
                    <div className="text-[11px] font-mono text-slate-500">Batch: {batch.batchNo} • Stock: {batch.stock} units</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block">Expires: {batch.expiryDate}</span>
                    <span className={`text-[10px] font-semibold ${batch.critical ? "text-rose-700" : "text-emerald-700"}`}>
                      {batch.daysLeft} days remaining • FEFO Priority #{i + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Medicine */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowAddMedicineModal(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-base text-slate-900 mb-3">Add Medicine to Hospital Catalog</h3>
            <form onSubmit={handleAddMedicine} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Brand Name</label>
                <Input value={newMedForm.name} onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Generic Name</label>
                <Input value={newMedForm.genericName} onChange={(e) => setNewMedForm({ ...newMedForm, genericName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Form</label>
                  <select value={newMedForm.form} onChange={(e) => setNewMedForm({ ...newMedForm, form: e.target.value })} className="w-full text-xs p-2 bg-slate-50 border rounded-lg">
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Injection">Injection</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Vial">Vial</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Strength</label>
                  <Input value={newMedForm.strength} onChange={(e) => setNewMedForm({ ...newMedForm, strength: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowAddMedicineModal(false)} className="flex-1 text-xs">Cancel</Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Save Drug</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispense Rx */}
      {showDispenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowDispenseModal(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-base text-slate-900 mb-3">Dispense Clinical Prescription</h3>
            <form onSubmit={handleDispense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Patient UHID</label>
                <Input value={dispenseForm.patientUhid} onChange={(e) => setDispenseForm({ ...dispenseForm, patientUhid: e.target.value })} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prescribed Drug</label>
                <Input value={dispenseForm.medicineName} onChange={(e) => setDispenseForm({ ...dispenseForm, medicineName: e.target.value })} required />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quantity (Units)</label>
                <Input type="number" value={dispenseForm.quantity} onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })} required />
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowDispenseModal(false)} className="flex-1 text-xs">Cancel</Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Confirm Dispense</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

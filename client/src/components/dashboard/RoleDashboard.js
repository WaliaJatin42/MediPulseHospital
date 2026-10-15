"use client";

import React, { useState } from "react";
import SuperadminDashboard from "./SuperadminDashboard";
import HRDashboard from "./departments/HRDashboard";
import PharmacyDashboard from "./departments/PharmacyDashboard";
import SecurityDashboard from "./departments/SecurityDashboard";
import FinanceDashboard from "./departments/FinanceDashboard";
import SupportDashboard from "./departments/SupportDashboard";
import LegalDashboard from "./departments/LegalDashboard";
import TechnicalDashboard from "./departments/TechnicalDashboard";
import ClinicalDashboard from "./departments/ClinicalDashboard";
import { Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RoleDashboard({ currentUser, onLogout, activeBranch, onSwitchBranch }) {
  const isSuperadmin = currentUser?.role === "superadmin";
  const [previewRole, setPreviewRole] = useState(currentUser?.role || "superadmin");

  const effectiveRole = previewRole || currentUser?.role || "superadmin";

  const renderDashboard = () => {
    const commonProps = {
      currentUser,
      onLogout,
      activeBranch,
      onSwitchBranch,
      onBackToSuperadmin: isSuperadmin && previewRole !== "superadmin" ? () => setPreviewRole("superadmin") : null
    };

    switch (effectiveRole) {
      case "hr":
        return <HRDashboard {...commonProps} />;
      case "pharmacy":
        return <PharmacyDashboard {...commonProps} />;
      case "security":
        return <SecurityDashboard {...commonProps} />;
      case "finance":
        return <FinanceDashboard {...commonProps} />;
      case "support":
        return <SupportDashboard {...commonProps} />;
      case "legal":
        return <LegalDashboard {...commonProps} />;
      case "technical":
        return <TechnicalDashboard {...commonProps} />;
      case "doctor":
      case "nurse":
      case "clinical":
        return <ClinicalDashboard {...commonProps} />;
      case "superadmin":
      default:
        return (
          <SuperadminDashboard
            {...commonProps}
            onSwitchPersona={(role) => setPreviewRole(role)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      {/* Superadmin Persona Preview Banner */}
      {isSuperadmin && previewRole !== "superadmin" && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-4 py-2 text-xs flex items-center justify-between sticky top-0 z-50 border-b border-indigo-800 shadow-md">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>
                <strong>Superadmin Perspective Active:</strong> Simulating <strong>{effectiveRole.toUpperCase()} Department View</strong>
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setPreviewRole("superadmin")}
              className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Superadmin Center</span>
            </Button>
          </div>
        </div>
      )}

      {renderDashboard()}
    </div>
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, LogOut, ExternalLink, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardHeader({
  currentUser,
  activeBranch,
  onSwitchBranch,
  onLogout,
  title = "Command Center",
  badgeText = "Hospital Governance",
  badgeColor = "bg-blue-50 text-blue-700 border-blue-200/60"
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Department Title */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0"
          >
            <Activity className="w-5 h-5" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">MediPulse</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                {title}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {badgeText}
            </p>
          </div>
        </div>

        {/* Branch Context, Swagger, & User Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Two-Branch Context Switcher */}
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

          {/* Live API Health */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Port 5000</span>
          </div>

          {/* Swagger Link */}
          <a
            href="http://localhost:5000/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Swagger Spec</span>
          </a>

          {/* Active User Avatar & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {currentUser?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser?.name || "User"}
              </span>
              <span className="text-[10px] text-slate-500 capitalize leading-tight">
                {currentUser?.department || currentUser?.role || "Staff"}
              </span>
            </div>

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
  );
}

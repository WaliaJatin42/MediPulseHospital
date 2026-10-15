"use client";

import React from "react";
import { motion } from "framer-motion";

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600 bg-blue-50",
  badge,
  badgeColor = "text-emerald-600 font-semibold",
  onClick
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs transition-shadow ${
        onClick ? "cursor-pointer hover:border-blue-300" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>

      {(subtitle || badge) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
          {badge && <span className={badgeColor}>{badge}</span>}
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </motion.div>
  );
}

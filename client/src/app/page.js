"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Activity,
  Menu,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  KeyRound,
  LogOut,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  Globe,
  RefreshCw,
  X,
  ArrowLeft,
  QrCode,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  authApi,
  AUTH_ENDPOINTS_CATALOG,
  getStoredUser,
  getToken,
  setToken,
  setStoredUser
} from "@/services/authApi";

export default function LoginPage() {
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'error' | 'success' | 'info', text: '' }

  // Authenticated User State
  const [currentUser, setCurrentUser] = useState(null);
  const [activeBranch, setActiveBranch] = useState("MPH-CEN");

  // Modals & Panels
  const [showApiDrawer, setShowApiDrawer] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showMfaSetupModal, setShowMfaSetupModal] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [setupTotpCode, setSetupTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [showMfaHelp, setShowMfaHelp] = useState(false);
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  // API Drawer Active Filter
  const [selectedApiCategory, setSelectedApiCategory] = useState("All");
  const [copiedId, setCopiedId] = useState(null);

  // Check existing session or Google OAuth redirect on load
  useEffect(() => {
    const user = getStoredUser();
    const token = getToken();
    if (user && token) {
      setCurrentUser(user);
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlResetToken = params.get("resetToken") || params.get("token");

      if (urlResetToken) {
        setResetToken(urlResetToken);
        setShowResetModal(true);
        setStatusMessage({
          type: "info",
          text: "Password reset link recognized from email. Please enter your new password below."
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("status") === "success" || params.get("oauth") === "success") {
        authApi.getMe().then((res) => {
          const u = res.user || res.data;
          if (u) {
            setCurrentUser(u);
            setStoredUser(u);
            setStatusMessage({ type: "success", text: `Welcome, ${u.name || u.email}! Google sign-in successful.` });
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }).catch(() => {});
      } else if (params.get("error") === "google_failed") {
        setStatusMessage({ type: "error", text: "Google authentication was cancelled or failed. Please retry." });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);


  // Login Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMessage({ type: "error", text: "Please enter both email and password." });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      // Check if it's a patient portal login or staff login
      let res;
      if (email.includes("patient") || email === "eleanor.gray@example.com") {
        res = await authApi.patientLogin(email, password);
      } else {
        res = await authApi.login(email, password);
      }

      if (res.mfaRequired) {
        // MFA challenge required by backend
        const token = res.challengeToken || res.mfaToken;
        setMfaToken(token);
        setIsMfaStep(true);
        setTotpCode("");
        setStatusMessage({
          type: "info",
          text: res.message || "MFA is enabled on this account. Enter 123456 or your authenticator code."
        });
      } else {
        setCurrentUser(res.user || res.patient || { name: email.split("@")[0], email });
        setStatusMessage({
          type: "success",
          text: `Welcome back, ${res.user?.name || email}! Authentication successful.`
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Invalid credentials or account locked. Please check and retry."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Solve MFA Challenge (TOTP Code or Recovery Code)
  const executeMfaVerification = async (codeToVerify) => {
    const code = (codeToVerify || totpCode).trim();
    if (!code || code.length < 6) {
      setStatusMessage({ type: "error", text: "Please enter a valid 6-digit authenticator code or recovery code." });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await authApi.solveMfaChallenge(mfaToken, code);
      setIsMfaStep(false);
      setTotpCode("");
      setCurrentUser(res.user);
      setStatusMessage({
        type: "success",
        text: res.message || `Welcome back, ${res.user?.name || email}! Two-factor authentication verified.`
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Invalid or expired MFA code. Please check and try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    if (e) e.preventDefault();
    await executeMfaVerification();
  };

  const handleCancelMfa = () => {
    setIsMfaStep(false);
    setMfaToken("");
    setTotpCode("");
    setStatusMessage(null);
  };

  // Open MFA Setup Modal with Live QR Code
  const handleOpenMfaSetup = async () => {
    setIsLoading(true);
    try {
      const res = await authApi.setupMfa();
      setMfaSetupData(res);
      setRecoveryCodes(null);
      setSetupTotpCode("");
      setShowMfaSetupModal(true);
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to initiate MFA setup." });
    } finally {
      setIsLoading(false);
    }
  };

  // Verify and complete MFA Setup
  const handleVerifyMfaSetup = async (e) => {
    e.preventDefault();
    if (!setupTotpCode || setupTotpCode.length < 6) return;
    setIsLoading(true);
    try {
      const res = await authApi.verifyMfa(setupTotpCode);
      setRecoveryCodes(res.recoveryCodes || res.data?.recoveryCodes || []);
      setStatusMessage({ type: "success", text: "Two-Factor Authentication successfully enabled!" });
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Invalid verification code. Please check your authenticator." });
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Request
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setShowForgotModal(false);
      setStatusMessage({
        type: "success",
        text: res.message || `Password reset instructions dispatched to ${forgotEmail}.`
      });
      // In dev fallback mode (if email credentials aren't set in .env), open reset modal directly
      if (!res.emailSent && res.resetToken) {
        setResetToken(res.resetToken);
        setShowResetModal(true);
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to request password reset." });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password Execution
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return;

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(resetToken, newPassword);
      setShowResetModal(false);
      setStatusMessage({
        type: "success",
        text: res.message || "Password updated successfully. You can now log in with your new password."
      });
      setPassword(newPassword);
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Password reset failed. Invalid or expired token." });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setCurrentUser(null);
      setStatusMessage({ type: "info", text: "You have been signed out." });
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Branch
  const handleSwitchBranch = async (branchCode) => {
    setIsLoading(true);
    try {
      const branchId = branchCode === "MPH-CEN" ? "6acfe10f404812432abadc09" : "6acfe10f404812432abadc10";
      await authApi.switchBranch(branchId);
      setActiveBranch(branchCode);
      setStatusMessage({
        type: "success",
        text: `Active hospital branch context switched to ${branchCode} (${branchCode === "MPH-CEN" ? "Central Campus" : "South Campus"})`
      });
    } catch (err) {
      setActiveBranch(branchCode);
      setStatusMessage({
        type: "info",
        text: `Simulated branch context switch to ${branchCode}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPayload = (id, payload) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = ["All", "Session Lifecycle", "Password Management", "Multi-Factor Auth", "OAuth 2.0 & SSO", "Branch Context", "Patient Portal"];

  const filteredEndpoints = selectedApiCategory === "All"
    ? AUTH_ENDPOINTS_CATALOG
    : AUTH_ENDPOINTS_CATALOG.filter(e => e.category.toLowerCase().includes(selectedApiCategory.toLowerCase()) || selectedApiCategory.toLowerCase().includes(e.category.toLowerCase()));

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-white text-slate-800 relative selection:bg-blue-100 selection:text-blue-900">
      {/* Background ambient radial glow with subtle breathing animation */}
      <motion.div
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-0 right-0 h-80 bg-[radial-gradient(circle_at_15%_10%,rgba(219,234,254,0.45)_0%,rgba(255,255,255,0)_70%)] pointer-events-none z-0"
      />

      {/* TOP NAVIGATION BAR - LOGO ONLY */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-14 py-3.5 flex items-center justify-between shrink-0"
      >
        {/* Brand Logo Only */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <motion.div
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 350, damping: 15 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20"
          >
            <Activity className="w-5 h-5" />
          </motion.div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                MediPulse
              </span>
              <span className="text-xl font-light text-slate-500">
                Healthcare Portal
              </span>
            </div>
          </div>
        </motion.div>
      </motion.header>

      {/* MAIN TWO-COLUMN CONTAINER (ZERO SCROLL FIT) */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 md:px-14 py-1 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-14 items-center overflow-hidden min-h-0">
        {/* LEFT COLUMN: LOGIN INTERFACE */}
        <section className="flex flex-col max-w-md w-full mx-auto lg:mx-0 justify-center">
          {/* Main Headline & Subtitle with smooth AnimatePresence transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isMfaStep ? "mfa" : currentUser ? "auth" : "login"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <h1 className="text-2xl md:text-3xl lg:text-[34px] font-bold tracking-tight text-slate-900 leading-tight mb-2">
                {isMfaStep
                  ? "Two-Factor Authentication"
                  : currentUser
                  ? "Welcome to MediPulse"
                  : "Build competence, career and network in healthcare."}
              </h1>

              <p className="text-xs md:text-[13px] text-slate-500 mb-4 leading-relaxed line-clamp-2">
                {isMfaStep
                  ? "MFA security is active. Please enter your 6-digit authenticator code or emergency recovery code."
                  : currentUser
                  ? "Authenticated clinical session active. Access clinical EMR charts, shift rosters, and patient records."
                  : "Secure access for healthcare professionals, physicians, nurses, and patients. Seamless access to EMR records, 9-hour shift rosters, and clinical workflows."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Status / Alert Banner with AnimatePresence */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                key="alert-banner"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs font-medium mb-3.5 transition-all ${
                  statusMessage.type === "error"
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : statusMessage.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-blue-50 border border-blue-200 text-blue-800"
                }`}
              >
                {statusMessage.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{statusMessage.text}</div>
                <button
                  onClick={() => setStatusMessage(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN DYNAMIC CONTENT: TRANSITION BETWEEN PROFILE, MFA, AND LOGIN FORM */}
          <AnimatePresence mode="wait">
            {currentUser ? (
              <motion.div
                key="authenticated-view"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-slate-200 shadow-lg shadow-slate-100/80 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-base font-bold">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">
                      {currentUser.name || "Authenticated User"}
                    </h3>
                    <p className="text-[11px] text-blue-100 opacity-90">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[11px]">
                  {currentUser.role || "Active Session"}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                      Department
                    </span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {currentUser.department || "Clinical Unit"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                      Active Campus
                    </span>
                    <span className="font-semibold text-blue-600">
                      {activeBranch === "MPH-CEN" ? "Central (MPH-CEN)" : "South (MPH-SOU)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                      Clearance
                    </span>
                    <span className="font-semibold text-emerald-600">
                      Verified & Active
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                      JWT Cookie
                    </span>
                    <span className="font-mono text-slate-700">httpOnly: Yes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={() => handleSwitchBranch(activeBranch === "MPH-CEN" ? "MPH-SOU" : "MPH-CEN")}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5 border-slate-300 h-9"
                    disabled={isLoading}
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Switch to {activeBranch === "MPH-CEN" ? "South" : "Central"}</span>
                  </Button>

                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    size="sm"
                    className="text-xs gap-1.5 h-9"
                    disabled={isLoading}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </Button>
                </div>

                <Button
                  onClick={handleOpenMfaSetup}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 h-8"
                  disabled={isLoading}
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Set Up / View Authenticator QR Code</span>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          ) : isMfaStep ? (
            /* STEP 2: IN-PLACE TWO-FACTOR AUTHENTICATION CHALLENGE FORM */
            <motion.div
              key="mfa-challenge-view"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <form onSubmit={handleMfaSubmit} className="flex flex-col space-y-3.5">
                {/* Back to Login & Step Badge */}
                <div className="flex items-center justify-between">
                  <motion.button
                    type="button"
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCancelMfa}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to login</span>
                  </motion.button>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] gap-1 py-0.5">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span>2-Step Verification</span>
                  </Badge>
                </div>

                {/* Account Identifier Chip */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {email ? email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-medium">Signing in as</p>
                    <p className="text-xs font-semibold text-slate-800 truncate">{email}</p>
                  </div>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Password verified
                  </span>
                </div>

                {/* MFA Code Input */}
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="totpCode">
                      {useRecoveryCode ? "Emergency Recovery Code" : "Authenticator Code (TOTP)"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMfaHelp(!showMfaHelp)}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Where do I get my code?</span>
                    </button>
                  </div>

                  {showMfaHelp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/80 text-[11px] text-slate-600 space-y-1"
                    >
                      <p className="font-semibold text-blue-900">How to get your authenticator code:</p>
                      <p>1. Open <strong>Google Authenticator</strong> or Microsoft Authenticator on your phone.</p>
                      <p>2. Look for the 6-digit code for <strong>MediPulse: {email}</strong>.</p>
                      <p className="text-emerald-700 font-medium pt-0.5">
                        ⚡ For testing, enter dev code: <span className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-bold">123456</span>
                      </p>
                    </motion.div>
                  )}
                  <div className="relative">
                    <Input
                      id="totpCode"
                      type="text"
                      maxLength={useRecoveryCode ? 12 : 6}
                      placeholder={useRecoveryCode ? "ABC12345" : "123456"}
                      value={totpCode}
                      onChange={(e) => {
                        const val = useRecoveryCode
                          ? e.target.value.trim().toUpperCase()
                          : e.target.value.replace(/\D/g, "").slice(0, 6);
                        setTotpCode(val);
                        if (!useRecoveryCode && val.length === 6 && mfaToken && !isLoading) {
                          executeMfaVerification(val);
                        }
                      }}
                      autoFocus
                      autoComplete="one-time-code"
                      className="text-center font-mono text-xl tracking-[0.35em] font-bold h-11 rounded-xl border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <motion.div whileHover={!isLoading ? { scale: 1.03 } : {}} whileTap={!isLoading ? { scale: 0.97 } : {}}>
                    <Button
                      type="submit"
                      variant="pill"
                      size="pill"
                      disabled={isLoading || (useRecoveryCode ? totpCode.length < 6 : totpCode.length !== 6)}
                      className="w-auto min-w-[140px] h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 rounded-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <span>Verify & Sign In</span>
                      )}
                    </Button>
                  </motion.div>

                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setTotpCode("");
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {useRecoveryCode ? "Use 6-digit TOTP code" : "Use recovery code"}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                  <span>Challenge active for 5 minutes</span>
                  <button
                    type="button"
                    onClick={handleCancelMfa}
                    className="text-slate-500 hover:text-slate-700 underline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* STEP 1: LOGIN FORM MATCHING THE USER REFERENCE SCREENSHOT */
            <motion.div
              key="login-form-view"
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 25 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <form onSubmit={handleLogin} className="flex flex-col space-y-3.5">
                {/* Email Input with Underline Styling & Active Focus Line */}
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      variant="underline"
                      placeholder="your.email@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      required
                      autoComplete="email"
                      className="py-1.5 text-sm"
                    />
                    <motion.div
                      initial={false}
                      animate={{ scaleX: focusedField === "email" ? 1 : 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 origin-left pointer-events-none"
                    />
                  </div>
                </div>

                {/* Password Input with Underline Styling and Eye Toggle */}
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="password">
                      Password
                    </label>
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline transition-colors"
                    >
                      Forgot password?
                    </motion.button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      variant="underline"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required
                      autoComplete="current-password"
                      className="py-1.5 text-sm"
                    />
                    <motion.div
                      initial={false}
                      animate={{ scaleX: focusedField === "password" ? 1 : 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 origin-left pointer-events-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-2 text-slate-400 hover:text-blue-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button (Vibrant Blue Pill with spring micro-interaction) */}
                <div className="pt-1">
                  <motion.div whileHover={!isLoading ? { scale: 1.04 } : {}} whileTap={!isLoading ? { scale: 0.96 } : {}} className="inline-block">
                    <Button
                      type="submit"
                      variant="pill"
                      size="pill"
                      disabled={isLoading}
                      className="w-auto min-w-[130px] h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 rounded-full cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Logging in...</span>
                        </div>
                      ) : (
                        <span>Login</span>
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Signup Link */}
                <div className="text-xs text-slate-500 pt-0.5">
                  <span>Don't have an account? </span>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStatusMessage({ type: "info", text: "New staff accounts are registered by HR Director or Superadmin under user management." })}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Sign up
                  </motion.button>
                </div>

                {/* Google OAuth Single Sign-On Button */}
                <div className="relative pt-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                      Or continue with
                    </span>
                  </div>
                </div>

                <motion.a
                  href={authApi.getGoogleAuthUrl()}
                  whileHover={{ scale: 1.015, borderColor: "#94a3b8", backgroundColor: "#f8fafc", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.15 }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-slate-300 hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </motion.a>
              </form>
            </motion.div>
          )}
          </AnimatePresence>
        </section>

        {/* RIGHT COLUMN: CLEAN BORDERLESS HERO ILLUSTRATION WITH GENTLE FLOATING MOTION */}
        <section className="flex items-center justify-center w-full overflow-hidden">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full max-w-lg xl:max-w-xl 2xl:max-w-2xl flex items-center justify-center p-2"
          >
            <div className="relative w-full aspect-[4/3] max-h-[64vh] flex items-center justify-center">
              <Image
                src="/doctor-staff.png"
                alt="MediPulse Hospital Doctors and Healthcare Clinical Team"
                fill
                priority
                className="object-contain select-none pointer-events-none drop-shadow-sm"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
              />
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER BAR (COMPACT) */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-14 py-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span>© 2026 MediPulse Hospital Management Systems. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="http://localhost:5000/api-docs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            Swagger OpenAPI Spec
          </a>
          <button onClick={() => setShowApiDrawer(true)} className="hover:text-blue-600 transition-colors font-medium">
            Frontend Auth Endpoints ({AUTH_ENDPOINTS_CATALOG.length})
          </button>
        </div>
      </footer>

      {/* MODAL 0: 2FA SETUP & QR CODE VIEWER */}
      {showMfaSetupModal && mfaSetupData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowMfaSetupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Set Up Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500">Scan with Google Authenticator or enter key manually</p>
              </div>
            </div>

            {!recoveryCodes ? (
              <div className="space-y-4">
                {/* Visual QR Code Generated from otpAuthUri */}
                <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaSetupData.otpAuthUri)}`}
                    alt="MFA QR Code"
                    className="w-44 h-44 rounded-lg bg-white p-2 shadow-sm border border-slate-100"
                  />
                  <p className="text-[11px] text-slate-500 mt-2">Scan with camera in Google Authenticator</p>
                </div>

                {/* Manual Secret Key */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Manual Setup Key</span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-800 tracking-wider">
                    <span className="truncate mr-2">{mfaSetupData.secret}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(mfaSetupData.secret);
                        setStatusMessage({ type: "info", text: "Secret key copied to clipboard!" });
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 font-sans font-normal shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Verify code to confirm setup */}
                <form onSubmit={handleVerifyMfaSetup} className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Enter 6-digit code from app to confirm
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={setupTotpCode}
                      onChange={(e) => setSetupTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center font-mono text-lg font-bold tracking-widest h-10"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || setupTotpCode.length !== 6}
                      className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                      {isLoading ? "Verifying..." : "Confirm & Enable"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Recovery codes generated upon successful verification */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Two-Factor Authentication is active! Save your emergency backup recovery codes below.</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {recoveryCodes.map((c, i) => (
                    <div key={i} className="font-mono text-xs font-bold text-slate-700 text-center bg-white py-1 px-2 rounded border border-slate-200">
                      {c.code || c}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => setShowMfaSetupModal(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}



      {/* MODAL 2: FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Reset Your Password
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter your registered hospital email address to receive password reset instructions.
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Registered Email Address
                </label>
                <Input
                  type="email"
                  placeholder="doctor.smith@hospital.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !forgotEmail}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD MODAL (Token + New Password) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Apply New Password
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Your reset token is verified. Set a new password meeting hospital security requirements.
            </p>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reset Token
                </label>
                <Input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="NewPassword123!"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !newPassword}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? "Saving..." : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: FRONTEND AUTHENTICATION APIS DIRECTORY */}
      {showApiDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Frontend Authentication APIs
                  </h2>
                  <Badge variant="info" className="text-xs">
                    {AUTH_ENDPOINTS_CATALOG.length} Endpoints
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Full client API catalog connecting the Next.js frontend to MediPulse Express Backend.
                </p>
              </div>
              <button
                onClick={() => setShowApiDrawer(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="px-6 py-3 border-b border-slate-100 flex gap-1.5 overflow-x-auto bg-white">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedApiCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                    selectedApiCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Endpoints List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredEndpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                          ep.method === "POST"
                            ? "bg-emerald-100 text-emerald-800"
                            : ep.method === "GET"
                            ? "bg-blue-100 text-blue-800"
                            : ep.method === "DELETE"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {ep.path}
                      </span>
                    </div>

                    <Badge variant={ep.authRequired ? "outline" : "secondary"} className="text-[10px]">
                      {ep.authRequired ? "Bearer Token Required" : "Public"}
                    </Badge>
                  </div>

                  <p className="font-semibold text-slate-800 mb-1">{ep.summary}</p>
                  <p className="text-slate-500 mb-3">{ep.description}</p>

                  {ep.payload && (
                    <div className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] relative">
                      <div className="flex items-center justify-between text-slate-400 mb-1.5 text-[10px] uppercase font-bold tracking-wider">
                        <span>Payload Sample</span>
                        <button
                          onClick={() => copyPayload(ep.id, ep.payload)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {copiedId === ep.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === ep.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <pre className="overflow-x-auto text-emerald-300">
                        {JSON.stringify(ep.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Backend Server: <code className="font-bold text-slate-700">http://localhost:5000</code>
              </span>
              <a
                href="http://localhost:5000/api-docs/#/Authentication"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Interactive Swagger UI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

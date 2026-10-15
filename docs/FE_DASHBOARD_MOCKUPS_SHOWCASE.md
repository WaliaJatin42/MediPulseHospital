# MediPulse Hospital Management System
## Master UI Mockup Showcase: Complete Functional Screen Designs

This document presents the complete set of **13 high-fidelity visual UI mockup screens** covering every operational functionality and user role across the MediPulse Hospital Management System, based on the **[FIGMA_ADMIN_DASHBOARD_SPECIFICATION.md](file:///d:/user_management_system/docs/FIGMA_ADMIN_DASHBOARD_SPECIFICATION.md)**.

All images are saved locally in the repository at [docs/mockups/](file:///d:/user_management_system/docs/mockups/).

---

### Table of Contents
1. [Authentication, Branch Selection & TOTP MFA](#1-authentication-branch-selection--totp-mfa)
2. [Patient Registration, Duplicate Prevention & Thermal Wristband](#2-patient-registration-duplicate-prevention--thermal-wristband)
3. [OPD Check-In & Public Waiting Room Digital Signage](#3-opd-check-in--public-waiting-room-digital-signage)
4. [Superadmin Multi-Branch Executive Governance Hub](#4-superadmin-multi-branch-executive-governance-hub)
5. [Doctor Clinical Consultation, EMR & CPOE Workspace](#5-doctor-clinical-consultation-emr--cpoe-workspace)
6. [Inpatient Ward Nursing Station & Bed Census Matrix](#6-inpatient-ward-nursing-station--bed-census-matrix)
7. [Diagnostic Laboratory: Accessioning & Critical Panic Value Alerts](#7-diagnostic-laboratory-accessioning--critical-panic-value-alerts)
8. [Radiology Modality Worklist & Diagnostic DICOM PACS Viewer](#8-radiology-modality-worklist--diagnostic-dicom-pacs-viewer)
9. [Pharmacy Dispensing & Smart FEFO Batch Picker](#9-pharmacy-dispensing--smart-fefo-batch-picker)
10. [Inpatient Real-Time Billing, Cashier & TPA Insurance Workspace](#10-inpatient-real-time-billing-cashier--tpa-insurance-workspace)
11. [Emergency Trauma Triage Board & Ambulance GPS Fleet](#11-emergency-trauma-triage-board--ambulance-gps-fleet)
12. [HR 9-Hour Biometric Attendance & Shift Roster Scheduler](#12-hr-9-hour-biometric-attendance--shift-roster-scheduler)
13. [Automated Monthly Payroll Run Wizard & Payslip Ledger](#13-automated-monthly-payroll-run-wizard--payslip-ledger)

---

### 1. Authentication, Branch Selection & TOTP MFA
![Authentication & TOTP MFA](file:///d:/user_management_system/docs/mockups/login_mfa_screen_1792042760220.jpg)

- **File:** `docs/mockups/login_mfa_screen_1792042760220.jpg`
- **Key Functionalities:**
  - Hospital email and password with show/hide toggle.
  - Active **Branch Selection Dropdown** (`Central Campus [MPH-CEN]` vs `South Campus [MPH-SOU]`).
  - Google OAuth single sign-on integration.
  - **RFC 6238 TOTP Multi-Factor Authentication** 6-digit verification code input with live countdown timer (`Code expires in 28s`).
  - Progressive 5-attempt brute-force lockout notice and AES-256 encryption seal.

---

### 2. Patient Registration, Duplicate Prevention & Thermal Wristband
![Patient Registration & Wristband](file:///d:/user_management_system/docs/mockups/patient_registration_intake_1792042786357.jpg)

- **File:** `docs/mockups/patient_registration_intake_1792042786357.jpg`
- **Key Functionalities:**
  - Real-time **Potential Duplicate Match Warning Banner** (`Matching Mobile +91 98765 43210 -> Review Existing Profile`).
  - Demographic fields: Full Name, Gender, Date of Birth with auto-calculated Age (`45 Yrs`), Contact, Address, Primary Language.
  - Payer category & TPA Insurance details (Star Health, Policy ID, Pre-Auth Reference).
  - Instant **Thermal Wristband Print Preview** with Code128 barcode, generated sequential UHID (`MPH-CEN-2026-000412`), Blood Group `O+`, and bold crimson **Allergy Alert Pill** (`Penicillin`).

---

### 3. OPD Check-In & Public Waiting Room Digital Signage
![OPD Check-In & Display](file:///d:/user_management_system/docs/mockups/opd_queue_display_1792042812311.jpg)

- **File:** `docs/mockups/opd_queue_display_1792042812311.jpg`
- **Key Functionalities:**
  - **Receptionist Console (Left):** Quick patient lookup, doctor specialty selector (`Dr. Sharma - Cardiology, Room 104`), consultation fee billing status (`$50 Paid`), and `[Check-in & Issue Token #A-24]` button.
  - **Public Waiting Room TV Signage (Right):** Strict HIPAA/zero-PHI public feed showing high-contrast glowing numbers:
    - `NOW SERVING:` Token #A-22 (Room 101), Token #B-14 (Room 102).
    - `UPCOMING:` Token #A-24 (Room 104 - Estimated 10:45 AM).
    - Real-time `Average Wait Time: 14 Mins`.

---

### 4. Superadmin Multi-Branch Executive Governance Hub
![Superadmin Executive Dashboard](file:///d:/user_management_system/docs/mockups/superadmin_dashboard_mockup_1792042421459.jpg)

- **File:** `docs/mockups/superadmin_dashboard_mockup_1792042421459.jpg`
- **Key Functionalities:**
  - Consolidated multi-branch top app bar with branch switcher, `Ctrl+K` Omni-Search, red **Break-Glass** emergency override button, and Superadmin role badge.
  - Collapsible Dark Slate navigation sidebar with badge alerts.
  - Top KPI Metric Cards: Hospital Bed Occupancy (`84.6%`), Active OPD Patients (`1,248`), Gross Revenue MTD (`$1.42M`), and On-Duty Staff (`312`).
  - Branch Comparison Multi-Bar Chart, Bed Occupancy Donut Chart, and Pending Approvals Table.

---

### 5. Doctor Clinical Consultation, EMR & CPOE Workspace
![Doctor Clinical EMR Workspace](file:///d:/user_management_system/docs/mockups/doctor_emr_mockup_1792042447513.jpg)

- **File:** `docs/mockups/doctor_emr_mockup_1792042447513.jpg`
- **Key Functionalities:**
  - **Sticky Patient Banner:** Photo, Name, UHID, 45Y/Male, Blood Group O+, bold crimson **Allergy Pill** (`Penicillin, Sulfa`), and Bed (`ICU Bed 04`).
  - **3-Column Clinical Split View:**
    - *Column 1:* Chronic conditions (Hypertension, Diabetes) and longitudinal timeline.
    - *Column 2:* Structured SOAP Note Editor, objective vitals banner with auto-calculated BMI (`BP 120/80`, `SpO2 98%`, `BMI 24.2`), Assessment with ICD-10 diagnosis (`K35.80 Acute Appendicitis`), Treatment Plan, and green **Digitally Signed & Locked (SHA-256 Hash)** seal.
    - *Column 3:* CPOE Orders & E-Prescriptions with orange **Clinical Decision Support (CDS) Allergy Verification Alert**.

---

### 6. Inpatient Ward Nursing Station & Bed Census Matrix
![Inpatient Ward Bed Census](file:///d:/user_management_system/docs/mockups/nurse_ward_matrix_1792042471207.jpg)

- **File:** `docs/mockups/nurse_ward_matrix_1792042471207.jpg`
- **Key Functionalities:**
  - Top Ward Census metrics: *Ward Census 28/32 (87.5% Occupancy)*, *Meds Due in Next 2h (42 Doses)*, *Pending Orders (8)*, *Discharges (3)*.
  - Interactive Visual Bed Matrix organized by Room (301 to 308) with color-coded status tiles:
    - **Blue:** Occupied with patient & doctor info.
    - **Green:** Available with checkmark.
    - **Purple:** Cleaning with housekeeping broom badge.
    - **Pink:** Maintenance with wrench icon.
  - **Bed 304B Care Drawer (Right):** Medication Administration Record (MAR) timeline with administered checkmarks and amber **Dual-Witness Verification Required** badge for controlled narcotics.

---

### 7. Diagnostic Laboratory: Accessioning & Critical Panic Value Alerts
![Laboratory Panic Value Result Entry](file:///d:/user_management_system/docs/mockups/lab_results_panic_alert_1792042910838.jpg)

- **File:** `docs/mockups/lab_results_panic_alert_1792042910838.jpg`
- **Key Functionalities:**
  - Barcode Specimen Accessioning search bar (`Purple Top EDTA | Barcode: LAB-2026-9901 | Patient: Rajesh Kumar`).
  - Parameterized results entry table with normal, low, and high flags.
  - **Flashing Crimson Panic Value Highlight:** `Serum Potassium: 6.8 mmol/L [Reference: 3.5-5.0]` with bold alert badge **`!! CRITICAL PANIC VALUE !!`**.
  - Emergency Alert Banner: `AUTOMATED CRITICAL ALERT: Out-of-Range Panic Value Detected - Immediate Push Notification Dispatched to Dr. Sarah Jenkins`.
  - Pathologist Digital Signature sign-off button and `Release to Patient Portal` toggle.

---

### 8. Radiology Modality Worklist & Diagnostic DICOM PACS Viewer
![Radiology PACS Viewer](file:///d:/user_management_system/docs/mockups/radiology_pacs_viewer_1792042940508.jpg)

- **File:** `docs/mockups/radiology_pacs_viewer_1792042940508.jpg`
- **Key Functionalities:**
  - **Integrated DICOM PACS Viewer (Left):** High-tech dark viewport displaying axial abdominal CT scan slice (`Slice 42 of 120`), floating toolbars (window/level presets, pan, zoom, measurement caliper ruler showing `11 mm`).
  - **Structured Radiology Report Editor (Right):** Patient study metadata (CT Abdomen with IV Contrast, Radiation Dose: `8.4 mGy`), structured Technique, Findings, Impression (`Acute uncomplicated appendicitis`), urgent finding callout checkbox, and green `[Sign & Seal Radiology Report]` action button.

---

### 9. Pharmacy Dispensing & Smart FEFO Batch Picker
![Pharmacy Dispensing FEFO](file:///d:/user_management_system/docs/mockups/pharmacy_dispensing_fefo_1792042965344.jpg)

- **File:** `docs/mockups/pharmacy_dispensing_fefo_1792042965344.jpg`
- **Key Functionalities:**
  - Prescription Queue Header: IPD Ward 3, Patient Rajesh Kumar, Prescribing Consultant Dr. Sarah Jenkins.
  - **Smart FEFO Batch Selection Table:**
    - Amoxicillin 500mg: Smart FEFO Batch `BATCH-AMX-02 (Expiry: 12/2026 - Earliest Expiring Valid Batch)` locked with a green padlock.
    - Paracetamol 650mg: Batch `BATCH-PCM-09 (Expiry: 08/2027)`.
    - Fentanyl 50mcg/ml Injection (Controlled Drug): Highlighted with amber regulatory badge **`Narcotics Vault Register: Dual Witness Signatures Required`**.
  - Action buttons: `[Print Thermal Dosage Labels]` and `[Verify & Dispense Medications (Auto-Deduct Inventory Ledger)]`.

---

### 10. Inpatient Real-Time Billing, Cashier & TPA Insurance Workspace
![Inpatient Billing & TPA Workspace](file:///d:/user_management_system/docs/mockups/billing_tpa_workspace_1792042521268.jpg)

- **File:** `docs/mockups/billing_tpa_workspace_1792042521268.jpg`
- **Key Functionalities:**
  - Top Revenue Command Header: Today's Collections (`$68,400.00`), Unbilled Interim Charges (`$342,100.00`), Active TPA Claims (`48`).
  - **Left Panel (Inpatient Real-Time Ledger):** Itemized charges accordion (Room Rent `$1,200`, OT charges `$2,400`, Labs `$450`, Pharmacy `$680`), Total Charges: `$4,730`, Advance Paid: `$2,000`, **Net Balance Due: `$2,730`**.
  - **Right Panel (Tiered Discount & TPA Cashless Settlement):** Role-tiered discount selector (**Billing Clerk: 5%**, **Billing Admin: 15%**, **Superadmin: >15% Approval Required**), cashless co-pay split calculator, and cashier payment action buttons.

---

### 11. Emergency Trauma Triage Board & Ambulance GPS Fleet
![Emergency Trauma Triage](file:///d:/user_management_system/docs/mockups/emergency_triage_board_1792042496506.jpg)

- **File:** `docs/mockups/emergency_triage_board_1792042496506.jpg`
- **Key Functionalities:**
  - High-visibility top crimson emergency banner: `[CODE BLUE ACTIVATED] Ward 3 - Bed 304B | Cardiac Arrest Resuscitation Team Dispatched`.
  - Emergency fast action bar: `+ 10s Fast Trauma Intake (John Doe)` button for immediate intake of unconscious patients without payment delays, 18 Active ER Beds, 8 Critical O- Blood Units, 4 Ambulances Available.
  - **5-Column ESI Triage Kanban Board:** ESI-1 Resuscitation (Red) with flashing countdown timer (`00:04:12`), ESI-2 Emergent (Orange), ESI-3 Urgent (Yellow), ESI-4 Less Urgent (Sky Blue), ESI-5 Non-Urgent (Grey).
  - **Ambulance GPS Fleet:** Live map panel tracking moving ambulance pins.

---

### 12. HR 9-Hour Biometric Attendance & Shift Roster Scheduler
![HR Attendance & Shift Roster](file:///d:/user_management_system/docs/mockups/hr_attendance_roster_1792042835454.jpg)

- **File:** `docs/mockups/hr_attendance_roster_1792042835454.jpg`
- **Key Functionalities:**
  - Top status summary: *Present: 582 (94.2%)*, *Late Mark (>09:15 AM Grace Expired): 24*, *Half-Day: 6*, *On Leave: 12*.
  - **9-Hour Policy Attendance Table (Left):** Employee ID, Staff Name, Department, Punch In (`08:58 AM`), Punch Out (`18:12 PM`), Total Duration (`9h 14m`), Green status pill `Present (9h+)`, and GPS Geofence verification (`Central Campus Geofence Verified`).
  - **Weekly Shift Roster Calendar Matrix (Right):** Drag-and-drop roster grid showing color-coded shifts: Cyan for Morning (`07:00-15:30`), Violet for Evening (`15:00-23:30`), Dark Navy with moon icon for **Night Shift [Midnight-Crossing] (`23:00-07:30`)**, and Grey for Weekly Off.

---

### 13. Automated Monthly Payroll Run Wizard & Payslip Ledger
![Automated Monthly Payroll Wizard](file:///d:/user_management_system/docs/mockups/payroll_run_wizard_1792042861632.jpg)

- **File:** `docs/mockups/payroll_run_wizard_1792042861632.jpg`
- **Key Functionalities:**
  - **4-Step Horizontal Progress Wizard:** `Step 1: Attendance & Overtime Freeze [Checked Green]`, `Step 2: Component & Tax Slabs Calculation [Active]`, `Step 3: Dry-Run Variance Audit`, `Step 4: Finance Disbursement Gate`.
  - **Cycle Summary (Left):** October 2026 Cycle — Total Gross Earnings (`$894,200.00`), Deductions (`$154,000.00`), Net Payout (`$740,200.00`) across 640 employees.
  - **Employee Payslip Audit Table (Right):** Employee ID, Staff Name, Department, Gross Pay, Deductions, Net Salary, Variance badge `+2.1% vs Last Month`, and buttons `[Execute Dry-Run Audit]` and `[Approve & Release to Finance Gate]`.

# Diabetic Tracker v0 - Non-chemx

A clinical-grade task manager and glucose tracker designed for individuals managing insulin-dependent diabetes (MDI / basal-bolus regimens). It helps patients track insulin injections, monitor glycemic patterns, rotate injection sites, set daily reminders, and export comprehensive clinical reports for doctor visits.

---

## ⏱️ Benchmark & Generation Metrics

As tracked during initial build and prompt execution:

| Metric | Recorded Value |
| :--- | :--- |
| **Project Name** | `Diabetic Tracker v0 - Non-chemx` |
| **Project Model** | `models/gemini-3.8-flash` |
| **Project Start Time** | `2026-09-25T06:12:23-07:00` |
| **Project End Time** | `2026-09-25T06:16:40-07:00` |
| **Total Build Duration** | **4 minutes and 17 seconds** |
| **Estimated Token Usage** | **~27,400 tokens** *(~10,000 prompt/system/skills context + ~14,000 code generation/viewing + ~3,400 tool calls & verification logs)* |
| **Linter / TypeScript Status** | **Pass (0 errors)** |
| **Build Verification** | **Compiled Successfully** |

*Note: Exact billing token counts are maintained on the external platform layer in Google AI Studio project usage for applet `8a54473c-5152-4b8f-958b-08e2b7bf4c08`.*

---

## 🌟 Key Features

### 1. Daily Insulin Task Manager & Regimen Checklist
- **Recurring Daily Injections:** Interactive schedule for long-acting basal shots, meal boluses (Breakfast, Lunch, Dinner), and bedtime checks.
- **One-Tap Actions:** Quick "Mark Taken" modal (confirming actual units injected, injection site, and carb notes), "Skip", and "Undo".
- **Dynamic Site Rotation:** Abdomen quadrant visualizer (Upper/Lower Left/Right, outer thighs, upper arms) suggesting the next optimal site to prevent lipohypertrophy.
- **Audio Chime & Reminders:** Gentle Web Audio synthesizer bell alerts patients when a scheduled dose is due.

### 2. Glucose Analytics Dashboard
- **Clinical KPIs:** Mean blood glucose, Estimated HbA1c ($eAG = \frac{\text{Avg} + 46.7}{28.7}$), Time-In-Range percentage (TIR %), Glycemic Variability coefficient ($CV\% \le 36\%$), and Average Total Daily Dose (TDD).
- **Interactive Glycemic Curve:** SVG trend chart with target band highlighting (70–180 mg/dL), hypoglycemia alert lines (70 mg/dL), hover tooltips, and correlated insulin dose markers.
- **Ambulatory Glucose Profile (AGP):** Stacked bar chart showing percentage breakdown across Very Low ($<54$), Low ($54\text{--}69$), In Target ($70\text{--}180$), High ($181\text{--}250$), and Very High ($>250$) according to ADA consensus standards.
- **Time/Meal Context Analysis:** Fasting, Pre-Meal, Post-Meal, Bedtime, and Overnight averages.

### 3. Comprehensive Historical Records
- Chronological table combining both glucose logs and insulin shot records.
- Fast multi-field search across notes, insulin brand names, injection sites, and numeric readings.
- Filters by record category (Insulin only, Glucose only) and time periods (Today, 7 days, 30 days, All time).
- In-place editing and deletion with full modal review.

### 4. Doctor Visit Export & Clinical Summary
- **Official Consultation Sheet:** Formatted with patient name, Medical Record Number (MRN), DOB, attending endocrinologist, and clinic name.
- **Print to PDF:** Clean `@media print` layout styled as an EHR chart report with physical signature blocks.
- **EHR CSV Export:** One-click CSV download formatted for physician EHR record intake and spreadsheet graphing.
- **Patient Portal Copy:** One-click clipboard copy formatted for messaging systems like Epic MyChart.
- **Dual Unit Support:** Instant toggle between `mg/dL` and `mmol/L`.

### 5. Local Data Persistence & Safety
- All data saved in browser `localStorage`.
- Includes full JSON backup export and restore file upload.
- One-click reload of realistic 14-day sample records.

---

## 🛠️ Tech Stack

- **Framework:** React 19 (TypeScript)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Audio:** Web Audio API (native oscillator synthesis)
- **Tooling:** Vite, TypeScript

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
```

---

## 📄 License

This project is licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.

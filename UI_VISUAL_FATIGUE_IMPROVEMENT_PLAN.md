# UI Visual Fatigue & Readability Analysis & Action Plan

## Overview & Context
Client feedback:
> *"The overall flow of the application is OK, but with prolonged working, the UI is difficult to read and see work like that."*

This document outlines the exact root causes discovered in the codebase that cause eye fatigue, headaches, and reading difficulty during prolonged 8-hour operational shifts, along with concrete implementation steps to resolve them.

---

## 1. Root Causes Discovered in Codebase

### A. Sub-Pixel Viewport Units (`vw`) Making Fonts Unreadably Small
* **What's in Code:** Extensive usage of viewport-relative font units like `text-[0.68vw]`, `text-[0.70vw]`, `text-[0.72vw]`, `text-[0.76vw]`.
* **The Problem:** 
  * On a typical 14-inch or 15-inch 1080p display (or 1366×768 laptops):
    * `0.68vw` = **~9.2px**
    * `0.72vw` = **~9.8px**
    * `0.76vw` = **~10.3px**
  * Standard body text for data-dense enterprise applications (like Jira, SAP, Linear) is **13px to 14px** (`text-xs` / `text-sm`).
  * Sitting 2 feet away from a screen reading 9.5px text for hours causes intense eye strain and squinting.
  * Browser zoom (`Ctrl` + `+`) behaves inconsistently with `vw` fonts compared to standard `rem` / `px` scaling.

### B. Glaring White Backgrounds with Low-Contrast Secondary Grays
* **What's in Code:** Pure white backgrounds (`#ffffff`) paired with `text-slate-400`, `text-slate-500`, or `text-gray-400` across table columns, dates, serial numbers, and customer names.
* **The Problem:**
  * Light-gray text on stark white violates WCAG contrast guidelines.
  * Staring at bright white screens under office fluorescent/LED lights for 6–8 hours produces **screen glare fatigue**.

### C. Ultra-Tight Row Heights & Lack of Row Scanning Guides
* **What's in Code:** Row padding `py-[0.2vw]`, button heights `h-[2.2vw]`, micro icons `w-[0.7vw] h-[0.7vw]` (~9.5px). Tables display 15–25 columns without zebra striping.
* **The Problem:**
  * Eyes jump rows when scanning horizontally across 15 columns. Operators lose track of which row they are looking at, leading to misclicks or fatigue.

### D. Visual Noise from Saturated Badges
* **What's in Code:** Multiple bright background badges on every row (`bg-emerald-100`, `bg-blue-100`, `bg-rose-100`, `bg-amber-100`, `bg-purple-100`).
* **The Problem:**
  * When 20 rows each feature 4–5 bright badges, visual hierarchy is lost, creating cognitive overload.

---

## 2. Action Plan & Solutions to Execute

### Step 1: Base Font Scaling & Minimum Readable Floor
* Replace micro-vw text sizes in table rows, popovers, and headers with readable scales:
  * Table data cells: Minimum `13px` / `text-[0.82vw]` (clamped so it never drops below 12.5px on any display: e.g., `text-[clamp(12px,0.8vw,14px)]`).
  * Tooltips & meta labels: Minimum `12px` (clamped: `text-[clamp(11px,0.72vw,13px)]`).
  * Table headers & primary buttons: `13px–14px`.

### Step 2: High-Contrast Data Typography
* Change key data values (Serial Number, Customer Name, Call/Entry Number, Date, Status) from `text-slate-400/500` to high-contrast `text-slate-800` or `text-slate-900`.
* Keep muted text strictly for non-critical divider symbols or empty placeholders.

### Step 3: Row Breathing Room & Zebra Striping
* Increase table body row padding to `py-2.5` or `py-3` (comfortable breathing room).
* Add subtle alternating row colors: `even:bg-slate-50/50` or `hover:bg-blue-50/40` so operators can smoothly scan across wide tables without losing their place.

### Step 4: Table Density / Font Size Toggle (Optional / High-Value)
* Introduce a quick **Compact / Comfortable** toggle in the table toolbar (similar to Google Sheets or Gmail) allowing operators to choose their preferred density.

---

## 3. Key Files to Update
1. `frontend/src/modules/serviceCall/ServiceCallReports.jsx` (Tables, filters, popovers)
2. `frontend/src/modules/serviceCall/serviceCallResponse.jsx` (Main service call table)
3. `frontend/src/modules/serviceMaterial/ServiceMaterialReports.jsx` (Material reports table)
4. `frontend/src/modules/serviceMaterial/serviceMaterialResponse.jsx` & `ServiceMaterial.jsx` (Material response & product tables)
5. `frontend/src/index.css` (Base font size clamping rules)


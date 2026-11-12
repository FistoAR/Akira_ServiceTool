# Agent Guidelines & Operating Rules

## Core Directives

1. **Do NOT Run Production Builds (`npm run build`, `vite build`, etc.)**
   - Never initiate full compilation or production build tasks (`npm run build`, `yarn build`, `vite build`) unless the user explicitly commands it.
   - Vite's dev server (`npm run dev`) already hot-reloads code changes in real-time. Full production builds consume unnecessary time and background resources.

2. **Strict Git Safety — Never Revert or Restore Without Explicit Instruction**
   - Never execute `git checkout`, `git restore`, `git reset`, `git revert`, or `git clean` on user files or codebases unless the user specifically and explicitly requests a git restore.
   - Do not discard uncommitted changes or overwrite active working tree edits under any circumstances.

3. **Fast, Decisive Execution (No Over-Analysis)**
   - Do not spend excessive turns over-analyzing trivial details, running redundant diagnostic scripts, or speculating.
   - Implement requested UI and code changes directly, accurately, and as soon as possible (ASAP).
   - Ensure clean syntax, correct imports, proper layout, and no runtime errors before delivering the response.

4. **Typography & Contrast Rules (NO Light Gray Text)**
   - **Never use light gray or washed-out colors for labels, metadata, or text** (e.g., avoid `text-slate-400`, `text-gray-400`, `text-slate-300`, light pastel text). They are difficult to read and strain readability.
   - Always ensure high contrast: use deep, distinct, accessible shades such as `text-slate-700`, `text-slate-800`, `text-slate-900`, `text-gray-800`, or bold colored text (`text-indigo-900`, `text-blue-900`).
   - For secondary labels or captions, use darker medium tones like `text-slate-600` or `text-slate-700` with adequate weight (`font-semibold`), never faint gray.

5. **Table Architecture & Sticky Action Column Alignment**
   - Whenever tables have a pinned/sticky action column (`sticky right-0` on `<td>` cells):
     - The corresponding table header `<th>` **MUST** also have `sticky right-0 top-0 z-40` with an opaque header background (e.g., `bg-[#E9EDF7]`) and matching border/shadow (`shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]`).
     - Never omit `right-0` on the header `<th>`; doing so causes body cells to stay pinned while the header scrolls away under horizontal scroll, leaving an empty detached void.
     - Sticky S.No column (`sticky left-0`) must have equal synchronization on both header `<th>` and body `<td>`.
     - Always ensure column counts between `<thead>` and `<tbody>` match exactly in all filter states without conditional column dropping that produces mismatch.

6. **Popup Modals & Timeline/Audit Styling Standard (Service Call & Response Standard)**
   - **Modal Container:**
     - Backdrop: `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]`
     - Card: `bg-white rounded-[1vw] shadow-2xl border border-slate-200 overflow-hidden flex flex-col`
     - Header: Clean white background (`bg-white`), dark title (`text-slate-900 font-bold`), sub-text in `text-slate-600 font-medium`, and rounded close button (`p-[0.4vw] rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800`).
     - Body: Subtle canvas background (`bg-[#f8fafd]`) with internal scroll (`overflow-y-auto flex-1 min-h-0`).
     - Footer: Clean white background (`bg-white border-t border-slate-200 px-[1.4vw] py-[0.8vw] flex items-center justify-end shrink-0`), with pill close button (`rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-[1.3vw] h-[2vw]`).
   - **Audit & History Timeline:**
     - Vertical ruler: Centered `w-[2px] bg-slate-200 pointer-events-none` with timeline nodes positioned precisely along the ruler line (`rounded-full ring-4 ring-white shadow-2xs z-10`).
     - Chronology: Newest events first (reverse chronological order) for rapid visibility of latest actions.
     - Event Cards: Individual white cards (`bg-white rounded-[0.6vw] p-[0.85vw] border border-slate-200 shadow-2xs`).
     - Field Change Diffs: Do not dump inline raw string text with red strikethrough. Use structured 2-box comparisons:
       - Previous value in red/rose pill/box (`bg-rose-50/40 border border-rose-200 text-rose-700 line-through`).
       - Direction arrow `→` in `text-slate-400 font-bold`.
       - Updated value in emerald/green box (`bg-emerald-50/40 border border-emerald-200 text-emerald-900 font-semibold`).

7. **Service Material Response Action Column Rules**
   - **For In-Progress / Active Items:**
     - The employee directly inputs and updates report cells inline in the table.
     - The Action column shows the **Save** button (and **Unclaim** button if no report was submitted yet).
     - **Do NOT** display the `Edit` button for active/in-progress items, as they are already directly editable.
   - **For Completed Items (in all views, including the 'All' tab):**
     - Completed records are locked from inline typing by default, showing the status badge and the **`Edit`** button (<kbd>✎ Edit</kbd>).
     - Clicking **`Edit`** unlocks the row for **direct inline editing** (no popup).
     - In edit mode, the Action column shows the **`Save`** button and a **`Cancel`** (<kbd>✕ Cancel</kbd>) button.
     - Clicking **`Cancel`** reverts any unsaved changes and locks the row back to the completed state.
     - Clicking **`Save`** persists the edits directly and re-locks the row.

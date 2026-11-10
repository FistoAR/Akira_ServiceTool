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

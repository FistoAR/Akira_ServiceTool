import React, { useState, useEffect } from "react";
import { HelpCircle, X, BookOpen, Wrench, ClipboardCheck, CheckCircle2 } from "lucide-react";

const HELP_TABS = [
  {
    id: "nc",
    label: "Production NC",
    icon: ClipboardCheck,
    title: "Production NC (Non-Conformance) — How It Works",
    summary: "Use this page to register new non-conformances, assign them to staff or another zone, track progress, and complete validation.",
    sections: [
      {
        heading: "1. Registering a New NC",
        points: [
          "Click '+ New Registration' at the top right.",
          "Enter the Job Order Number and select a Customer.",
          "Add one or more items in the Manifest & Assembly Specs table. Mandatory fields (*) are Detection Stage, Board Type, Problem Type, NC Type, and Problem Description.",
          "Under 'Route / Raised To', choose 'Staff' to assign within your own zone, or 'Zone' to send the NC to another zone.",
          "Click 'Register Inward' to save."
        ]
      },
      {
        heading: "2. Filtering & Searching",
        points: [
          "Zone Scope pills: 'Same Zone' (created in your zone for your zone), 'Zone Sent' (created in your zone and sent to another zone), 'Zone Received' (sent to your zone from another zone). The count on each Zone Scope button indicates pending records only.",
          "Status pills: 'All', 'Pending', 'Rejected', and 'Completed' — counts update automatically based on your search and date filters.",
          "Use the search box to filter by Customer, Job Order, Ref No, Product, Serial/Batch No, or NC Type."
        ]
      },
      {
        heading: "3. Zone Allocation & Reallocation",
        points: [
          "For 'Zone Received' items, the Zone Lead can allocate the item to a staff member in their zone.",
          "Once the allocated staff marks the work as Completed, reallocation is locked.",
          "If you reallocate an item while it is still Pending and the previous staff already entered report details, a warning will appear."
        ]
      },
      {
        heading: "4. Two-Level Validation (Cross-Zone NCs)",
        points: [
          "After the assigned technician completes the work and it is Verified, cross-zone NCs go through two validation steps:",
          "Level 1 (Target Zone Lead): Reviews the work and clicks Accept or Reject with date and remarks.",
          "Level 2 (NC Creator / Raiser): Performs the final validation (Accept or Reject) after Level 1 is done.",
          "For Same-Zone / Internal NCs, only the creator/raiser or admin validates."
        ]
      }
    ]
  },
  {
    id: "response",
    label: "Production NC Response",
    icon: Wrench,
    title: "Production NC Response — How It Works",
    summary: "Technicians and staff use this page to record root cause, corrective actions, completion status, and verification.",
    sections: [
      {
        heading: "1. Updating Work Details",
        points: [
          "Find your assigned NC item using the Zone Scope pills, Status pills, Search, or Date filter. The count on each Zone Scope button indicates pending records only.",
          "Select the 4M Category, enter Root Cause, Action Taken, Delay Time, and Material Cost.",
          "Change Status to 'Completed' once the repair/rework is finished.",
          "Note: Closing Date can only be entered after Status is set to 'Completed'."
        ]
      },
      {
        heading: "2. Verification & Validation",
        points: [
          "Once Status is Completed, the Verification column shows Accept / Reject buttons for authorized verifiers.",
          "Click Accept or Reject, choose the Verified Date, add optional remarks, and click Submit.",
          "After Verification is Accepted, Validation becomes available to the authorized validator."
        ]
      },
      {
        heading: "3. Viewing Full Details",
        points: [
          "Click the eye icon in the Info column to open the full Product & Audit History modal, including Serial/Batch No and timeline."
        ]
      }
    ]
  },
  {
    id: "master",
    label: "Production Master",
    icon: BookOpen,
    title: "Production Master — How It Works",
    summary: "Configure master data used across all Production NC forms and workflows.",
    sections: [
      {
        heading: "1. Master Lists",
        points: [
          "Manage Customers, Products, Detection Stages, Problem Types, Board Types, and Dispositions.",
          "Any items added or updated here immediately appear in the dropdowns of Production NC Registration."
        ]
      },
      {
        heading: "2. Zone Mappings (Zone Leads)",
        points: [
          "Assign employees to zones and mark the Default Receiver (Zone Lead) for each zone.",
          "When an NC is sent to another zone, the Default Receiver / Zone Lead is responsible for allocating it to zone staff and performing Level 1 validation."
        ]
      }
    ]
  }
];

export const ProductionHelpModal = ({ isOpen, onClose, defaultTab = "nc" }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab || "nc");
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const current = HELP_TABS.find(t => t.id === activeTab) || HELP_TABS[0];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-xs p-[2vw]">
      <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[56vw] max-w-[820px] max-h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-[1.4vw] py-[0.9vw] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-[0.65vw]">
            <div className="bg-blue-50 p-[0.45vw] rounded-full text-blue-600 border border-blue-100">
              <HelpCircle className="w-[1.1vw] h-[1.1vw]" />
            </div>
            <div>
              <h3 className="text-[1.02vw] font-bold text-slate-800">Production Module Guide</h3>
              <p className="text-[0.74vw] text-slate-500 font-medium">Step-by-step help for each section</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.35vw] rounded-full transition-all cursor-pointer"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-[1.4vw] pt-[0.75vw] pb-[0.5vw] bg-slate-50/70 border-b border-slate-200 flex items-center gap-[0.5vw] flex-wrap shrink-0">
          {HELP_TABS.map(tab => {
            const IconComp = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-[0.85vw] py-[0.4vw] rounded-full text-[0.78vw] font-semibold inline-flex items-center gap-[0.4vw] transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[#1E4B94] text-white border-[#1E4B94] shadow-xs"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                }`}
              >
                <IconComp className="w-[0.85vw] h-[0.85vw]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-[1.4vw] overflow-y-auto space-y-[1vw] bg-white">
          <div className="bg-blue-50/60 border border-blue-100 rounded-[0.6vw] p-[0.9vw]">
            <h4 className="text-[0.95vw] font-bold text-slate-800">{current.title}</h4>
            <p className="text-[0.8vw] text-slate-600 mt-[0.25vw]">{current.summary}</p>
          </div>

          <div className="space-y-[0.85vw]">
            {current.sections.map((sec, idx) => (
              <div key={idx} className="border border-slate-200 rounded-[0.6vw] p-[0.9vw] bg-slate-50/40">
                <h5 className="text-[0.84vw] font-bold text-[#530000] mb-[0.45vw]">{sec.heading}</h5>
                <ul className="space-y-[0.35vw]">
                  {sec.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-[0.45vw] text-[0.79vw] text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-[0.85vw] h-[0.85vw] text-emerald-600 shrink-0 mt-[0.18vw]" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[1.4vw] py-[0.75vw] border-t border-slate-200 bg-slate-50/70 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[1.2vw] h-[2vw] bg-[#1E4B94] hover:bg-[#173a75] text-white font-semibold rounded-full text-[0.78vw] cursor-pointer transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductionHelpButton = ({ defaultTab = "nc", className = "" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open Production Help Guide"
        className={`inline-flex items-center gap-[0.35vw] px-[0.75vw] py-[0.38vw] rounded-full border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[0.78vw] font-semibold transition-all cursor-pointer shadow-2xs ${className}`}
      >
        <HelpCircle className="w-[0.9vw] h-[0.9vw]" />
        <span>Help</span>
      </button>
      <ProductionHelpModal isOpen={open} onClose={() => setOpen(false)} defaultTab={defaultTab} />
    </>
  );
};

export default ProductionHelpModal;


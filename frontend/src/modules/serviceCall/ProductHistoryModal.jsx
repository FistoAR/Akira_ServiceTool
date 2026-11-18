import React, { useState } from "react";
import { Clock, History, X, Info } from "lucide-react";

const FIELD_LABEL_MAP = {
  dateTime: "Date & Time",
  callNumber: "Call No",
  customerName: "Customer Name",
  partyCode: "Party Code",
  contactPerson: "Contact Person",
  contactNumber: "Contact Number",
  emailId: "Email ID",
  location: "Location",
  site: "Site",
  priority: "Priority",
  mode: "Call Mode",
  callDescription: "Description",
  productModel: "Product Model",
  itemCode: "Item Code",
  serialNumber: "Serial Number",
  errorCode: "Error Code",
  warrantyStatus: "Warranty Status",
  remarks: "Remarks",
  status: "Status",
  resolutionType: "Resolution Type",
  editReason: "Edit Reason",
};

const formatFieldValue = (field, val) => {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";

  // Check if date string or timestamp
  if (
    typeof val === "string" &&
    (field.toLowerCase().includes("date") ||
      field.toLowerCase().includes("time") ||
      field === "dateTime" ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val))
  ) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  return String(val);
};

export const ProductHistoryTimeline = ({ history, employees, currentUser, forceShow = false, hideHeader = false }) => {
  const [show, setShow] = useState(forceShow);

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-7 text-slate-700">
        <Info className="w-7 h-7 mb-2 text-slate-700" />
        <span className="text-sm font-semibold">Not yet Assigned to anyone</span>
      </div>
    );
  }

  // Sort history in reverse chronological order (latest event first)
  const sortedHistory = [...history].sort((a, b) => {
    const tA = new Date(a.timestamp || a.date || a.editedAt || 0).getTime();
    const tB = new Date(b.timestamp || b.date || b.editedAt || 0).getTime();
    return tB - tA;
  });

  return (
    <div className={hideHeader ? "" : "mt-3.5 pt-3.5 border-t border-slate-300"}>
      {!hideHeader && (
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            Activity History
          </h3>
          <button
            onClick={() => setShow(!show)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
          >
            {show ? "Hide History" : "View History"}
          </button>
        </div>
      )}

      {(show || forceShow) && (
        <div className="space-y-3 pl-2">
          {sortedHistory.map((h, i) => {
            const emp = employees?.find(e => e.userId === h.updatedBy);
            const displayName = emp ? `${emp.name} (${emp.department})` : (h.updatedByName || h.updatedBy || 'System');
            const isSupportEvent = h.status?.toLowerCase().includes('support') || !!h.metadata?.supportPerson;
            const isFieldVisitEvent = h.status?.toLowerCase().includes('field visit') || !!h.metadata?.assignedTo;
            
            let isHighlightedEvent = false;
            if (currentUser) {
                const uid = currentUser.userId;
                if (isSupportEvent) {
                    if (h.updatedBy === uid || h.metadata?.supportPerson?.userId === uid || h.metadata?.returnedTo === uid) {
                        isHighlightedEvent = true;
                    }
                }
                if (isFieldVisitEvent) {
                    if (h.updatedBy === uid || h.metadata?.assignedTo === uid || h.metadata?.returnedTo === uid) {
                        isHighlightedEvent = true;
                    }
                }
            } else {
                isHighlightedEvent = isSupportEvent || isFieldVisitEvent;
            }
            
            const isEscalationEvent = h.status === "Escalation Assigned" || h.status === "Escalated" || h.status === "SLA Breached" || h.status?.includes("Escalation");
            const isSlaBreached = h.status === "SLA Breached" || h.metadata?.remarks?.includes("SLA Auto-Escalation");

            if (isEscalationEvent) {
              return (
                <div key={i} className="flex gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 z-10 ${isSlaBreached ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    {i !== sortedHistory.length - 1 && (
                      <div className="w-px h-full bg-slate-200 absolute top-2 bottom-[-12px] left-[4px]" />
                    )}
                  </div>
                  <div className={`flex-1 rounded-lg p-2.5 shadow-xs bg-white border ${
                    isSlaBreached ? 'border-rose-200' : 'border-slate-200'
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-semibold ${isSlaBreached ? 'text-rose-700' : 'text-slate-850'} flex items-center gap-1.5`}>
                        {h.status}
                        {h.metadata?.level > 0 && <span className="bg-rose-50 text-rose-600 px-1 py-px rounded text-xs border border-rose-200 font-medium uppercase tracking-wider">Call Level</span>}
                      </span>
                      <span className="text-xs text-slate-700 font-normal">
                        {new Date(h.timestamp).toLocaleString('en-GB', {
                          month: '2-digit', day: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-650 mb-1 flex items-center gap-1">
                      To: <span className="font-semibold text-slate-800">{h.metadata?.assignedToName || displayName}</span> 
                      {h.metadata?.dept && <span className="text-slate-700 font-normal">({h.metadata.dept})</span>}
                      {h.metadata?.level > 0 && <span className="text-slate-700 font-normal">- Level {h.metadata.level}</span>}
                    </div>
                    {h.metadata?.deadline && (
                      <div className="text-sm text-slate-700 font-normal flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-slate-700" /> Deadline: {new Date(h.metadata.deadline).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    )}
                    {h.metadata?.remarks && (
                      <div className={`text-xs font-normal mt-1.5 ${isSlaBreached ? 'text-rose-700 bg-rose-50/70 border border-rose-100 p-1.5 rounded' : 'text-slate-700'}`}>
                        {h.metadata.remarks}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={i} className="flex gap-3 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 z-10 ${isHighlightedEvent ? 'bg-blue-500 ring-2 ring-blue-100' : 'bg-indigo-500'}`} />
                  {i !== sortedHistory.length - 1 && (
                    <div className="w-px h-full bg-slate-200 absolute top-2 bottom-[-12px] left-[4px]" />
                  )}
                </div>
                <div className={`flex-1 rounded-lg p-2.5 shadow-xs bg-white border ${
                  isHighlightedEvent 
                    ? 'border-blue-300' 
                    : 'border-slate-200'
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-semibold ${isHighlightedEvent ? 'text-blue-900' : 'text-slate-850'}`}>
                      {h.status === 'Closed' || h.status === 'Close' ? 'Resolved' : h.status}
                    </span>
                    <span className="text-xs text-slate-700 font-normal">
                      {new Date(h.timestamp).toLocaleString('en-GB', {
                        month: '2-digit', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-slate-650 mb-1">
                    By: <span className="font-semibold text-slate-800">{displayName}</span>
                  </div>
                  {h.metadata?.supportPerson && (
                    <div className="text-xs text-indigo-700 font-medium mb-1">
                      Sent to: {h.metadata.supportPerson.name} ({h.metadata.supportPerson.department || 'Support'})
                    </div>
                  )}
                  {h.metadata?.assignedTo && (
                    <div className="text-xs text-indigo-700 font-medium mb-1">
                      Assigned to: {h.metadata.assignedToName || h.metadata.assignedTo}
                      {h.metadata.visitDate && ` • Visit Date: ${new Date(h.metadata.visitDate).toLocaleDateString()}`}
                    </div>
                  )}
                  {h.metadata?.visitDate && !h.metadata?.assignedTo && (
                    <div className="text-xs text-indigo-700 font-medium mb-1">
                      New Visit Date: {new Date(h.metadata.visitDate).toLocaleDateString()}
                    </div>
                  )}
                  {(h.metadata?.returnedTo || h.status === 'Field Visit Returned') && (
                    <div className="text-xs text-amber-700 font-medium mb-1">
                      Returned to: {h.metadata?.returnedTo || 'Support'}
                    </div>
                  )}
                  {h.remarks && (
                    <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200/80 rounded-md p-2 mt-1.5 font-normal leading-relaxed">
                      {h.remarks}
                    </div>
                  )}

                  {/* Audit Diff Table if this was an edit event */}
                  {h.metadata?.diffs && h.metadata.diffs.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg border border-amber-200/80 shadow-2xs overflow-hidden">
                      <div className="bg-amber-50/50 px-2.5 py-1 border-b border-amber-100/80 flex items-center justify-between text-sm">
                        <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Changed Fields ({h.metadata.diffs.length})
                        </span>
                        {h.metadata.editReason && (
                          <span className="font-normal text-slate-700 text-sm">
                            Reason: <span className="text-slate-700">{h.metadata.editReason}</span>
                          </span>
                        )}
                      </div>

                      <div className="p-1.5 space-y-1">
                        {h.metadata.diffs.map((d, dIdx) => {
                          const label = FIELD_LABEL_MAP[d.field] || (d.field.charAt(0).toUpperCase() + d.field.slice(1).replace(/([A-Z])/g, ' $1'));
                          const origFormatted = formatFieldValue(d.field, d.originalValue);
                          const editFormatted = formatFieldValue(d.field, d.editedValue);

                          return (
                            <div
                              key={dIdx}
                              className="text-xs bg-slate-50/60 rounded-md p-1.5 border border-slate-200/60"
                            >
                              <div className="font-medium text-slate-700 text-sm uppercase tracking-wide mb-1">
                                {label}
                              </div>

                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                                {/* Previous Value */}
                                <div className="bg-white rounded-md px-1.5 py-1 border border-slate-200/80">
                                  <div className="text-xs font-medium text-slate-700 uppercase tracking-wider mb-px">
                                    Previous
                                  </div>
                                  <div
                                    className="text-slate-650 font-normal text-xs break-words"
                                    title={origFormatted}
                                  >
                                    {origFormatted}
                                  </div>
                                </div>

                                {/* Arrow Indicator */}
                                <div className="text-slate-700 font-normal text-xs px-px">
                                  →
                                </div>

                                {/* Updated Value */}
                                <div className="bg-emerald-50/40 rounded-md px-1.5 py-1 border border-emerald-200/80">
                                  <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-px">
                                    Updated
                                  </div>
                                  <div
                                    className="text-emerald-800 font-medium text-xs break-words"
                                    title={editFormatted}
                                  >
                                    {editFormatted}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProductHistoryModal = ({ history, employees, currentUser, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-7"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 w-full max-w-[576px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Product History
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>
        <div className="p-5.5 overflow-y-auto">
          <ProductHistoryTimeline history={history} employees={employees} currentUser={currentUser} forceShow={true} hideHeader={true} />
        </div>
      </div>
    </div>
  );
};
export default ProductHistoryModal;

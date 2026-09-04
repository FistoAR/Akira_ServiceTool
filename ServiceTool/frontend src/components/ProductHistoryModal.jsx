import React, { useState } from "react";
import { Clock, History, X, Info } from "lucide-react";

export const ProductHistoryTimeline = ({ history, employees, currentUser, forceShow = false, hideHeader = false }) => {
  const [show, setShow] = useState(forceShow);

  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-[2vw] text-slate-500">
        <Info className="w-[2vw] h-[2vw] mb-[0.5vw] text-slate-400" />
        <span className="text-[0.9vw] font-semibold">Not yet Assigned to anyone</span>
      </div>
    );
  }
  return (
    <div className={hideHeader ? "" : "mt-[1vw] pt-[1vw] border-t border-slate-300"}>
      {!hideHeader && (
        <div className="flex justify-between items-center mb-[0.6vw]">
          <h3 className="text-[0.85vw] font-black text-slate-800 flex items-center gap-[0.4vw]">
            <Clock className="w-[1vw] h-[1vw] text-slate-500" />
            Activity History
          </h3>
          <button
            onClick={() => setShow(!show)}
            className="text-[0.75vw] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
          >
            {show ? "Hide History" : "View History"}
          </button>
        </div>
      )}

      {(show || forceShow) && (
        <div className="space-y-[0.8vw] pl-[0.5vw]">
          {history.map((h, i) => {
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
                <div key={i} className="flex gap-[0.8vw] relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-[0.6vw] h-[0.6vw] rounded-full mt-[0.2vw] z-10 ${isSlaBreached ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    {i !== history.length - 1 && (
                      <div className="w-[1px] h-full bg-slate-300 absolute top-[0.6vw] bottom-[-0.8vw] left-[0.27vw]" />
                    )}
                  </div>
                  <div className={`flex-1 rounded-[0.5vw] p-[0.6vw] shadow-sm bg-white border ${
                    isSlaBreached ? 'border-rose-300' : 'border-slate-200'
                  }`}>
                    <div className="flex justify-between items-start mb-[0.2vw]">
                      <span className={`text-[1vw] font-bold ${isSlaBreached ? 'text-rose-700' : 'text-slate-900'} flex items-center gap-[0.4vw]`}>
                        {h.status}
                        {h.metadata?.level > 0 && <span className="bg-rose-50 text-rose-600 px-[0.3vw] py-[0.1vw] rounded text-[0.6vw] border border-rose-200 font-bold uppercase tracking-wider">Call Level</span>}
                      </span>
                      <span className="text-[0.8vw] text-slate-500 font-medium">
                        {new Date(h.timestamp).toLocaleString('en-GB', {
                          month: '2-digit', day: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </span>
                    </div>
                    <div className="text-[0.85vw] text-slate-600 mb-[0.2vw] flex items-center gap-[0.3vw]">
                      To: <span className="font-bold text-slate-800">{h.metadata?.assignedToName || displayName}</span> 
                      {h.metadata?.dept && <span className="text-slate-500">({h.metadata.dept})</span>}
                      {h.metadata?.level > 0 && <span className="text-slate-500">- Level {h.metadata.level}</span>}
                    </div>
                    {h.metadata?.deadline && (
                      <div className="text-[0.75vw] text-slate-500 flex items-center gap-[0.3vw] mb-[0.3vw]">
                        <Clock className="w-[0.8vw] h-[0.8vw]" /> Deadline: {new Date(h.metadata.deadline).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    )}
                    {h.metadata?.remarks && (
                      <div className={`text-[0.8vw] font-semibold mt-[0.4vw] ${isSlaBreached ? 'text-rose-700 bg-rose-50 border border-rose-100 p-[0.4vw] rounded' : 'text-slate-700'}`}>
                        {h.metadata.remarks}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={i} className="flex gap-[0.8vw] relative">
                <div className="flex flex-col items-center">
                  <div className={`w-[0.6vw] h-[0.6vw] rounded-full mt-[0.2vw] z-10 ${isHighlightedEvent ? 'bg-blue-500 ring-2 ring-blue-200' : 'bg-indigo-500'}`} />
                  {i !== history.length - 1 && (
                    <div className="w-[1px] h-full bg-slate-300 absolute top-[0.6vw] bottom-[-0.8vw] left-[0.27vw]" />
                  )}
                </div>
                <div className={`flex-1 rounded-[0.5vw] p-[0.6vw] shadow-sm ${
                  isHighlightedEvent 
                    ? 'bg-blue-50 border-[2px] border-blue-400' 
                    : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex justify-between items-start mb-[0.2vw]">
                    <span className={`text-[1vw] font-bold ${isHighlightedEvent ? 'text-blue-900' : 'text-slate-900'}`}>
                      {h.status === 'Closed' || h.status === 'Close' ? 'Resolved' : h.status}
                    </span>
                    <span className="text-[0.8vw] text-slate-500 font-medium">
                      {new Date(h.timestamp).toLocaleString('en-GB', {
                        month: '2-digit', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </span>
                  </div>
                  <div className="text-[0.85vw] text-slate-600 mb-[0.2vw]">
                    By: <span className="font-semibold text-slate-800">{displayName}</span>
                  </div>
                  {h.metadata?.supportPerson && (
                    <div className="text-[0.85vw] text-indigo-700 font-bold mb-[0.2vw]">
                      Sent to: {h.metadata.supportPerson.name} ({h.metadata.supportPerson.department || 'Support'})
                    </div>
                  )}
                  {h.metadata?.assignedTo && (
                    <div className="text-[0.85vw] text-indigo-700 font-bold mb-[0.2vw]">
                      Assigned to: {h.metadata.assignedToName || h.metadata.assignedTo}
                      {h.metadata.visitDate && ` • Visit Date: ${new Date(h.metadata.visitDate).toLocaleDateString()}`}
                    </div>
                  )}
                  {h.metadata?.visitDate && !h.metadata?.assignedTo && (
                    <div className="text-[0.85vw] text-indigo-700 font-bold mb-[0.2vw]">
                      New Visit Date: {new Date(h.metadata.visitDate).toLocaleDateString()}
                    </div>
                  )}
                  {(h.metadata?.returnedTo || h.status === 'Field Visit Returned') && (
                    <div className="text-[0.85vw] text-amber-700 font-bold mb-[0.2vw]">
                      Returned to: {h.metadata?.returnedTo || 'Support'}
                    </div>
                  )}
                  {h.remarks && (
                    <div className="text-[0.85vw] text-slate-700 bg-white border border-slate-200 rounded-[0.4vw] p-[0.6vw] mt-[0.4vw]">
                      {h.remarks}
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-[2vw]"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 w-full max-w-[40vw] max-h-[80vh] rounded-[1vw] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-[1.2vw] border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="text-[1.2vw] font-black text-slate-800 flex items-center gap-[0.5vw]">
            <History className="w-[1.4vw] h-[1.4vw] text-indigo-600" />
            Product History
          </h2>
          <button onClick={onClose} className="p-[0.5vw] hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-[1.2vw] h-[1.2vw] text-slate-500" />
          </button>
        </div>
        <div className="p-[1.5vw] overflow-y-auto">
          <ProductHistoryTimeline history={history} employees={employees} currentUser={currentUser} forceShow={true} hideHeader={true} />
        </div>
      </div>
    </div>
  );
};
export default ProductHistoryModal;

const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src/pages/ServiceCallReports.jsx');
let content = fs.readFileSync(target, 'utf8');

// 1. Insert getProductStatus helper
const itemsPerPageLine = 'const itemsPerPage = 10;';
const helperCode = `
  const getProductStatus = (item, group) => {
    if (item.product._resolved || item.product._productClosure?.status === "Closed") return "Resolved";
    const escLen = item.product._escalationHistory?.length || 0;
    const callEscLen = group.call.escalationHistory?.length || 0;
    if (escLen > 0 || callEscLen > 0) return "Escalation";
    const historyLen = item.product._history?.length || 0;
    if (historyLen > 0) return item.product._history[historyLen - 1].status;
    if (item.product._attended) return "Attended";
    return "Open";
  };
`;
if (!content.includes('const getProductStatus')) {
  content = content.replace(itemsPerPageLine, itemsPerPageLine + '\n' + helperCode);
}

// 2. Replace export status logic
const oldExportStatus = `
        const pStatus = item.product._productClosure?.status || (item.product._resolved ? "Resolved" : "Open");
        const finalStatus = pStatus === "Closed" ? "Resolved" : pStatus;
`.trim();
const newExportStatus = `
        const finalStatus = getProductStatus(item, group);
`.trim();
content = content.replace(oldExportStatus, newExportStatus);

// 3. Replace JSX color classes
const oldColorLogic = `
                            (() => {
                              const uid = targetEmployee?.userId;
                              const pStatus = item.product._productClosure?.status || (item.product._resolved ? "Resolved" : "Open");
                              if (pStatus === "Resolved" || pStatus === "Closed") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
                              if (pStatus === "Returned from Support") return "bg-gray-100 text-gray-700 border border-gray-300";
                              if (pStatus === "Returned from Field Visit" || pStatus === "Field Visit Returned") return "bg-gray-100 text-gray-700 border border-gray-300";

                              const isFieldVisitActive = pStatus === "Field Visit Required" || (item.product._fieldVisit?.isAssigned && item.product._fieldVisit?.status !== "Closed" && item.product._fieldVisit?.status !== "Returned");
                              if (isFieldVisitActive) {
                                if (uid && item.product._fieldVisit?.assignedTo === uid && item.product._assignedEngineerId !== uid) {
                                  return "bg-blue-50 text-blue-700 border border-blue-200";
                                }
                                return "bg-amber-50 text-amber-700 border border-amber-200"; 
                              }

                              if (uid && item.product._supportPersonId === uid && item.product._assignedEngineerId !== uid) {
                                return "bg-blue-50 text-blue-700 border border-blue-200";
                              }
                              
                              if (item.product._supportRequested && !item.product._resolved && pStatus !== "Closed") {
                                return "bg-blue-50 text-blue-700 border border-blue-200";
                              }
                              if (pStatus === "Pending") return "bg-amber-50 text-amber-700 border border-amber-200";
                              if (pStatus === "Open" && item.product._attended) return "bg-indigo-50 text-indigo-700 border border-indigo-200";
                              return "bg-slate-50 text-slate-700 border border-slate-300";
                            })()
`.trim();

const newColorLogic = `
                            (() => {
                              const pStatus = getProductStatus(item, group);
                              if (pStatus === "Resolved") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
                              if (pStatus === "Escalation") return "bg-red-50 text-red-700 border border-red-200";
                              if (pStatus.includes("Returned")) return "bg-gray-100 text-gray-700 border border-gray-300";
                              if (pStatus.includes("Field Visit")) return "bg-amber-50 text-amber-700 border border-amber-200";
                              if (pStatus.includes("Support")) return "bg-blue-50 text-blue-700 border border-blue-200";
                              if (pStatus === "Pending") return "bg-amber-50 text-amber-700 border border-amber-200";
                              if (pStatus === "Attended") return "bg-indigo-50 text-indigo-700 border border-indigo-200";
                              return "bg-slate-50 text-slate-700 border border-slate-300";
                            })()
`.trim();

if (content.includes(oldColorLogic)) {
  content = content.replace(oldColorLogic, newColorLogic);
} else {
  console.log("oldColorLogic not found");
}

// 4. Replace JSX text rendering
const oldTextLogic = `
                            (() => {
                              const uid = targetEmployee?.userId;
                              const pStatus = item.product._productClosure?.status || (item.product._resolved ? "Resolved" : "Open");
                              if (pStatus === "Resolved" || pStatus === "Closed") return "Resolved";
                              if (pStatus === "Returned from Support") return "Returned Support";
                              if (pStatus === "Returned from Field Visit" || pStatus === "Field Visit Returned") return "Returned Field Visit";

                              const isFieldVisitActive = pStatus === "Field Visit Required" || (item.product._fieldVisit?.isAssigned && item.product._fieldVisit?.status !== "Closed" && item.product._fieldVisit?.status !== "Returned");
                              if (isFieldVisitActive) {
                                if (uid && item.product._fieldVisit?.assignedTo === uid && item.product._assignedEngineerId !== uid) {
                                  return "Assigned Field Visit";
                                }
                                return "Field Visit"; 
                              }

                              if (uid && item.product._supportPersonId === uid && item.product._assignedEngineerId !== uid) {
                                return "Assigned Support";
                              }
                              
                              if (item.product._supportRequested && !item.product._resolved && pStatus !== "Closed") {
                                return "Support Requested";
                              }
                              if (pStatus === "Open" && item.product._attended) return "Attended";
                              return pStatus;
                            })()
`.trim();

const newTextLogic = `
                            getProductStatus(item, group)
`.trim();

if (content.includes(oldTextLogic)) {
  content = content.replace(oldTextLogic, newTextLogic);
} else {
  console.log("oldTextLogic not found");
}

fs.writeFileSync(target, content);
console.log('Successfully updated ServiceCallReports.jsx statuses.');

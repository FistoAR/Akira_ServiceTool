import React, { useState, useEffect } from "react";
import axios from "axios";
import { History, X } from "lucide-react";
import { motion } from "framer-motion";
import { API_URL } from "./ResponseConstants";
import { Badge } from "./ResponseWidgets";

export const CustomerHistoryModal = ({ identifier, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/service-calls/customer-history/${encodeURIComponent(identifier)}`,
        );
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch customer history", err);
      } finally {
        setLoading(false);
      }
    };
    if (identifier) fetchHistory();
  }, [identifier]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-7">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[720px] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-slate-400"
      >
        <div className="bg-indigo-950 px-5 py-3.5 flex justify-between items-center border-b border-indigo-800">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white">
              Service History: {identifier}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5.5 overflow-y-auto flex-1 bg-slate-50">
          {loading ? (
            <div className="flex justify-center p-7">
              <div className="w-7 h-7 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-700 font-bold text-sm p-7">
              No past service calls found for this customer.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {history.map((call) => (
                <div
                  key={call._id}
                  className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-800">
                        Call ID : {call.callNumber}
                      </span>
                      <span className="text-sm text-slate-700 bg-slate-100 px-1.5 py-px rounded">
                        {new Date(call.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge
                      label={call.status}
                      color={call.status === "Resolved" ? "green" : "blue"}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    {call.products?.map((p, idx) => {
                      let finalStatus = "Open";
                      let statusColor = "text-blue-600";

                      if (
                        p._resolved ||
                        p._productClosure?.status === "Closed"
                      ) {
                        finalStatus = "Resolved";
                        statusColor = "text-emerald-600";
                      } else if (p._productClosure?.status === "Pending") {
                        finalStatus = "Pending";
                        statusColor = "text-amber-600";
                      } else if (
                        p._fieldVisit?.isAssigned ||
                        p._productClosure?.status === "Field Visit Required"
                      ) {
                        finalStatus = "Field Visit Required";
                        statusColor = "text-indigo-600";
                      } else if (p._supportRequested) {
                        finalStatus = "Support Requested";
                        statusColor = "text-cyan-600";
                      } else if (!p._attended) {
                        finalStatus = "Escalating";
                        statusColor = "text-rose-500";
                      }

                      return (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg"
                        >
                          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 leading-relaxed">
                            <div>
                              <span className="font-bold text-slate-700">
                                Product:
                              </span>{" "}
                              {p.productModel || p.itemCode || "Unknown"}
                            </div>
                            {p.productSegment && (
                              <div>
                                <span className="font-bold text-slate-700">
                                  Segment:
                                </span>{" "}
                                {p.productSegment}
                              </div>
                            )}
                            {p.serialNumber && (
                              <div>
                                <span className="font-bold text-slate-700">
                                  S/N:
                                </span>{" "}
                                {p.serialNumber}
                              </div>
                            )}
                            {p.errorCode && (
                              <div>
                                <span className="font-bold text-slate-700">
                                  Error:
                                </span>{" "}
                                {p.errorCode}
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="font-bold text-slate-700">
                                Description:
                              </span>{" "}
                              {p.callDescription || "No description"}
                            </div>
                            <div className="col-span-2 flex items-center gap-1.5 mt-1 text-sm">
                              <span className="font-bold text-slate-700">
                                Status:
                              </span>
                              <span className={`font-black ${statusColor}`}>
                                {finalStatus}
                              </span>
                            </div>

                            {finalStatus === "Resolved" && (
                              <div className="col-span-2 mt-2 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                                {(() => {
                                  const resolveEvent = p._history
                                    ?.slice()
                                    .reverse()
                                    .find(
                                      (h) =>
                                        h.status?.includes("Resolv") ||
                                        h.status === "Closed" ||
                                        h.status === "Completed",
                                    );
                                  const remarks =
                                    p._productClosure?.remarks ||
                                    p._productClosure?.solutionNotes ||
                                    resolveEvent?.remarks;
                                  const resolvedBy =
                                    p._productClosure?.closedByName ||
                                    resolveEvent?.updatedByName ||
                                    "Support Team";

                                  return (
                                    <div className="flex flex-col gap-1">
                                      <div className="text-xs text-emerald-800 font-bold">
                                        Resolved by: {resolvedBy}
                                      </div>
                                      {remarks && (
                                        <div className="text-xs text-slate-700 italic border-l-2 border-emerald-300 pl-2 mt-1">
                                          "{remarks}"
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};


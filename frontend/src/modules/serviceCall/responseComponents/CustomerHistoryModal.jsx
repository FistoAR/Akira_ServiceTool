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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[50vw] rounded-[1vw] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-slate-400"
      >
        <div className="bg-indigo-950 px-[1.4vw] py-[1vw] flex justify-between items-center border-b border-indigo-800">
          <div className="flex items-center gap-[0.6vw]">
            <History className="w-[1.2vw] h-[1.2vw] text-indigo-400" />
            <h3 className="text-[1vw] font-bold text-white">
              Service History: {identifier}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>

        <div className="p-[1.5vw] overflow-y-auto flex-1 bg-slate-50">
          {loading ? (
            <div className="flex justify-center p-[2vw]">
              <div className="w-[2vw] h-[2vw] border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-500 font-bold text-[0.9vw] p-[2vw]">
              No past service calls found for this customer.
            </div>
          ) : (
            <div className="flex flex-col gap-[1vw]">
              {history.map((call) => (
                <div
                  key={call._id}
                  className="bg-white border border-slate-300 rounded-[0.6vw] p-[1vw] shadow-sm"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-[0.5vw] mb-[0.6vw]">
                    <div className="flex items-center gap-[0.6vw]">
                      <span className="font-bold text-[0.9vw] text-slate-800">
                        Call ID : {call.callNumber}
                      </span>
                      <span className="text-[0.85vw] text-slate-700 bg-slate-100 px-[0.4vw] py-[0.1vw] rounded">
                        {new Date(call.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge
                      label={call.status}
                      color={call.status === "Resolved" ? "green" : "blue"}
                    />
                  </div>

                  <div className="flex flex-col gap-[0.8vw]">
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
                          className="bg-slate-50 border border-slate-200 p-[1vw] rounded-[0.5vw]"
                        >
                          <div className="grid grid-cols-2 gap-[0.8vw] text-[0.85vw] text-slate-700 leading-relaxed">
                            <div>
                              <span className="font-bold text-slate-500">
                                Product:
                              </span>{" "}
                              {p.productModel || p.itemCode || "Unknown"}
                            </div>
                            {p.productSegment && (
                              <div>
                                <span className="font-bold text-slate-500">
                                  Segment:
                                </span>{" "}
                                {p.productSegment}
                              </div>
                            )}
                            {p.serialNumber && (
                              <div>
                                <span className="font-bold text-slate-500">
                                  S/N:
                                </span>{" "}
                                {p.serialNumber}
                              </div>
                            )}
                            {p.errorCode && (
                              <div>
                                <span className="font-bold text-slate-500">
                                  Error:
                                </span>{" "}
                                {p.errorCode}
                              </div>
                            )}
                            <div className="col-span-2">
                              <span className="font-bold text-slate-500">
                                Description:
                              </span>{" "}
                              {p.callDescription || "No description"}
                            </div>
                            <div className="col-span-2 flex items-center gap-[0.4vw] mt-[0.2vw] text-[0.9vw]">
                              <span className="font-bold text-slate-500">
                                Status:
                              </span>
                              <span className={`font-black ${statusColor}`}>
                                {finalStatus}
                              </span>
                            </div>

                            {finalStatus === "Resolved" && (
                              <div className="col-span-2 mt-[0.5vw] bg-emerald-50/50 border border-emerald-100 rounded-[0.5vw] p-[0.8vw]">
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
                                    <div className="flex flex-col gap-[0.3vw]">
                                      <div className="text-[0.75vw] text-emerald-800 font-bold">
                                        Resolved by: {resolvedBy}
                                      </div>
                                      {remarks && (
                                        <div className="text-[0.8vw] text-slate-700 italic border-l-2 border-emerald-300 pl-[0.5vw] mt-[0.2vw]">
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


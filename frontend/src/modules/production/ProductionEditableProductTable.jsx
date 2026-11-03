import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  Search, 
  Plus,
  ChevronDown,
  Calendar,
  ScanBarcode,
  X
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const COLUMN_FIELDS = [
  "productDescription",
  "productCode",
  "productType",
  "boardType",
  "problemType",
  "ncType",
  "problem",
  "inspectedBy",
  "designators",
  "boardImage",
  "stage",
  "qty",
  "serialNumber",
  "disposition",
  "raisedTo",
  "assignedTo"
];

const DropdownPortal = ({ children, targetRect }) => {
  if (!targetRect) return null;
  const style = {
    position: 'fixed',
    top: targetRect.bottom + 4,
    left: targetRect.left,
    width: targetRect.width,
    zIndex: 9999,
  };
  return ReactDOM.createPortal(
    <div style={style} className="dropdown-portal-container">
      {children}
    </div>,
    document.body
  );
};

const ProductionEditableProductTable = ({ 
  products, 
  setProducts, 
  customerCode, 
  customerDb, 
  boardTypes = [],
  productTypeOptions = [],
  problemTypeOptions = [],
  employees = [],
  stageOptions = [],
  dispositionOptions = [],
  isReadOnly,
  allowPartialEdit,
  onDuplicate,
  onRemove
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const tableContainerRef = useRef(null);

  const [selection, setSelection] = useState(null); 
  const [isSelecting, setIsSelecting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('.dropdown-container')) return;
      if (event.target.closest('.description-input')) return;
      setActiveDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isReadOnly || !selection) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { startRow, endRow } = selection;
        const minR = Math.min(startRow, endRow);
        const maxR = Math.min(Math.max(startRow, endRow), products.length - 1);
        const newProducts = products.filter((_, idx) => idx < minR || idx > maxR);
        setProducts(newProducts);
        setSelection(null);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, products, isReadOnly]);

  const productsForCustomer = useMemo(() => {
    if (!customerCode || !customerDb) return [];
    const codeStr = String(customerCode);
    if (customerDb[codeStr]) return customerDb[codeStr];
    const flat = Array.isArray(customerDb) ? customerDb : Object.values(customerDb).flat();
    return flat.filter((r) => String(r.partyCode || r.party_code).toLowerCase() === codeStr.toLowerCase());
  }, [customerDb, customerCode]);

  const filteredProds = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return productsForCustomer.filter(
      (p) =>
        !s ||
        (p.itemDescription && p.itemDescription.toLowerCase().includes(s)) ||
        (p.itemCode && p.itemCode.toLowerCase().includes(s))
    );
  }, [productsForCustomer, searchTerm]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [filteredProds]);

  const onDragEnd = (result) => {
    if (!result.destination || isReadOnly) return;
    const items = Array.from(products);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setProducts(items);
    setSelection(null);
  };

  const handleUpdate = (id, field, value) => {
    if (isReadOnly) return;
    setProducts((prev) =>
      prev.map((p) => (p._pid === id ? { ...p, [field]: value } : p))
    );
  };

  const selectProduct = (id, p) => {
    setProducts(prev => prev.map(prod => 
      prod._pid === id ? {
        ...prod,
        productCode: p.itemCode || p.productCode || "",
        productDescription: p.itemDescription || p.productDescription || "",
      } : prod
    ));
    setActiveDropdown(null);
    setSearchTerm("");
  };

  const handleCellMouseDown = (rowIndex, colIndex, e) => {
    if (isReadOnly) return;
    if (e.target.closest('.dropdown-container')) return;

    if (e.shiftKey && selection) {
      setSelection(prev => ({ ...prev, endCol: colIndex, endRow: rowIndex }));
    } else {
      setSelection({
        startRow: rowIndex,
        startCol: colIndex,
        endRow: rowIndex,
        endCol: colIndex
      });
      setIsSelecting(true);
    }
  };

  const handleFillHandleMouseDown = (e) => {
    if (isReadOnly) return;
    e.stopPropagation();
    setIsFilling(true);
  };

  const handleCellMouseEnter = (rowIndex, colIndex) => {
    if (isSelecting) {
      setSelection(prev => ({
        ...prev,
        endCol: colIndex,
        endRow: rowIndex 
      }));
    } else if (isFilling) {
      setSelection(prev => ({
        ...prev,
        endRow: rowIndex,
        endCol: colIndex
      }));
    }
  };

  const handleMouseUp = () => {
    if (isFilling && selection) {
      const { startRow, startCol, endRow, endCol } = selection;
      const sourceRow = products[startRow];
      const minR = Math.min(startRow, endRow);
      const maxR = Math.max(startRow, endRow);
      const minC = Math.min(startCol, endCol);
      const maxC = Math.max(startCol, endCol);

      let newProducts = [...products];

      if (maxR >= products.length) {
        const rowsToAdd = maxR - products.length + 1;
        for (let i = 0; i < rowsToAdd; i++) {
          newProducts.push({
            ...sourceRow,
            _pid: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            serialNumber: "", 
            finalStatus: "Pending",
            report: null
          });
        }
      }

      const limitR = Math.min(maxR, products.length - 1);
      for (let r = minR; r <= limitR; r++) {
        if (r === startRow) continue; 
        for (let c = minC; c <= maxC; c++) {
          const field = COLUMN_FIELDS[c];
          if (field && field !== 'productCode' && field !== '_pid') {
            newProducts[r] = { ...newProducts[r], [field]: sourceRow[field] };
          }
        }
      }
      setProducts(newProducts);
    }
    setIsSelecting(false);
    setIsFilling(false);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      if (isFilling && selection && tableContainerRef.current) {
        const rect = tableContainerRef.current.getBoundingClientRect();
        if (e.clientY > rect.bottom) {
          const pixelsBelow = e.clientY - rect.bottom;
          const extraRows = Math.min(15, Math.floor(pixelsBelow / 40) + 1);
          setSelection(prev => ({
            ...prev,
            endRow: products.length + extraRows - 1
          }));
        } else if (e.clientY < rect.bottom) {
            const rowHeight = 40; 
            const yInTable = e.clientY - rect.top;
            const targetRow = Math.floor(yInTable / rowHeight);
            setSelection(prev => ({ ...prev, endRow: Math.max(0, targetRow) }));
        }
      }
    };
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isFilling, selection, products.length]);

  const getCellClass = (rowIndex, colIndex) => {
    if (!selection) return "border border-gray-300";
    const { startRow, startCol, endRow, endCol } = selection;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);
    if (rowIndex < minR || rowIndex > maxR || colIndex < minC || colIndex > maxC) return "border border-gray-300";
    let cls = "border border-blue-500 bg-blue-50/20 z-10";
    if (rowIndex === minR) cls += " border-t-2";
    if (rowIndex === maxR) cls += " border-b-2";
    if (colIndex === minC) cls += " border-l-2";
    if (colIndex === maxC) cls += " border-r-2";
    return cls;
  };

  const renderFillHandle = (rowIndex, colIndex) => {
    if (isReadOnly || !selection) return null;
    const { startRow, startCol, endRow, endCol } = selection;
    const maxR = Math.max(startRow, endRow);
    const maxC = Math.max(startCol, endCol);
    if (rowIndex === maxR && colIndex === maxC) {
      return (
        <div 
          data-fill-handle="true"
          onMouseDown={handleFillHandleMouseDown}
          className="absolute bottom-[-5px] right-[-5px] w-[10px] h-[10px] bg-blue-600 border-2 border-white cursor-crosshair z-[60] shadow-sm rounded-sm"
        />
      );
    }
    return null;
  };

  const openDropdown = (id, target) => {
    if (isReadOnly) return;
    const rect = target.getBoundingClientRect();
    setActiveDropdown({ id, rect });
    setSearchTerm("");
    setSelectedIndex(-1);
  };

  const handleDropdownKeyDown = (e, prodId) => {
    if (!activeDropdown || activeDropdown.id !== prodId || filteredProds.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredProds.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        e.preventDefault();
        selectProduct(prodId, filteredProds[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setActiveDropdown(null);
    }
  };

  return (
    <div 
      ref={tableContainerRef}
      className="w-full overflow-x-auto border border-slate-350 rounded-[0.6vw] bg-white mb-[1vw]"
    >
      <table className="w-full border-collapse text-[0.8vw]">
        <thead className="bg-blue-50/80 border-b border-gray-300 sticky top-0 z-20 shadow-sm">
          <tr>
            {!isReadOnly && <th className="w-[4vw] min-w-[60px] py-[0.8vw] px-[0.5vw]"></th>}
            <th className="w-[4vw] min-w-[60px] py-[0.8vw] px-[0.5vw] text-center text-black font-semibold uppercase tracking-wider whitespace-nowrap">#</th>
            <th className="min-w-[30vw] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Product Description</th>
            <th className="w-[12vw] min-w-[150px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Code</th>
            <th className="w-[10vw] min-w-[140px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Product Type</th>
            <th className="w-[12vw] min-w-[160px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Board Type</th>
            <th className="w-[12vw] min-w-[160px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Problem Type</th>
            <th className="w-[8vw] min-w-[120px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">NC Type</th>
            <th className="w-[15vw] min-w-[200px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Problem</th>
            <th className="w-[12vw] min-w-[160px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Inspected By</th>
            <th className="w-[12vw] min-w-[160px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Designators</th>
            <th className="w-[10vw] min-w-[140px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Board Image</th>
            <th className="w-[10vw] min-w-[140px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Stage</th>
            <th className="w-[7vw] min-w-[120px] py-[0.8vw] px-[0.8vw] text-center text-black font-semibold uppercase tracking-wider whitespace-nowrap">Qty</th>
            <th className="w-[12vw] min-w-[180px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Batch / SN</th>
            <th className="w-[10vw] min-w-[150px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Disposition</th>
            <th className="w-[12vw] min-w-[180px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Raised To (Stage)</th>
            <th className="w-[12vw] min-w-[180px] py-[0.8vw] px-[0.8vw] text-left text-black font-semibold uppercase tracking-wider whitespace-nowrap">Assigned To</th>
            {!isReadOnly && <th className="sticky right-0 w-[6vw] min-w-[100px] py-[0.8vw] px-[0.8vw] text-center text-black font-semibold uppercase tracking-wider whitespace-nowrap bg-blue-50 z-30 border-l border-gray-300 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>}
          </tr>
        </thead>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="products-list">
            {(provided) => (
              <tbody {...provided.droppableProps} ref={provided.innerRef}>
                {products.map((prod, index) => (
                  <Draggable 
                    key={prod._pid} 
                    draggableId={prod._pid} 
                    index={index}
                    isDragDisabled={isReadOnly || isSelecting || isFilling}
                  >
                    {(provided, snapshot) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border-b border-slate-300 last:border-0 hover:bg-blue-50/30 transition-colors ${snapshot.isDragging ? "bg-white shadow-lg ring-1 ring-blue-200 z-50 table" : ""}`}
                      >
                        {!isReadOnly && (
                          <td className="py-[0.6vw] px-[0.5vw] text-center align-middle" {...provided.dragHandleProps}>
                            <GripVertical className="w-[1vw] h-[1vw] text-gray-700 cursor-grab active:cursor-grabbing" />
                          </td>
                        )}
                        <td className="py-[0.6vw] px-[0.5vw] text-center align-middle font-regular  text-black border border-gray-300">
                          {index + 1}
                        </td>
                        
                        <td 
                          className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 0)}`}
                          onMouseDown={(e) => handleCellMouseDown(index, 0, e)}
                          onMouseEnter={() => handleCellMouseEnter(index, 0)}
                          onDoubleClick={(e) => openDropdown(prod._pid, e.currentTarget)}
                        >
                          <div className="relative flex items-center group h-full">
                            <input
                              type="text"
                              autoComplete="off"
                              value={activeDropdown?.id === prod._pid ? searchTerm : prod.productDescription}
                              onChange={(e) => {
                                if (activeDropdown?.id === prod._pid) {
                                  setSearchTerm(e.target.value);
                                } else {
                                  handleUpdate(prod._pid, "productDescription", e.target.value);
                                  handleUpdate(prod._pid, "productCode", "");
                                }
                              }}
                              onFocus={(e) => openDropdown(prod._pid, e.currentTarget.parentElement.parentElement)}
                              onClick={(e) => openDropdown(prod._pid, e.currentTarget.parentElement.parentElement)}
                              onKeyDown={(e) => handleDropdownKeyDown(e, prod._pid)}
                              placeholder={customerCode ? "Search or enter description..." : "Select customer first"}
                              disabled={!customerCode || isReadOnly}
                              className={`w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.6vw] outline-none transition-all text-black font-regular  disabled:bg-transparent cursor-text description-input`}
                            />
                            {!isReadOnly && customerCode && (
                              <Search className="w-[0.8vw] h-[0.8vw] text-gray-700 absolute right-[0.6vw] pointer-events-none group-focus-within:text-blue-500" />
                            )}
                          </div>
                          {renderFillHandle(index, 0)}
                          
                          {activeDropdown?.id === prod._pid && (
                            <DropdownPortal targetRect={activeDropdown.rect}>
                              <div className="bg-white border-2 border-blue-500 shadow-2xl rounded-[0.4vw] max-h-[15vw] overflow-y-auto dropdown-container">
                                {!customerCode ? (
                                    <div className="p-[1vw] text-center text-red-500 font-regular  text-[0.8vw]">Please select a customer first.</div>
                                ) : filteredProds.length > 0 ? (
                                  filteredProds.map((p, i) => (
                                    <div
                                      key={i}
                                      onMouseDown={(e) => {
                                          e.preventDefault(); 
                                          e.stopPropagation();
                                          selectProduct(prod._pid, p);
                                      }}
                                      className={`p-[0.6vw] cursor-pointer border-b border-slate-300 last:border-0 transition-colors ${selectedIndex === i ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}
                                    >
                                      <div className={`font-semibold text-[0.8vw] ${selectedIndex === i ? "text-white" : "text-gray-900"}`}>{p.itemDescription || p.productDescription}</div>
                                      <div className={`text-[0.7vw] flex items-center gap-[0.4vw] mt-[0.1vw] ${selectedIndex === i ? "text-white/80" : "text-gray-700"}`}>
                                        <span className={`px-[0.3vw] rounded font-mono border ${selectedIndex === i ? "bg-white/20 border-white/30" : "bg-gray-100 border-slate-350"}`}>{p.itemCode || p.productCode}</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-[1vw] text-center text-gray-700 font-medium italic">No products found for {customerCode}</div>
                                )}
                              </div>
                            </DropdownPortal>
                          )}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative ${getCellClass(index, 1)}`} onMouseDown={(e) => handleCellMouseDown(index, 1, e)} onMouseEnter={() => handleCellMouseEnter(index, 1)}>
                          <div className="text-black px-[0.6vw] py-[0.4vw] rounded-[0.3vw] font-regular  text-[0.75vw]">{prod.productCode || "—"}</div>
                          {renderFillHandle(index, 1)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 2)}`} onMouseDown={(e) => handleCellMouseDown(index, 2, e)} onMouseEnter={() => handleCellMouseEnter(index, 2)}>
                          <select
                            value={prod.productType || ""}
                            onChange={(e) => handleUpdate(prod._pid, "productType", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {productTypeOptions.map(pt => (
                              <option key={pt} value={pt}>{pt}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 2)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 3)}`} onMouseDown={(e) => handleCellMouseDown(index, 3, e)} onMouseEnter={() => handleCellMouseEnter(index, 3)}>
                          <select
                            value={prod.boardType || ""}
                            onChange={(e) => handleUpdate(prod._pid, "boardType", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {boardTypes.map(bt => (
                              <option key={bt.id || bt._id} value={bt.name}>{bt.name}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 3)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 4)}`} onMouseDown={(e) => handleCellMouseDown(index, 4, e)} onMouseEnter={() => handleCellMouseEnter(index, 4)}>
                          <select
                            value={prod.problemType || ""}
                            onChange={(e) => handleUpdate(prod._pid, "problemType", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {problemTypeOptions.map(pt => (
                              <option key={pt} value={pt}>{pt}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 4)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 5)}`} onMouseDown={(e) => handleCellMouseDown(index, 5, e)} onMouseEnter={() => handleCellMouseEnter(index, 5)}>
                          <select
                            value={prod.ncType || "Internal"}
                            onChange={(e) => handleUpdate(prod._pid, "ncType", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-bold text-blue-600 disabled:bg-transparent"
                          >
                            <option value="Internal">Internal</option>
                            <option value="External">External</option>
                          </select>
                          {renderFillHandle(index, 5)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 6)}`} onMouseDown={(e) => handleCellMouseDown(index, 6, e)} onMouseEnter={() => handleCellMouseEnter(index, 6)}>
                          <div className="relative flex items-center group">
                            <input type="text" autoComplete="off" value={prod.problem || ""} onChange={(e) => handleUpdate(prod._pid, "problem", e.target.value)} placeholder="Problem Description" disabled={isReadOnly} className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.6vw] outline-none transition-all text-black font-regular  disabled:bg-transparent" />
                          </div>
                          {renderFillHandle(index, 6)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 7)}`} onMouseDown={(e) => handleCellMouseDown(index, 7, e)} onMouseEnter={() => handleCellMouseEnter(index, 7)}>
                          <select
                            value={prod.inspectedBy || ""}
                            onChange={(e) => {
                              const emp = employees.find(emp => emp.userId === e.target.value);
                              handleUpdate(prod._pid, "inspectedBy", e.target.value);
                              handleUpdate(prod._pid, "inspectedByName", emp?.name || "");
                            }}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {employees.map(e => (
                              <option key={e.userId} value={e.userId}>{e.name}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 7)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 8)}`} onMouseDown={(e) => handleCellMouseDown(index, 8, e)} onMouseEnter={() => handleCellMouseEnter(index, 8)}>
                          <input
                            type="text"
                            value={prod.designators || ""}
                            onChange={(e) => handleUpdate(prod._pid, "designators", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular disabled:bg-transparent"
                            placeholder="Designator..."
                          />
                          {renderFillHandle(index, 8)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 9)}`} onMouseDown={(e) => handleCellMouseDown(index, 9, e)} onMouseEnter={() => handleCellMouseEnter(index, 9)}>
                           <div className="flex flex-col items-center gap-[0.4vw]">
                             {prod.boardImage && (
                               <div className="relative group">
                                 <img 
                                   src={prod.boardImage.startsWith('data:') || prod.boardImage.startsWith('blob:') ? prod.boardImage : `${import.meta.env.VITE_API_URL}${prod.boardImage}`} 
                                   alt="Board" 
                                   className="w-[2.5vw] h-[2.5vw] object-cover rounded-[0.3vw] border border-gray-300"
                                 />
                                 {!isReadOnly && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleUpdate(prod._pid, "boardImage", ""); handleUpdate(prod._pid, "_boardImageFile", null); }}
                                     className="absolute -top-[0.4vw] -right-[0.4vw] bg-red-500 text-white rounded-full p-[0.1vw] opacity-0 group-hover:opacity-100 transition-opacity"
                                   >
                                     <X className="w-[0.6vw] h-[0.6vw]" />
                                   </button>
                                 )}
                               </div>
                             )}
                             {!isReadOnly && !prod.boardImage && (
                               <label className="cursor-pointer hover:text-blue-600 transition-colors">
                                 <Plus className="w-[1.2vw] h-[1.2vw]" />
                                 <input 
                                   type="file" 
                                   className="hidden" 
                                   accept="image/*"
                                   onChange={(e) => {
                                     const file = e.target.files[0];
                                     if (file) {
                                       const reader = new FileReader();
                                       reader.onloadend = () => {
                                         handleUpdate(prod._pid, "boardImage", reader.result);
                                         handleUpdate(prod._pid, "_boardImageFile", file);
                                       };
                                       reader.readAsDataURL(file);
                                     }
                                   }}
                                 />
                               </label>
                             )}
                           </div>
                           {renderFillHandle(index, 9)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 10)}`} onMouseDown={(e) => handleCellMouseDown(index, 10, e)} onMouseEnter={() => handleCellMouseEnter(index, 10)}>
                          <select
                            value={prod.stage || ""}
                            onChange={(e) => handleUpdate(prod._pid, "stage", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {stageOptions.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 10)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 11)}`} onMouseDown={(e) => handleCellMouseDown(index, 11, e)} onMouseEnter={() => handleCellMouseEnter(index, 11)}>
                          <input type="number" min="1" value={prod.qty} onChange={(e) => handleUpdate(prod._pid, "qty", e.target.value)} disabled={isReadOnly} className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.6vw] outline-none transition-all text-black font-regular  text-center disabled:bg-transparent" />
                          {renderFillHandle(index, 11)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 12)}`} onMouseDown={(e) => handleCellMouseDown(index, 12, e)} onMouseEnter={() => handleCellMouseEnter(index, 12)}>
                          <div className="relative flex items-center group">
                            <input 
                              type="text" 
                              autoComplete="off" 
                              value={prod.serialNumber || ""} 
                              onChange={(e) => handleUpdate(prod._pid, "serialNumber", e.target.value)} 
                              placeholder="SN-XXXX" 
                              disabled={isReadOnly} 
                              className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.6vw] pr-[2.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent" 
                            />
                            {!isReadOnly && (
                              <button type="button" className="absolute right-[0.4vw] p-[0.3vw] text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
                                <ScanBarcode className="w-[1vw] h-[1vw]" />
                              </button>
                            )}
                          </div>
                          {renderFillHandle(index, 12)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 13)}`} onMouseDown={(e) => handleCellMouseDown(index, 13, e)} onMouseEnter={() => handleCellMouseEnter(index, 13)}>
                          <select
                            value={prod.disposition || ""}
                            onChange={(e) => handleUpdate(prod._pid, "disposition", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {dispositionOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 13)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 14)}`} onMouseDown={(e) => handleCellMouseDown(index, 14, e)} onMouseEnter={() => handleCellMouseEnter(index, 14)}>
                          <select
                            value={prod.raisedTo || ""}
                            onChange={(e) => handleUpdate(prod._pid, "raisedTo", e.target.value)}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select Stage</option>
                            {stageOptions.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 14)}
                        </td>

                        <td className={`py-[0.6vw] px-[0.8vw] relative transition-all ${getCellClass(index, 15)}`} onMouseDown={(e) => handleCellMouseDown(index, 15, e)} onMouseEnter={() => handleCellMouseEnter(index, 15)}>
                          <select
                            value={prod.assignedTo || ""}
                            onChange={(e) => {
                              const emp = employees.find(emp => emp.userId === e.target.value);
                              handleUpdate(prod._pid, "assignedTo", e.target.value);
                              handleUpdate(prod._pid, "assignedToName", emp?.name || "");
                            }}
                            disabled={isReadOnly}
                            className="w-full bg-transparent border-none rounded-[0.3vw] py-[0.4vw] px-[0.2vw] outline-none transition-all text-black font-regular  disabled:bg-transparent"
                          >
                            <option value="">Select</option>
                            {employees.filter(e => e.role === "User").map(e => (
                              <option key={e.userId} value={e.userId}>{e.name}</option>
                            ))}
                          </select>
                          {renderFillHandle(index, 15)}
                        </td>

                        {!isReadOnly && (
                          <td className="sticky right-0 py-[0.6vw] px-[0.8vw] border border-gray-300 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-start gap-[0.5vw]">
                              <button type="button" onClick={() => onDuplicate(prod)} className="p-[0.4vw] text-blue-500 hover:bg-blue-100 rounded-[0.3vw] transition-colors"><Copy className="w-[1vw] h-[1vw]" /></button>
                              <button type="button" onClick={() => onRemove(prod._pid)} className="p-[0.4vw] text-red-500 hover:bg-red-100 rounded-[0.3vw] transition-colors"><Trash2 className="w-[1vw] h-[1vw]" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )}
                  </Draggable>
                ))}
                
                {isFilling && selection && selection.endRow >= products.length && (
                   <tr className="bg-blue-50/20 border-b-2 border-blue-400">
                     <td colSpan={10} className="py-[1vw] text-center text-blue-700 font-bold italic text-[0.8vw] bg-blue-100/50">
                        + Release mouse to add {selection.endRow - products.length + 1} new duplicate rows
                     </td>
                   </tr>
                )}

                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </DragDropContext>
      </table>
    </div>
  );
};

export default ProductionEditableProductTable;

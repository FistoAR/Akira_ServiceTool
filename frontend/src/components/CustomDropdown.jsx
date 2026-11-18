import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { Icon } from "@iconify/react";

/**
 * CustomDropdown
 * A flexible, production-grade custom dropdown for the application.
 *
 * Supports:
 * - Single-select or Multi-select mode (`multiple` prop)
 * - Optional inline search filtering (`searchable` prop)
 * - Option formats: primitives `['Admin', 'User']` or objects `[{ value: '1', label: 'One', icon: 'solar:...', badge: '...', description: '...' }]`
 * - Clearable selection (`clearable` prop)
 * - Custom icons, avatars/images, badges, descriptions
 * - Floating portal / outside-click dismissal
 * - Responsive sizing using viewport units or standard Tailwind classes
 * - Disabled state & error state
 */
const CustomDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select an option...",
  label,
  error,
  helperText,
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search...",
  multiple = false,
  clearable = false,
  icon,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  optionClassName = "",
  size = "md", // "sm" | "md" | "lg"
  align = "left", // "left" | "right"
  placement = "auto", // "bottom" | "top" | "auto"
  maxHeight = "230px",
  renderOption,
  renderValue,
  isOpen: controlledIsOpen,
  onOpenChange,
  usePortal = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (nextState) => {
    const resolved = typeof nextState === "function" ? nextState(isOpen) : nextState;
    if (!isControlled) {
      setInternalIsOpen(resolved);
    }
    onOpenChange?.(resolved);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);
  const [actualPlacement, setActualPlacement] = useState(placement === "top" ? "top" : "bottom");

  const [menuCoords, setMenuCoords] = useState(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let place = placement;
    if (placement === "auto") {
      place = (spaceBelow < 170 && spaceAbove > spaceBelow) ? "top" : "bottom";
    }
    setActualPlacement(place);
    setMenuCoords({
      top: place === "top" ? rect.top - 4 : rect.bottom + 4,
      left: align === "right" ? rect.right : rect.left,
      width: rect.width,
      isTop: place === "top"
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = (e) => {
        if (e.target && (e.target.closest?.('[data-custom-dropdown-menu]') || e.target.closest?.('.custom-dropdown-menu'))) return;
        updatePosition();
      };
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, placement, align]);

  // Normalize options into `{ value, label, icon, badge, description, image, disabled }`
  const normalizedOptions = useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { value: opt, label: String(opt) };
      }
      return {
        value: opt.value ?? opt.id ?? opt._id ?? opt.name,
        label: opt.label ?? opt.name ?? String(opt.value),
        icon: opt.icon,
        image: opt.image || opt.profilePicture || opt.avatar,
        badge: opt.badge,
        badgeColor: opt.badgeColor,
        description: opt.description,
        disabled: opt.disabled,
        raw: opt,
      };
    });
  }, [options]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(q) ||
        (typeof opt.value === "string" && opt.value.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Selected option(s) lookup
  const selectedOptions = useMemo(() => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : value ? [value] : [];
      return normalizedOptions.filter((opt) => arr.includes(opt.value));
    }
    return normalizedOptions.find((opt) => opt.value === value) || null;
  }, [normalizedOptions, value, multiple]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-custom-dropdown-menu]')) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset or initialize highlighted option when menu opens/closes or filtered options change
  useEffect(() => {
    if (isOpen) {
      if (!multiple && value !== undefined && value !== null && value !== "") {
        const idx = filteredOptions.findIndex((opt) => opt.value === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      } else {
        setHighlightedIndex(0);
      }
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions, value, multiple]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsListRef.current) {
      const items = optionsListRef.current.querySelectorAll("[data-dropdown-item]");
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Focus search input or trigger when opened
  useEffect(() => {
    if (isOpen) {
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (triggerRef.current && document.activeElement !== triggerRef.current) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen, searchable]);

  // Keyboard navigation handler (Up/Down arrow, Enter, Space, Escape, Tab)
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      let nextIdx = highlightedIndex < 0 ? 0 : highlightedIndex + 1;
      while (nextIdx < filteredOptions.length && filteredOptions[nextIdx].disabled) {
        nextIdx++;
      }
      if (nextIdx < filteredOptions.length) {
        setHighlightedIndex(nextIdx);
        if (!multiple) {
          onChange?.(filteredOptions[nextIdx].value, filteredOptions[nextIdx]);
        }
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      let nextIdx = highlightedIndex < 0 ? filteredOptions.length - 1 : highlightedIndex - 1;
      while (nextIdx >= 0 && filteredOptions[nextIdx].disabled) {
        nextIdx--;
      }
      if (nextIdx >= 0) {
        setHighlightedIndex(nextIdx);
        if (!multiple) {
          onChange?.(filteredOptions[nextIdx].value, filteredOptions[nextIdx]);
        }
      }
      return;
    }

    if (e.key === "Enter" || (!searchable && e.key === " ")) {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const opt = filteredOptions[highlightedIndex];
        if (opt && !opt.disabled) {
          handleSelect(opt);
        }
      }
    }
  };

  // Size variations
  const sizeClasses = {
    sm: {
      trigger: "py-1 px-2 text-sm rounded-md min-h-[24px]",
      icon: "w-3 h-3",
      arrow: "w-3 h-3",
      option: "py-1 px-2 text-sm",
      badge: "text-xs px-1 py-px",
    },
    md: {
      trigger: "py-1.5 px-3 text-xs rounded-md min-h-[30px]",
      icon: "w-3.5 h-3.5",
      arrow: "w-3 h-3",
      option: "py-1.5 px-2.5 text-xs",
      badge: "text-sm px-1.5 py-px",
    },
    lg: {
      trigger: "py-2 px-3.5 text-sm rounded-md min-h-[36px]",
      icon: "w-4 h-4",
      arrow: "w-3.5 h-3.5",
      option: "py-2 px-3 text-sm",
      badge: "text-sm px-2 py-px",
    },
  }[size] || {
    trigger: "py-1.5 px-3 text-xs rounded-md",
    icon: "w-3.5 h-3.5",
    arrow: "w-3 h-3",
    option: "py-1.5 px-2.5 text-xs",
    badge: "text-sm px-1.5 py-px",
  };

  const handleSelect = (opt) => {
    if (opt.disabled) return;

    if (multiple) {
      const current = Array.isArray(value) ? value : value ? [value] : [];
      const exists = current.includes(opt.value);
      const next = exists ? current.filter((v) => v !== opt.value) : [...current, opt.value];
      onChange?.(next, opt);
    } else {
      onChange?.(opt.value, opt);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : "", null);
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (multiple) {
      const allVals = normalizedOptions.filter((o) => !o.disabled).map((o) => o.value);
      const allSelected = allVals.length > 0 && allVals.every((v) => (value || []).includes(v));
      onChange?.(allSelected ? [] : allVals);
    }
  };

  const isOptionSelected = (opt) => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : value ? [value] : [];
      return arr.includes(opt.value);
    }
    return value === opt.value;
  };

  return (
    <div className={`relative flex flex-col ${className}`} ref={containerRef}>
      {/* Optional Label */}
      {label && (
        <label className="text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          {multiple && clearable && Array.isArray(value) && value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-normal underline"
            >
              Clear
            </button>
          )}
        </label>
      )}

      {/* Dropdown Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full bg-white border flex items-center justify-between gap-2 text-left transition-all shadow-none select-none cursor-pointer ${
          sizeClasses.trigger
        } ${
          disabled
            ? "bg-gray-100 text-gray-700 border-gray-200 cursor-not-allowed"
            : error
            ? "border-rose-400 focus:border-rose-500 ring-2 ring-rose-100"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10"
            : "border-gray-300 hover:border-gray-400 text-gray-800"
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {/* Leading Icon */}
          {icon && (
            <Icon
              icon={icon}
              className={`${sizeClasses.icon} text-gray-700 flex-shrink-0`}
            />
          )}

          {/* Trigger Content */}
          {renderValue ? (
            renderValue(selectedOptions)
          ) : multiple ? (
            <span className="truncate">
              {Array.isArray(selectedOptions) && selectedOptions.length > 0 ? (
                <span className="font-normal text-slate-700">
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : `${selectedOptions.length} items selected`}
                </span>
              ) : (
                <span className="text-gray-700 font-normal">{placeholder}</span>
              )}
            </span>
          ) : selectedOptions ? (
            <div className="flex items-center gap-1.5 truncate">
              {selectedOptions.image && (
                <img
                  src={selectedOptions.image}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
              )}
              {selectedOptions.icon && (
                <Icon
                  icon={selectedOptions.icon}
                  className={`${sizeClasses.icon} text-blue-600 flex-shrink-0`}
                />
              )}
              <span className="truncate font-normal text-slate-700">
                {selectedOptions.label}
              </span>
              {selectedOptions.badge && (
                <span
                  className={`rounded font-medium flex-shrink-0 ${sizeClasses.badge} ${
                    selectedOptions.badgeColor || "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {selectedOptions.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-700 font-normal truncate">{placeholder}</span>
          )}
        </div>

        {/* Trailing Controls: Clear button and Caret */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && !disabled && (multiple ? (value && value.length > 0) : (value !== undefined && value !== "" && value !== null)) && (
            <span
              onClick={handleClear}
              className="p-px hover:bg-gray-100 rounded-full text-gray-700 hover:text-gray-600 transition-colors"
              title="Clear selection"
            >
              <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
            </span>
          )}
          <Icon
            icon="solar:alt-arrow-down-linear"
            className={`${sizeClasses.arrow} text-gray-700 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Helper / Error Text */}
      {(error || helperText) && (
        <span
          className={`text-sm mt-1 ${
            error ? "text-rose-500 font-medium" : "text-gray-700"
          }`}
        >
          {error || helperText}
        </span>
      )}

      {/* Floating Menu Dropdown */}
      {isOpen && (() => {
        const menuContent = (
          <div
            data-custom-dropdown-menu="true"
            style={usePortal && menuCoords ? {
              position: "fixed",
              top: menuCoords.isTop ? undefined : menuCoords.top,
              bottom: menuCoords.isTop ? (window.innerHeight - menuCoords.top) : undefined,
              left: align === "right" ? undefined : menuCoords.left,
              right: align === "right" ? (window.innerWidth - menuCoords.left) : undefined,
              minWidth: menuCoords.width,
              zIndex: 99999,
            } : undefined}
            className={`${usePortal ? "fixed" : `absolute ${actualPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1"} ${align === "right" ? "right-0" : "left-0"} w-full`} z-[99999] min-w-44 bg-white border border-gray-200 rounded-md shadow-xl py-1 animate-in fade-in-50 zoom-in-95 duration-100 ${menuClassName}`}
          >
          {/* Search Box */}
          {searchable && (
            <div className="px-2 py-1.5 border-b border-gray-100">
              <div className="relative flex items-center">
                <Icon
                  icon="solar:magnifer-linear"
                  className="w-3.5 h-3.5 text-gray-700 absolute left-[8px] pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-6.5 pr-2.5 py-1 text-xs border border-gray-200 rounded-md outline-none focus:border-blue-500 bg-gray-50/50"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-[6px] text-gray-700 hover:text-gray-600"
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Multi-select Quick Actions */}
              {multiple && (
                <div className="flex items-center justify-between pt-1 px-1 text-sm">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  {Array.isArray(value) && value.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-gray-700 hover:text-rose-600 cursor-pointer"
                    >
                      Clear ({value.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            ref={optionsListRef}
            className="overflow-y-auto space-y-px px-1"
            style={{ maxHeight }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const selected = isOptionSelected(opt);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={String(opt.value)}
                    data-dropdown-item
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between gap-1.5 rounded-md transition-colors cursor-pointer ${
                      sizeClasses.option
                    } ${
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed bg-gray-50 text-gray-700"
                        : selected
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : isHighlighted
                        ? "bg-slate-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    } ${optionClassName}`}
                  >
                    {renderOption ? (
                      renderOption(opt, { selected, isHighlighted })
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                          {/* Checkbox for multi-select */}
                          {multiple && (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {}}
                              className="w-3 h-3 rounded border-gray-300 text-blue-600 pointer-events-none cursor-pointer"
                            />
                          )}

                          {/* Avatar Image */}
                          {opt.image && (
                            <img
                              src={opt.image}
                              alt=""
                              className="w-4.5 h-4.5 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            />
                          )}

                          {/* Leading Option Icon */}
                          {opt.icon && (
                            <Icon
                              icon={opt.icon}
                              className={`${sizeClasses.icon} text-gray-700 flex-shrink-0`}
                            />
                          )}

                          {/* Label & Description */}
                          <div className="flex flex-col truncate">
                            <span className="truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="text-sm text-gray-700 font-normal truncate">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Trailing: Badge or Checkmark */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {opt.badge && (
                            <span
                              className={`rounded font-medium ${sizeClasses.badge} ${
                                opt.badgeColor ||
                                "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}

                          {!multiple && selected && (
                            <Icon
                              icon="solar:check-read-linear"
                              className={`${sizeClasses.icon} text-blue-600`}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-3 px-2.5 text-center text-gray-700 text-xs">
                No options found
              </div>
            )}
          </div>
        </div>
        );
        return usePortal ? ReactDOM.createPortal(menuContent, document.body) : menuContent;
      })()}
    </div>
  );
};

export default CustomDropdown;




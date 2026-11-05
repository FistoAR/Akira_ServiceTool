import React, { useState, useRef, useEffect, useMemo } from "react";
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
  maxHeight = "16vw",
  renderOption,
  renderValue,
  isOpen: controlledIsOpen,
  onOpenChange,
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
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen, searchable]);

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

  // Size variations
  const sizeClasses = {
    sm: {
      trigger: "py-[0.25vw] px-[0.55vw] text-[0.72vw] rounded-[0.3vw] min-h-[1.7vw]",
      icon: "w-[0.8vw] h-[0.8vw]",
      arrow: "w-[0.75vw] h-[0.75vw]",
      option: "py-[0.25vw] px-[0.55vw] text-[0.72vw]",
      badge: "text-[0.62vw] px-[0.3vw] py-[0.05vw]",
    },
    md: {
      trigger: "py-[0.38vw] px-[0.75vw] text-[0.78vw] rounded-[0.35vw] min-h-[2.1vw]",
      icon: "w-[0.95vw] h-[0.95vw]",
      arrow: "w-[0.85vw] h-[0.85vw]",
      option: "py-[0.38vw] px-[0.65vw] text-[0.78vw]",
      badge: "text-[0.66vw] px-[0.4vw] py-[0.08vw]",
    },
    lg: {
      trigger: "py-[0.5vw] px-[0.9vw] text-[0.85vw] rounded-[0.4vw] min-h-[2.5vw]",
      icon: "w-[1.1vw] h-[1.1vw]",
      arrow: "w-[1vw] h-[1vw]",
      option: "py-[0.5vw] px-[0.8vw] text-[0.85vw]",
      badge: "text-[0.72vw] px-[0.5vw] py-[0.1vw]",
    },
  }[size] || {
    trigger: "py-[0.38vw] px-[0.75vw] text-[0.78vw] rounded-[0.35vw]",
    icon: "w-[0.95vw] h-[0.95vw]",
    arrow: "w-[0.85vw] h-[0.85vw]",
    option: "py-[0.38vw] px-[0.65vw] text-[0.78vw]",
    badge: "text-[0.66vw] px-[0.4vw] py-[0.08vw]",
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
        <label className="text-[0.76vw] font-medium text-gray-700 mb-[0.25vw] flex items-center justify-between">
          <span>{label}</span>
          {multiple && clearable && Array.isArray(value) && value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[0.68vw] text-blue-600 hover:text-blue-800 cursor-pointer font-normal underline"
            >
              Clear
            </button>
          )}
        </label>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-white border flex items-center justify-between gap-[0.5vw] text-left transition-all shadow-none select-none cursor-pointer ${
          sizeClasses.trigger
        } ${
          disabled
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : error
            ? "border-rose-400 focus:border-rose-500 ring-2 ring-rose-100"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/10"
            : "border-gray-300 hover:border-gray-400 text-gray-800"
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-[0.45vw] truncate flex-1 min-w-0">
          {/* Leading Icon */}
          {icon && (
            <Icon
              icon={icon}
              className={`${sizeClasses.icon} text-gray-400 flex-shrink-0`}
            />
          )}

          {/* Trigger Content */}
          {renderValue ? (
            renderValue(selectedOptions)
          ) : multiple ? (
            <span className="truncate">
              {Array.isArray(selectedOptions) && selectedOptions.length > 0 ? (
                <span className="font-medium text-gray-900">
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : `${selectedOptions.length} items selected`}
                </span>
              ) : (
                <span className="text-gray-400 font-normal">{placeholder}</span>
              )}
            </span>
          ) : selectedOptions ? (
            <div className="flex items-center gap-[0.4vw] truncate">
              {selectedOptions.image && (
                <img
                  src={selectedOptions.image}
                  alt=""
                  className="w-[1.2vw] h-[1.2vw] rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
              )}
              {selectedOptions.icon && (
                <Icon
                  icon={selectedOptions.icon}
                  className={`${sizeClasses.icon} text-blue-600 flex-shrink-0`}
                />
              )}
              <span className="truncate font-medium text-gray-900">
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
            <span className="text-gray-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        {/* Trailing Controls: Clear button and Caret */}
        <div className="flex items-center gap-[0.3vw] flex-shrink-0">
          {clearable && !disabled && (multiple ? (value && value.length > 0) : (value !== undefined && value !== "" && value !== null)) && (
            <span
              onClick={handleClear}
              className="p-[0.1vw] hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear selection"
            >
              <Icon icon="solar:close-circle-bold" className="w-[0.85vw] h-[0.85vw]" />
            </span>
          )}
          <Icon
            icon="solar:alt-arrow-down-linear"
            className={`${sizeClasses.arrow} text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Helper / Error Text */}
      {(error || helperText) && (
        <span
          className={`text-[0.7vw] mt-[0.2vw] ${
            error ? "text-rose-500 font-medium" : "text-gray-500"
          }`}
        >
          {error || helperText}
        </span>
      )}

      {/* Floating Menu Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 top-full mt-[0.3vw] w-full min-w-[12vw] bg-white border border-gray-200 rounded-[0.45vw] shadow-xl py-[0.3vw] animate-in fade-in-50 zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
        >
          {/* Search Box */}
          {searchable && (
            <div className="px-[0.5vw] py-[0.35vw] border-b border-gray-100">
              <div className="relative flex items-center">
                <Icon
                  icon="solar:magnifer-linear"
                  className="w-[0.9vw] h-[0.9vw] text-gray-400 absolute left-[0.55vw] pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-[1.8vw] pr-[0.6vw] py-[0.3vw] text-[0.76vw] border border-gray-200 rounded-[0.3vw] outline-none focus:border-blue-500 bg-gray-50/50"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-[0.4vw] text-gray-400 hover:text-gray-600"
                  >
                    <Icon icon="solar:close-circle-bold" className="w-[0.75vw] h-[0.75vw]" />
                  </button>
                )}
              </div>

              {/* Multi-select Quick Actions */}
              {multiple && (
                <div className="flex items-center justify-between pt-[0.3vw] px-[0.2vw] text-[0.7vw]">
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
                      className="text-gray-500 hover:text-rose-600 cursor-pointer"
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
            className="overflow-y-auto space-y-[0.1vw] px-[0.3vw]"
            style={{ maxHeight }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const selected = isOptionSelected(opt);

                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt)}
                    className={`flex items-center justify-between gap-[0.4vw] rounded-[0.3vw] transition-colors cursor-pointer ${
                      sizeClasses.option
                    } ${
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed bg-gray-50 text-gray-400"
                        : selected
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    } ${optionClassName}`}
                  >
                    {renderOption ? (
                      renderOption(opt, { selected })
                    ) : (
                      <>
                        <div className="flex items-center gap-[0.45vw] truncate flex-1 min-w-0">
                          {/* Checkbox for multi-select */}
                          {multiple && (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {}}
                              className="w-[0.85vw] h-[0.85vw] rounded border-gray-300 text-blue-600 pointer-events-none cursor-pointer"
                            />
                          )}

                          {/* Avatar Image */}
                          {opt.image && (
                            <img
                              src={opt.image}
                              alt=""
                              className="w-[1.25vw] h-[1.25vw] rounded-full object-cover border border-gray-200 flex-shrink-0"
                            />
                          )}

                          {/* Leading Option Icon */}
                          {opt.icon && (
                            <Icon
                              icon={opt.icon}
                              className={`${sizeClasses.icon} text-gray-500 flex-shrink-0`}
                            />
                          )}

                          {/* Label & Description */}
                          <div className="flex flex-col truncate">
                            <span className="truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="text-[0.66vw] text-gray-400 font-normal truncate">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Trailing: Badge or Checkmark */}
                        <div className="flex items-center gap-[0.3vw] flex-shrink-0">
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
              <div className="py-[0.8vw] px-[0.6vw] text-center text-gray-400 text-[0.76vw]">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;


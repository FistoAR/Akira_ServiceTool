import React, { useState, useEffect, useRef, useMemo } from "react";

export default function AutocompleteInput({
  value = "",
  onChange,
  suggestions = [],
  placeholder = "",
  className = "",
  required = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value) return (suggestions || []).slice(0, 15);
    const lower = String(value).toLowerCase();
    return (suggestions || [])
      .filter((s) => String(s).toLowerCase().includes(lower))
      .slice(0, 15);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [filtered]);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filtered.length) {
          onChange(filtered[selectedIndex]);
          setOpen(false);
          setFocused(false);
          setSelectedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setFocused(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const showDropdown = focused && open && filtered.length > 0;

  return (
    <div ref={ref} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        required={required}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
      />
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-400 rounded-[0.4vw] shadow-lg max-h-[14vw] overflow-y-auto">
          {filtered.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
                setFocused(false);
                setSelectedIndex(-1);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`px-[0.7vw] py-[0.4vw] text-[0.81vw] cursor-pointer transition-colors ${
                i === selectedIndex
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-800 hover:bg-gray-50"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

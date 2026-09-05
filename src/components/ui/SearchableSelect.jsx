import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, X, Check, SearchX } from "lucide-react";

/**
 * Normalizes Arabic text for flexible and resilient search:
 * - Removes tashkeel / harakat
 * - Normalizes Alef forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbouta (ة -> ه)
 * - Normalizes Yaa / Alef Maqsoura (ى -> ي)
 */
export function normalizeArabic(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove harakat
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function SearchableSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "-- اختر من القائمة --",
  searchPlaceholder = "اكتب للبحث...",
  emptyMessage = "لا يوجد نتائج مماثلة",
  noOptionsMessage = "-- لا توجد عناصر متاحة --",
  disabled = false,
  required = false,
  allowClear = true,
  onManualSelect,
  manualLabel = "➕ إدخال المعرّف (UUID) يدوياً...",
  className = "",
  inputClassName = "",
  icon: Icon,
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find(
      (opt) => String(opt.value) === String(value) || String(opt.id) === String(value)
    );
  }, [options, value]);

  // Keep inputValue in sync with external value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption ? selectedOption.label : "");
    }
  }, [selectedOption, isOpen]);

  // Filtered options based on user typing
  const filteredOptions = useMemo(() => {
    if (!options || options.length === 0) return [];

    const query = inputValue.trim();

    // If query is empty or unchanged from the selected option label, show all options
    if (!query || (selectedOption && query === selectedOption.label)) {
      return options;
    }

    const normQuery = normalizeArabic(query);

    return options.filter((opt) => {
      const normLabel = normalizeArabic(opt.label || "");
      const normSubtext = normalizeArabic(opt.subtext || "");
      const normVal = String(opt.value || "").toLowerCase();

      return (
        normLabel.includes(normQuery) ||
        normSubtext.includes(normQuery) ||
        normVal.includes(normQuery)
      );
    });
  }, [options, inputValue, selectedOption]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handlePointerDownOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        // Reset input value back to selected label if user typed something unselected
        setInputValue(selectedOption ? selectedOption.label : "");
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDownOutside);
      document.addEventListener("touchstart", handlePointerDownOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isOpen, selectedOption]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (
      isOpen &&
      highlightedIndex >= 0 &&
      listRef.current &&
      listRef.current.children[highlightedIndex]
    ) {
      listRef.current.children[highlightedIndex].scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option) => {
    setInputValue(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onChange) {
      onChange(option.value, option);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputValue("");
    setHighlightedIndex(-1);
    if (onChange) {
      onChange("", null);
    }
    // Keep focus and open full list
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setInputValue(selectedOption ? selectedOption.label : "");
      setHighlightedIndex(-1);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-right ${className}`}
      dir="rtl"
    >
      {/* Hidden input for native HTML form required validation */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        value={value || ""}
        onChange={() => {}}
        className="sr-only opacity-0 pointer-events-none absolute w-0 h-0"
      />

      {/* Input container */}
      <div
        className={`relative flex items-center bg-white border rounded-xl transition-all duration-150 shadow-sm ${
          disabled
            ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-75"
            : isOpen
            ? "border-teal-500 ring-2 ring-teal-500/20 shadow-md"
            : "border-slate-300 hover:border-slate-400"
        } ${inputClassName}`}
      >
        {/* Optional Leading Icon */}
        {Icon && (
          <div className="pr-3 pl-1 flex items-center pointer-events-none text-slate-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {/* Text Input */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          disabled={disabled}
          value={inputValue}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full bg-transparent py-2 px-3 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none ${
            Icon ? "pr-1" : "pr-3"
          } pl-16 truncate`}
        />

        {/* Action buttons (Clear and Dropdown Toggle) */}
        <div className="absolute left-2.5 flex items-center gap-1 shrink-0 text-slate-400">
          {allowClear && !disabled && (value || inputValue) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="تفريغ الحقل"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (isOpen) {
                setIsOpen(false);
                setInputValue(selectedOption ? selectedOption.label : "");
              } else {
                setIsOpen(true);
                if (inputRef.current) inputRef.current.focus();
              }
            }}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-transform"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-teal-600" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 text-xs"
          >
            {/* When options are available and filtered items exist */}
            {filteredOptions.length > 0 &&
              filteredOptions.map((opt, index) => {
                const isSelected =
                  selectedOption &&
                  (String(opt.value) === String(selectedOption.value) ||
                    String(opt.id) === String(selectedOption.id));
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={opt.value ?? opt.id ?? index}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-teal-50 text-teal-900 font-bold"
                        : isHighlighted
                        ? "bg-slate-50 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-relaxed">
                        {opt.label}
                      </span>
                      {opt.subtext && (
                        <span className="text-[10px] text-slate-400 font-mono truncate">
                          {opt.subtext}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-teal-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}

            {/* When user typed something but nothing matches */}
            {options.length > 0 && filteredOptions.length === 0 && (
              <div className="py-5 px-4 text-center text-xs flex flex-col items-center justify-center gap-1.5 text-slate-500">
                <SearchX className="w-5 h-5 text-slate-400 stroke-1" />
                <span className="font-bold text-slate-700 text-xs">
                  {emptyMessage}
                </span>
                <span className="text-[11px] text-slate-400">
                  تأكد من صحة الكلمة المكتوبة أو ابحث بكلمة أخرى
                </span>
              </div>
            )}

            {/* When options list itself is completely empty */}
            {options.length === 0 && (
              <div className="py-4 px-3 text-center text-xs text-slate-400 font-medium">
                {noOptionsMessage}
              </div>
            )}
          </div>

          {/* Optional bottom button: Manual UUID entry */}
          {onManualSelect && (
            <div
              onClick={() => {
                setIsOpen(false);
                onManualSelect();
              }}
              className="border-t border-slate-100 bg-slate-50 hover:bg-teal-50 text-teal-700 hover:text-teal-800 font-bold text-xs p-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span>{manualLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

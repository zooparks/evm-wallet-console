"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Sub2API 风格自定义下拉选择框
 * Options may be strings or { value, label } objects.
 */
export default function Select({ options, value, onChange, placeholder, className = "" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
  const selectedOption = normalizedOptions.find((option) => option.value === value);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-900 transition-all ${
          open
            ? "border-teal-600 ring-2 ring-teal-600/30"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className="flex-1 truncate text-left">{selectedOption?.label || placeholder || t("Select")}</span>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M7.4 8.6L6 10l6 6 6-6-1.4-1.4L12 12.2 7.4 8.6z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <div className="max-h-60 overflow-y-auto">
            {normalizedOptions.map((option) => {
              const selected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange && onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors ${
                    selected ? "bg-teal-50 font-medium text-teal-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                      <path d="M9 16.2l-3.5-3.5L4 14.1l5 5 11-11-1.4-1.4L9 16.2z" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

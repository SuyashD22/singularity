"use client";

import React, { useState, useRef, useEffect } from "react";

export interface Option {
  value: string;
  label: string;
  badge?: string;
}

interface NexusSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function NexusSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: NexusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left select-none ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-[42px] flex items-center justify-between gap-2 px-3.5 text-[0.82rem] font-medium rounded transition-all cursor-pointer box-border"
        style={{
          backgroundColor: "#222120",
          border: isOpen ? "1.5px solid #c8f135" : "1.5px solid #2E2C2B",
          color: selectedOption ? "#F0EDE8" : "#888580",
          boxShadow: isOpen ? "0 0 0 2px rgba(200, 241, 53, 0.25)" : "none",
          outline: "none",
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'var(--font-sans, "Space Grotesk", sans-serif)',
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-[#c8f135]" : "text-[#888580]"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 mt-1.5 z-50 rounded overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: "#1A1918",
            border: "1.5px solid #2E2C2B",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(200, 241, 53, 0.2)",
            maxHeight: "260px",
            overflowY: "auto",
            fontFamily: 'var(--font-sans, "Space Grotesk", sans-serif)',
          }}
        >
          <div className="py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[0.82rem] font-medium text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[rgba(200,241,53,0.12)] text-[#c8f135]"
                      : "text-[#888580] hover:bg-[#222120] hover:text-[#F0EDE8]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <span className="ml-2 text-[#c8f135] shrink-0 font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

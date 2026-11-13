"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Accessible name, for example "Filter by status". */
  ariaLabel: string;
  icon?: IconType;
  /** Which side of the trigger the list opens on. Use "top" near the bottom of the page. */
  placement?: "bottom" | "top";
  /** "field" is a bordered input-style control. "inline" is plain text, for use inside a sentence or footer. */
  variant?: "field" | "inline";
  disabled?: boolean;
  className?: string;
}

/**
 * A styled single-choice dropdown (listbox) that replaces the browser's native select list.
 * Mouse: click to open, click an option, click outside to close.
 * Keyboard: Enter, Space or Arrow keys open it; Arrow keys, Home and End move; Enter or Space choose;
 * Escape or Tab close it.
 */
export function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  icon: Icon,
  placement = "bottom",
  variant = "field",
  disabled = false,
  className = "",
}: DropdownProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel = options[selectedIndex]?.label ?? "";
  const optionId = (index: number) => `${listId}-option-${index}`;

  const openList = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  // Click outside closes the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the keyboard-active option visible when the list scrolls.
  useEffect(() => {
    if (open) {
      document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex, listId]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const triggerClass =
    variant === "field"
      ? `neo-input flex h-10 w-full cursor-pointer items-center gap-2 whitespace-nowrap pl-3 pr-2.5 text-sm font-medium text-foreground outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-primary" : ""
        }`
      : "flex cursor-pointer items-center gap-1 whitespace-nowrap bg-transparent py-1 font-bold text-foreground outline-none focus-visible:underline disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={triggerClass}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
        {/* The trigger is as wide as the longest option, so choosing another option never changes its
            width (and never shifts the layout around it). The extra labels are invisible and unannounced. */}
        <span className="grid flex-1 text-left">
          <span className="col-start-1 row-start-1">{selectedLabel}</span>
          {options.map((option) => (
            <span
              key={option.value}
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 h-0 overflow-hidden"
            >
              {option.label}
            </span>
          ))}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 z-30 max-h-64 w-max min-w-full max-w-[min(20rem,90vw)] overflow-y-auto rounded-xl border-2 border-line bg-surface p-1 shadow-[3px_3px_0px_var(--shadow-color)] ${
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.map((option, index) => {
            const selected = index === selectedIndex;
            const active = index === activeIndex;
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                // Keep focus on the trigger so the keyboard keeps working after a mouse click.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center justify-between gap-6 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-foreground ${
                  active ? "bg-primary/15" : selected ? "bg-surface-2" : ""
                } ${selected ? "font-bold" : "font-medium"}`}
              >
                <span>{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

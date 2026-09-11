"use client";
import type { ReactNode } from "react";
export function ViewTabs<T extends string>({
  id,
  label,
  panelId,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  panelId?: string;
  items: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="view-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          type="button"
          role="tab"
          key={item.value}
          id={`${id}-tab-${item.value}`}
          aria-controls={panelId ?? `${id}-panel-${item.value}`}
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % items.length;
            else if (event.key === "ArrowLeft")
              next = (index + items.length - 1) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else return;
            event.preventDefault();
            onChange(items[next].value);
            document.getElementById(`${id}-tab-${items[next].value}`)?.focus();
          }}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="count">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
export function ViewPanel({
  id,
  value,
  selected,
  children,
}: {
  id: string;
  value: string;
  selected: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${id}-panel-${value}`}
      aria-labelledby={`${id}-tab-${value}`}
      tabIndex={0}
      hidden={selected !== value}
    >
      {children}
    </div>
  );
}

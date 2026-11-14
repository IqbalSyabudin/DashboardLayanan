import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Dropdown custom bertema merah (pengganti <select> bawaan browser,
 * karena daftar opsi <select> native tidak bisa diberi warna).
 *
 * options: [{ value, label }]
 * onChange: (value) => void
 */
export default function RedSelect({
  value,
  onChange,
  options = [],
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];

  // tutup saat klik di luar / tekan Escape
  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
          open ? "border-brand-600" : "border-slate-300"
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-full w-max overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`cursor-pointer whitespace-nowrap px-3 py-2 text-xs ${
                  active
                    ? "bg-brand-600 font-semibold text-white"
                    : "text-slate-700 hover:bg-brand-50 hover:text-brand-600"
                }`}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

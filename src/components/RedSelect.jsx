import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Dropdown custom bertema merah (pengganti <select> bawaan browser,
 * karena daftar opsi <select> native tidak bisa diberi warna).
 *
 * options: [{ value, label }]
 * onChange: (value) => void
 * className: kelas untuk pembungkus (mis. lebar: "xl:w-64")
 * buttonClassName: (opsional) mengganti tampilan tombol (tinggi, warna, padding)
 * idleBorder: (opsional) warna border saat tertutup, default border-slate-300
 */
const DEFAULT_BUTTON_LOOK = "bg-slate-50 px-3 py-2 font-medium text-slate-700";

export default function RedSelect({
  value,
  onChange,
  options = [],
  className = "",
  buttonClassName = DEFAULT_BUTTON_LOOK,
  idleBorder = "border-slate-300",
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];

  // posisi menu dihitung dari tombol (fixed) supaya tidak terpotong
  // oleh container yang punya overflow-hidden
  function toggle() {
    if (open) return setOpen(false);
    const r = btnRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 180 && above > below;
    setPos(
      up
        ? { left: r.left, minWidth: r.width, maxWidth: window.innerWidth - r.left - 16, bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(256, above) }
        : { left: r.left, minWidth: r.width, maxWidth: window.innerWidth - r.left - 16, top: r.bottom + 4, maxHeight: Math.min(256, below) }
    );
    setOpen(true);
  }

  // tutup saat klik di luar / Escape / scroll halaman / resize
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll(e) {
      if (listRef.current && listRef.current.contains(e.target)) return;
      setOpen(false);
    }
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 ${buttonClassName} ${
          open ? "border-brand-600" : idleBorder
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && pos && (
        <ul
          ref={listRef}
          role="listbox"
          style={pos}
          className="fixed z-50 w-max overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={active}
                onClick={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`cursor-pointer px-3 py-2 text-xs ${
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

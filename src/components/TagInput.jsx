
import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { apiRequest } from "../services/api";

// ============================================================
// NORMALISASI KATA KUNCI
// ============================================================

function normalizeKeyword(value = "") {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function keywordKey(value = "") {
  return normalizeKeyword(value).toLocaleLowerCase("id-ID");
}

// ============================================================
// TAG INPUT + AUTOCOMPLETE
// ============================================================

export default function TagInput({
  tags = [],
  onChange,
  placeholder = "Ketik kata kunci..."
}) {

  const [value, setValue] = useState("");

  const [suggestions, setSuggestions] = useState([]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  // ==========================================================
  // AMBIL SARAN DARI DATABASE
  // ==========================================================

  useEffect(() => {

    const keyword = normalizeKeyword(value);

    if (keyword.length < 2) {

      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);

      return;
    }

    let active = true;

    const timer = setTimeout(async () => {

      try {

        setLoadingSuggestions(true);

        const params = new URLSearchParams({
          search: keyword,
          keyword_only: "true",
          page: "1",
          limit: "100"
        });

        const result = await apiRequest(
          `/layanan-keyword?${params.toString()}`
        );

        if (!active) return;

        const rows = Array.isArray(result?.data)
          ? result.data
          : [];

        const seen = new Set();

        const filtered = rows
          .map((item) => item?.keyword)
          .filter(Boolean)
          .map(normalizeKeyword)
          .filter((item) => {

            const key = keywordKey(item);

            // Harus sesuai dengan input pengguna
            if (!key.includes(keywordKey(keyword))) {
              return false;
            }

            // Jangan tampilkan keyword yang sudah dipilih
            if (
              tags.some(
                (tag) => keywordKey(tag) === key
              )
            ) {
              return false;
            }

            // Hindari data duplikat
            if (seen.has(key)) {
              return false;
            }

            seen.add(key);

            return true;

          })
          .slice(0, 8);

        setSuggestions(filtered);
        setActiveIndex(0);
        setShowSuggestions(true);

      } catch (error) {

        console.error(
          "Gagal mengambil saran kata kunci:",
          error
        );

        if (active) {
          setSuggestions([]);
          setShowSuggestions(false);
        }

      } finally {

        if (active) {
          setLoadingSuggestions(false);
        }

      }

    }, 250);

    return () => {

      active = false;

      clearTimeout(timer);

    };

  }, [value, tags]);

  // ==========================================================
  // TAMBAH TAG
  // ==========================================================

  function addTag(inputValue = value) {

    const newTag = normalizeKeyword(inputValue);

    if (!newTag) return;

    const exists = tags.some(
      (tag) =>
        keywordKey(tag) === keywordKey(newTag)
    );

    if (!exists) {

      onChange([
        ...tags,
        newTag
      ]);

    }

    setValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(0);

  }

  // ==========================================================
  // PILIH SARAN
  // ==========================================================

  function selectSuggestion(keyword) {

    addTag(keyword);

  }

  // ==========================================================
  // HAPUS TAG
  // ==========================================================

  function removeTag(keyword) {

    onChange(
      tags.filter(
        (tag) => tag !== keyword
      )
    );

  }

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  function handleKeyDown(e) {

    if (
      e.key === "ArrowDown" &&
      suggestions.length > 0
    ) {

      e.preventDefault();

      setShowSuggestions(true);

      setActiveIndex((current) =>
        Math.min(
          current + 1,
          suggestions.length - 1
        )
      );

      return;
    }

    if (
      e.key === "ArrowUp" &&
      suggestions.length > 0
    ) {

      e.preventDefault();

      setActiveIndex((current) =>
        Math.max(current - 1, 0)
      );

      return;
    }

    if (e.key === "Escape") {

      setShowSuggestions(false);

      return;
    }

    if (e.key === "Enter") {

      e.preventDefault();

      if (
        showSuggestions &&
        suggestions[activeIndex]
      ) {

        selectSuggestion(
          suggestions[activeIndex]
        );

      } else {

        addTag();

      }

      return;
    }

    if (e.key === ",") {

      e.preventDefault();

      addTag();

      return;
    }

    if (
      e.key === "Backspace" &&
      !value &&
      tags.length > 0
    ) {

      onChange(tags.slice(0, -1));

    }

  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="relative w-full">

      {/* INPUT DAN TAG */}

      <div
        className="
          flex flex-wrap
          items-center
          gap-1.5
          rounded-md
          border border-slate-300
          bg-white
          px-2 py-2
          focus-within:ring-2
          focus-within:ring-brand-400
        "
      >

        {/* TAG YANG SUDAH DIPILIH */}

        {tags.map((tag) => (

          <span
            key={tag}
            className="
              flex items-center
              gap-1
              rounded-md
              bg-slate-200
              px-2 py-1
              text-xs
              text-slate-600
            "
          >

            {tag}

            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="
                text-slate-400
                hover:text-red-600
              "
              aria-label={`Hapus ${tag}`}
            >

              <X size={11} />

            </button>

          </span>

        ))}

        {/* INPUT KATA KUNCI */}

        <input
          type="text"
          value={value}
          onChange={(e) => {

            setValue(e.target.value);

          }}
          onFocus={() => {

            if (
              suggestions.length > 0 ||
              value.length >= 2
            ) {

              setShowSuggestions(true);

            }

          }}
          onBlur={() => {

            if (value.trim()) {
              addTag();
            }

            setShowSuggestions(false);

          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            min-w-[140px]
            flex-1
            border-none
            bg-transparent
            py-1
            text-xs
            text-slate-600
            placeholder:text-slate-400
            focus:outline-none
          "
        />

      </div>

      {/* DROPDOWN SARAN */}

      {showSuggestions && value.trim().length >= 2 && (

        <div
          className="
            absolute
            left-0
            top-full
            z-50
            mt-1
            w-full
            overflow-hidden
            rounded-lg
            border border-slate-200
            bg-white
            shadow-lg
          "
        >

          {/* LOADING */}

          {loadingSuggestions && (

            <div
              className="
                flex items-center
                justify-center
                gap-2
                px-4 py-4
                text-xs
                text-slate-400
              "
            >

              <span
                className="
                  h-4 w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-slate-200
                  border-t-red-600
                "
              />

              Mencari kata kunci...

            </div>

          )}

          {/* HASIL SARAN */}

          {!loadingSuggestions && suggestions.length > 0 && (

            <>

              <div
                className="
                  border-b
                  border-slate-100
                  px-3 py-2
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-400
                "
              >

                Saran dari database

              </div>

              <div className="max-h-52 overflow-y-auto">

                {suggestions.map((keyword, index) => (

                  <button
                    key={keyword}
                    type="button"
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() =>
                      selectSuggestion(keyword)
                    }
                    className={`
                      flex w-full
                      items-center
                      justify-between
                      px-3 py-2.5
                      text-left
                      text-xs
                      transition
                      ${
                        activeIndex === index
                          ? "bg-red-50 text-red-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }
                    `}
                  >

                    <span>{keyword}</span>

                    <span className="text-slate-400">

                      <PlusIcon />

                    </span>

                  </button>

                ))}

              </div>

            </>

          )}

          {/* TIDAK ADA HASIL */}

          {!loadingSuggestions &&
            suggestions.length === 0 && (

            <div
              className="
                px-4 py-3
                text-xs
                text-slate-400
              "
            >

              Tidak ditemukan kata kunci yang sesuai.
              Tekan Enter untuk menambahkan kata kunci baru.

            </div>

          )}

        </div>

      )}

    </div>

  );

}

// ============================================================
// ICON PLUS
// ============================================================

function PlusIcon() {

  return (

    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >

      <path d="M12 5v14" />
      <path d="M5 12h14" />

    </svg>

  );

}

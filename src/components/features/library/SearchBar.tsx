'use client'

import { SearchIcon, XIcon } from '@/components/ui/icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

/** Keyword search input for the library. */
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="rounded-btn border-ink/10 bg-ink/[0.03] flex items-center gap-2 border px-3">
      <SearchIcon size={18} className="text-muted" />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your ideas"
        aria-label="Search your ideas"
        className="placeholder:text-muted h-11 w-full bg-transparent text-[15px] outline-none"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="text-muted p-1"
        >
          <XIcon size={16} />
        </button>
      ) : null}
    </div>
  )
}

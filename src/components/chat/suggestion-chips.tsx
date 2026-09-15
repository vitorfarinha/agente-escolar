"use client";

export function SuggestionChips({ suggestions, onSelect }: { suggestions: string[]; onSelect: (text: string) => void }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mx-auto mb-6 flex w-full max-w-2xl gap-2 overflow-x-auto px-4 pb-1" role="list">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          role="listitem"
          onClick={() => onSelect(suggestion)}
          className="shrink-0 whitespace-nowrap rounded-full border border-subtle bg-surface-card px-3.5 py-2 text-sm text-secondary shadow-sm transition hover:border-brand-900 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

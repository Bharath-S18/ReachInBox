import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, RotateCw, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { SearchResult } from '../../types';

interface TopSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  onSelectSuggestion?: (item: SearchResult) => void;
  suggestions?: SearchResult[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  searchSource?: string | null;
  isSearching?: boolean;
  onClear?: () => void;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  onSelectSuggestion,
  suggestions = [],
  onRefresh,
  isRefreshing,
  searchSource,
  isSearching,
  onClear,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsDropdownOpen(false);
      onSubmit(value.trim());
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsDropdownOpen(false);
    if (onClear) onClear();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim() || !text) return text;
    const trimmed = query.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === trimmed.toLowerCase() ? (
        <span key={i} className="bg-[#fef08a] text-[#713f12] font-semibold px-0.5 rounded-xs">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const showDropdown = isDropdownOpen && value.trim().length > 0 && suggestions.length > 0;

  return (
    <div className="flex items-center gap-3 w-full py-2.5 px-6 border-b border-gray-100 bg-white relative z-30 select-none">
      {/* Search Input Container */}
      <div className="flex-1 max-w-2xl relative" ref={containerRef}>
        <div
          className={`flex items-center w-full bg-[#f2f6fc] rounded-full px-4 py-2 text-sm text-gray-800 transition-all border ${
            isDropdownOpen
              ? 'bg-white shadow-md border-gray-200 ring-2 ring-[#0b57d0]/20'
              : 'border-transparent hover:bg-[#e9eef6]'
          }`}
        >
          <Search className="w-4 h-4 text-gray-500 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (value.trim()) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search mail (press Enter for all results)..."
            className="w-full bg-transparent border-0 p-0 text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
          />

          {isSearching && (
            <span className="text-[11px] text-gray-400 mr-2 shrink-0 animate-pulse">
              Searching...
            </span>
          )}

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-400 hover:text-gray-700 ml-2 px-1.5 py-0.5 rounded hover:bg-gray-200/60 transition shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* 5-item Search Suggestions Dropdown (Screenshot behavior) */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 text-xs animate-in fade-in duration-100 divide-y divide-gray-100">
            <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/70 flex items-center justify-between">
              <span>Top 5 Matches</span>
              <span className="font-normal text-gray-400 lowercase">press enter for all</span>
            </div>

            <div className="divide-y divide-gray-50">
              {suggestions.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onSelectSuggestion) {
                      onSelectSuggestion(item);
                    } else {
                      onSubmit(value);
                    }
                  }}
                  className="px-3.5 py-2.5 hover:bg-[#f2f6fc] cursor-pointer flex items-center justify-between gap-3 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-50 text-gray-500 group-hover:text-[#0b57d0] flex items-center justify-center shrink-0 transition">
                      {item.status === 'SENT' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {highlightMatch(item.recipientEmail, value)}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        <span className="font-medium text-gray-700 mr-1">
                          {highlightMatch(item.subject || '(no subject)', value)}
                        </span>
                        <span className="text-gray-400">
                          - {highlightMatch((item.body || '').replace(/<[^>]*>?/gm, '').slice(0, 50), value)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-medium text-gray-400 px-1.5 py-0.5 rounded bg-gray-100 group-hover:bg-blue-100 group-hover:text-blue-700 transition shrink-0">
                    {item.status || 'Email'}
                  </span>
                </div>
              ))}
            </div>

            {/* View All Option */}
            <div
              onClick={() => {
                setIsDropdownOpen(false);
                onSubmit(value.trim());
              }}
              className="px-3.5 py-2 bg-gray-50/80 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs text-[#0b57d0] font-semibold transition"
            >
              <span>See all results for &ldquo;{value}&rdquo;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>

      {/* Search Engine Source Badge */}
      {value && searchSource && (
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border border-gray-200 bg-gray-50 text-gray-600 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              searchSource === 'ELASTICSEARCH' ? 'bg-sky-500' : 'bg-[#0b57d0]'
            }`}
          />
          {searchSource === 'ELASTICSEARCH' ? 'Elasticsearch v8' : 'Database Search'}
        </span>
      )}

      {/* Action Buttons: Filter & Refresh */}
      <div className="flex items-center gap-1.5 text-gray-500 shrink-0">
        <button
          title="Filter"
          className="p-2 rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 active:scale-95"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          onClick={onRefresh}
          title="Refresh Data"
          disabled={isRefreshing}
          className="p-2 rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 active:scale-95 disabled:opacity-50"
        >
          <RotateCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0b57d0]' : ''}`}
          />
        </button>
      </div>
    </div>
  );
};

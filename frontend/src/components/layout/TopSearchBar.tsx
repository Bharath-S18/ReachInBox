import React from 'react';
import { Search, Filter, RotateCw } from 'lucide-react';

interface TopSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  searchSource?: string | null;
  isSearching?: boolean;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  value,
  onChange,
  onRefresh,
  isRefreshing,
  searchSource,
  isSearching,
}) => {
  return (
    <div className="flex items-center gap-3 w-full py-3 px-6 border-b border-gray-100 bg-white">
      {/* Search Input Container */}
      <div className="flex-1 max-w-xl relative">
        <div className="flex items-center w-full bg-[#f4f6f5] rounded-full px-4 py-2 text-sm text-gray-800 transition focus-within:ring-2 focus-within:ring-[#0b57d0] focus-within:bg-white border border-transparent focus-within:border-gray-200">
          <Search className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search emails by subject, recipient, or body..."
            className="w-full bg-transparent border-0 p-0 text-sm placeholder-gray-400 focus:outline-none"
          />
          {isSearching && (
            <span className="text-[11px] text-gray-400 mr-2 animate-pulse">Searching...</span>
          )}
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-xs text-gray-400 hover:text-gray-600 ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search Engine Source Badge */}
      {value && searchSource && (
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border border-gray-200 bg-gray-50 text-gray-600">
          <span className={`w-1.5 h-1.5 rounded-full ${searchSource === 'ELASTICSEARCH' ? 'bg-sky-500' : 'bg-[#0b57d0]'}`} />
          {searchSource === 'ELASTICSEARCH' ? 'Elasticsearch v8' : 'Database Search'}
        </span>
      )}

      {/* Action Buttons: Filter & Refresh */}
      <div className="flex items-center gap-2 text-gray-500">
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
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0b57d0]' : ''}`} />
        </button>
      </div>
    </div>
  );
};

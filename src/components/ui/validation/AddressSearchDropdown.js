// components/ui/validation/AddressSearchDropdown.js
// Reusable address search dropdown with autocomplete

import React from 'react';

const AddressSearchDropdown = ({ 
  results = [], 
  onSelect, 
  isVisible = false,
  maxResults = 10,
  loading = false 
}) => {
  if (!isVisible || (!results.length && !loading)) {
    return null;
  }

  const displayResults = results.slice(0, maxResults);

  return (
    <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-64 overflow-y-auto">
      {loading && (
        <div className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          Searching addresses...
        </div>
      )}
      
      {displayResults.length > 0 && (
        <>
          <div className="px-4 py-2 text-xs text-gray-500 border-b bg-gray-50">
            {results.length} address{results.length !== 1 ? 'es' : ''} found
          </div>
          {displayResults.map((address, index) => (
            <button
              key={address.Id || index}
              type="button"
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
              onClick={() => onSelect(address)}
            >
              <div className="font-medium text-gray-900">
                {address.Text}
              </div>
              {address.Description && (
                <div className="text-xs text-gray-600 mt-1">
                  {address.Description}
                </div>
              )}
            </button>
          ))}
        </>
      )}
      
      {!loading && results.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">
          No addresses found
        </div>
      )}
    </div>
  );
};

export default AddressSearchDropdown;
// components/ui/validation/ValidationSpinner.js
// Reusable loading spinner for validation states

import React from 'react';

const ValidationSpinner = ({ message = 'Validating...', size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center gap-2 text-gray-600">
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 ${sizeClasses[size]}`} />
      <span className="text-sm">{message}</span>
    </div>
  );
};

export default ValidationSpinner;
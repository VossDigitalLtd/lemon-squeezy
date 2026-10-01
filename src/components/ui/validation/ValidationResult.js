// components/ui/validation/ValidationResult.js
// Reusable component for displaying validation results

import React from 'react';

const ValidationResult = ({ result, type = 'default', showIcon = true }) => {
  if (!result) return null;

  const getResultDisplay = () => {
    switch (type) {
      case 'email':
        if (result.valid) {
          return {
            message: `Email verified - ${result.details?.provider || 'Valid'}`,
            variant: 'success'
          };
        } else {
          return {
            message: result.error || 'Email address invalid',
            variant: 'error'
          };
        }

      case 'phone':
        if (result.valid) {
          return {
            message: `Phone verified${result.formatted ? ` - ${result.formatted}` : ''}`,
            variant: 'success'
          };
        } else {
          return {
            message: result.error || 'Phone number not found',
            variant: 'error'
          };
        }

      case 'vehicle':
        if (result.valid && result.vehicle) {
          return {
            message: `Vehicle found: ${result.vehicle.description}`,
            variant: 'success'
          };
        } else {
          return {
            message: result.error || 'Vehicle not found',
            variant: 'error'
          };
        }

      default:
        return {
          message: result.message || (result.valid ? 'Validation successful' : 'Validation failed'),
          variant: result.valid ? 'success' : 'error'
        };
    }
  };

  const { message, variant } = getResultDisplay();

  const variantClasses = {
    success: 'text-green-700 bg-green-50 border-green-200',
    error: 'text-red-700 bg-red-50 border-red-200',
    warning: 'text-yellow-700 bg-yellow-50 border-yellow-200'
  };

  const iconClasses = {
    success: '✓',
    error: '✗',
    warning: '⚠'
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm ${variantClasses[variant]}`}>
      {showIcon && <span className="font-semibold">{iconClasses[variant]}</span>}
      <span>{message}</span>
    </div>
  );
};

export default ValidationResult;
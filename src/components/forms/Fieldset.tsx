// components/forms/Fieldset.tsx
import { ReactNode } from 'react';

interface FieldsetProps {
  legend?: string;
  hint?: string;
  children: ReactNode;
}

const Fieldset = ({ legend, hint, children }: FieldsetProps) => {
  return (
    <fieldset className="border border-gray-200 rounded-lg p-4">
      {legend && (
        <legend className="text-sm font-medium text-gray-900 px-2 -ml-2">{legend}</legend>
      )}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <div className="space-y-4 mt-3 first:mt-0">{children}</div>
    </fieldset>
  );
};

export default Fieldset;

'use client';

import { useEffect } from 'react';

/** Opens the <details> list named in the URL hash (e.g. #todo-photo from the dashboard) */
export function OpenHashDetails() {
  useEffect(() => {
    const open = () => {
      const el = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}

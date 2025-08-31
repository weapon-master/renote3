import React from 'react';

export default function BookShelfIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-label="Bookshelf icon"
      role="img"
      style={{
        height: '2rem',
      }}
    >
      <line x1="4" y1="45" x2="44" y2="45" stroke="#999" stroke-width="1.5" />

      <rect x="8" y="20" width="5" height="24" rx="1" fill="#999" />
      <rect x="15" y="18" width="4" height="26" rx="1" fill="#666" />
      <rect x="21" y="21" width="3.5" height="23" rx="1" fill="#bbb" />
      <rect x="26" y="19" width="5" height="25" rx="1" fill="#888" />
      <rect x="33" y="20" width="4" height="24" rx="1" fill="#555" />
    </svg>
  );
}

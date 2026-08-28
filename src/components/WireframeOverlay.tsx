import { useState } from 'react';

interface WireframeProps {
  enabled?: boolean;
  children: React.ReactNode;
}

export function WireframeOverlay({ enabled = false, children }: WireframeProps) {
  const [showGrid, setShowGrid] = useState(enabled);

  if (!showGrid) return <>{children}</>;

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none z-50 grid grid-cols-12 gap-4 px-4 opacity-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-blue-500 h-full" />
        ))}
      </div>
      {children}
      <button
        onClick={() => setShowGrid(false)}
        className="fixed bottom-4 right-4 z-[60] bg-blue-600 text-white text-xs px-3 py-1 rounded"
      >
        Hide Grid
      </button>
    </div>
  );
}

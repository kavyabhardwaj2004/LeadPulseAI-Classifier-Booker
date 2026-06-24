import React, { useEffect, useState } from 'react';

export default function RadarLoader({ onComplete }) {
  const [dots, setDots] = useState([]);
  
  useEffect(() => {
    // Generate random dots representing "leads discovered" during the sweep
    const interval = setInterval(() => {
      setDots(prev => [
        ...prev,
        {
          id: Math.random(),
          top: `${Math.random() * 80 + 10}%`,
          left: `${Math.random() * 80 + 10}%`,
        }
      ]);
    }, 450);

    const timer = setTimeout(() => {
      clearInterval(interval);
      if (onComplete) onComplete();
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div className="radar-overlay">
      <div className="radar-circle">
        <div className="radar-sweep"></div>
        {dots.map(dot => (
          <div
            key={dot.id}
            className="radar-dot"
            style={{ top: dot.top, left: dot.left }}
          />
        ))}
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-bold font-display text-emerald-400 tracking-wider mb-2 animate-pulse">
          Scanning for hot leads...
        </h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Analyzing 100+ channels across email, CRM data, and LinkedIn leads
        </p>
      </div>
    </div>
  );
}

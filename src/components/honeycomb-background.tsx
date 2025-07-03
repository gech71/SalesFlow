'use client';

import React, { useState, useEffect, useMemo } from 'react';

export function HoneycombBackground() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hexagons = useMemo(() => {
    if (!isMounted) return [];

    const hex = [];
    const hexSize = 50;
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Add padding to cover edges
    const cols = Math.ceil(screenWidth / (hexWidth * 0.75)) + 2;
    const rows = Math.ceil(screenHeight / hexHeight) + 2;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        let cx = col * hexWidth * 0.75;
        let cy = row * hexHeight;
        // Offset every other column
        if (col % 2 !== 0) {
            cy += hexHeight / 2;
        }

        const points = [];
        for (let i = 0; i < 6; i++) {
            // Start at 30 degrees to make it pointy-topped
            const angleDeg = 60 * i + 30; 
            const angleRad = (Math.PI / 180) * angleDeg;
            const xPoint = cx + hexSize * Math.cos(angleRad);
            const yPoint = cy + hexSize * Math.sin(angleRad);
            points.push(`${xPoint},${yPoint}`);
        }
        
        hex.push(
          <polygon
            key={`${row}-${col}`}
            className="honeycomb-cell"
            points={points.join(' ')}
            style={{
              animation: `float ${Math.random() * 5 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        );
      }
    }
    return hex;
  }, [isMounted]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
       <svg className="absolute -left-10 -top-10 h-[120%] w-[120%]" xmlns="http://www.w3.org/2000/svg">
         <g>{hexagons}</g>
       </svg>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
    </div>
  );
}

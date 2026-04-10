"use client";

import React from 'react';

interface LiquidProgressProps {
    progress: number; // 0 to 100
}

export function LiquidProgress({ progress }: LiquidProgressProps) {
    return (
        <div className="relative flex items-center justify-center w-20 h-20">
            {/* Liquid Animation Background */}
            <div
                className="absolute inset-0 bg-gradient-to-tr from-gray-300 via-gray-400 to-gray-500 shadow-inner animate-liquid-bubble transition-all duration-300 ease-out"
                style={{
                    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.5), 0 4px 10px rgba(0,0,0,0.2)',
                    transform: `scale(${0.8 + (progress / 100) * 0.2})` // Bubble grows slightly as progress increases
                }}
            />

            {/* Progress Text */}
            <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-white drop-shadow-md mix-blend-difference">
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Add this CSS directly or in your globals.css */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes liquid {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
        }
        .animate-liquid-bubble {
          animation: liquid 4s ease-in-out infinite;
        }
      `}} />
        </div>
    );
}
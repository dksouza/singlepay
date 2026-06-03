"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  minutes: number;
  text: string;
  bgColor: string;
  textColor: string;
  hash: string;
}

export function CountdownTimer({ minutes, text, bgColor, textColor, hash }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // Check if we already have a saved end time for this specific checkout hash
    const storageKey = `timer_${hash}`;
    const savedEndTime = localStorage.getItem(storageKey);
    const now = new Date().getTime();

    if (savedEndTime) {
      const remaining = parseInt(savedEndTime, 10) - now;
      if (remaining > 0) {
        setTimeLeft(Math.floor(remaining / 1000));
      } else {
        setTimeLeft(0);
      }
    } else {
      // First time loading this checkout, start the timer
      const endTime = now + minutes * 60 * 1000;
      localStorage.setItem(storageKey, endTime.toString());
      setTimeLeft(minutes * 60);
    }
  }, [hash, minutes]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  if (timeLeft === null) return null; // Avoid hydration mismatch by not rendering until client is ready

  const displayMinutes = Math.floor(timeLeft / 60);
  const displaySeconds = timeLeft % 60;

  return (
    <div 
      className="w-full flex justify-center items-center py-3 px-4 shadow-sm relative z-50"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex items-center gap-2 font-bold text-base md:text-lg tracking-wide">
        <Clock size={20} className="animate-pulse" />
        <span>{text}</span>
        <span className="tabular-nums bg-black/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
          {displayMinutes.toString().padStart(2, '0')}:{displaySeconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

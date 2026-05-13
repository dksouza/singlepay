"use client";

import React, { createContext, useContext, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingContextType {
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const value = React.useMemo(() => ({
    isLoading,
    setIsLoading
  }), [isLoading]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && (
        <div className="global-loading-overlay" style={{ zIndex: 100000 }}>
          <Loader2 
            className="animate-spin text-blue-500" 
            size={48} 
            strokeWidth={2.5}
            style={{ color: '#3b82f6' }}
          />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

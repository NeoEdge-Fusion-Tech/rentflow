import React, { createContext, useContext, useState, useEffect } from "react";

interface VisibilityContextType {
  isRevenueHidden: boolean;
  toggleRevenueVisibility: () => void;
}

const VisibilityContext = createContext<VisibilityContextType | undefined>(
  undefined,
);

export function VisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isRevenueHidden, setIsRevenueHidden] = useState(() => {
    return localStorage.getItem("isRevenueHidden") === "true";
  });

  useEffect(() => {
    localStorage.setItem("isRevenueHidden", isRevenueHidden.toString());
  }, [isRevenueHidden]);

  const toggleRevenueVisibility = () => {
    setIsRevenueHidden((prev) => !prev);
  };

  return (
    <VisibilityContext.Provider
      value={{ isRevenueHidden, toggleRevenueVisibility }}
    >
      {children}
    </VisibilityContext.Provider>
  );
}

export function useVisibility() {
  const context = useContext(VisibilityContext);
  if (context === undefined) {
    throw new Error("useVisibility must be used within a VisibilityProvider");
  }
  return context;
}

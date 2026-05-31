"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type BoardUI = {
  search: string;
  setSearch: (v: string) => void;
};

const BoardUIContext = createContext<BoardUI | null>(null);

export function BoardUIProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  return (
    <BoardUIContext.Provider value={{ search, setSearch }}>
      {children}
    </BoardUIContext.Provider>
  );
}

export function useBoardUI(): BoardUI {
  const ctx = useContext(BoardUIContext);
  if (!ctx) return { search: "", setSearch: () => {} };
  return ctx;
}

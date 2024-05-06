"use client";

import {
  createContext,
  FC,
  ReactNode,
  useState,
  useEffect,
  useMemo,
} from "react";
import { SidebarContextType } from "@/types/sidebar";

export const SidebarContext = createContext<SidebarContextType>({
  open: false,
  setOpen: () => {},
});

const SidebarProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.innerWidth > 768);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
    }),
    [open, setOpen]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export default SidebarProvider;

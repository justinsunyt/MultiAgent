import Sidebar from "@/components/sidebar";
import { LayoutGroup, motion } from "framer-motion";
import React, { ReactNode } from "react";
import { models } from "@/lib/models";

export default function SidebarLayout({
  margins = true,
  children,
}: {
  margins?: boolean;
  children: ReactNode;
}) {
  return (
    <LayoutGroup>
      <div className="h-full flex text-white">
        <Sidebar models={models} />
        <motion.div
          layout
          className={`${
            margins &&
            "container mx-auto max-w-screen-lg pt-12 pb-12 px-6 justify-center"
          } relative w-full flex flex-col items-center`}
        >
          {children}
        </motion.div>
      </div>
    </LayoutGroup>
  );
}

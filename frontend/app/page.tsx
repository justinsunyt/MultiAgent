"use client";

import SidebarLayout from "@/components/sidebarLayout";
import { UserContext } from "@/context/userContext";
import { useContext } from "react";
import { Card } from "@/components/ui/card";
import Spline from "@splinetool/react-spline";
import { Table, TableBody } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import ModelTableRow from "@/components/modelTableRow";
import { models } from "@/lib/models";

export default function HomePage() {
  const { user, userLoading } = useContext(UserContext);

  return (
    <SidebarLayout>
      <Spline
        className="absolute opacity-50"
        scene="https://prod.spline.design/V5FeUBR8GDPKXxRA/scene.splinecode"
      />
      {!userLoading &&
        (user ? (
          <motion.div
            layout
            initial={{ height: "100%" }}
            className="flex flex-col justify-center items-center z-10 w-96"
          >
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-2xl md:text-3xl font-bold text-center">
                Hey {user.name}, wanna chat?
              </div>
              <Card className="w-full mt-8 max-h-[24rem] overflow-auto">
                <Table>
                  <TableBody>
                    {models.map((model) => (
                      <ModelTableRow model={model} key={model} />
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <div className="h-20"></div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div layout className="flex flex-col items-center z-10">
            <div className="flex justify-start items-center text-6xl md:text-7xl font-bold text-left mb-4">
              MultiOn
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-200 to-blue-400">
                Chat
              </span>
            </div>
            <div className="mb-4 text-base md:text-lg text-center">
              Ask our agent anything!
            </div>
            <Link href="/login">
              <Button
                className="bg-gradient-to-r from-green-200 to-blue-400"
                size="lg"
              >
                Login
              </Button>
            </Link>
          </motion.div>
        ))}
    </SidebarLayout>
  );
}

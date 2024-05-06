import React, { useContext } from "react";
import Link from "next/link";
import { UserContext } from "@/context/userContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ModelChats from "@/components/modelChats";
import { motion } from "framer-motion";
import { ChevronsLeft, Menu } from "lucide-react";
import { SidebarContext } from "@/context/sidebarContext";

export default function Sidebar({ models }: { models: string[] }) {
  const { user, userLoading } = useContext(UserContext);
  const { open, setOpen } = useContext(SidebarContext);
  return (
    <>
      <div className="pt-8 pl-3 absolute z-10">
        <Button
          variant="ghost"
          className="p-3"
          onClick={() => {
            setOpen(true);
          }}
        >
          <Menu size={20} />
        </Button>
      </div>
      <motion.div
        layout
        className={`${
          !open && "ml-[-16rem]"
        } absolute md:relative z-20 flex-shrink-0 w-64 h-full px-3 py-8 flex flex-col justify-between items-start bg-zinc-950 border-r border-zinc-800 text-white`}
      >
        <div className="w-full flex flex-col space-y-4">
          <div className="w-full flex items-center justify-between">
            <Link
              href="/"
              className="flex justify-start items-center text-xl font-bold text-left px-3"
            >
              Multi
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-200 to-blue-400">
                Agent
              </span>
            </Link>
            <Button
              variant="ghost"
              className="p-3"
              onClick={() => {
                setOpen(false);
              }}
            >
              <ChevronsLeft size={20} />
            </Button>
          </div>
          {user &&
            models?.map((model) => <ModelChats model={model} key={model} />)}
        </div>
        <div className="flex w-full justify-between items-center text-zinc-400 px-3">
          {userLoading ? (
            <Skeleton className="w-full h-10" />
          ) : user ? (
            <>
              <div>{user?.name}</div>
              <form action="/auth/signout" method="post">
                <Button variant="outline">Sign out</Button>
              </form>
            </>
          ) : (
            <>
              <div>Login to chat!</div>
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

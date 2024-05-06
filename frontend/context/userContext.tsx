"use client";

import {
  createContext,
  FC,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User } from "@supabase/auth-js";
import { ChatUser, ChatUserContextType } from "@/types/user";
import { toast } from "sonner";

export const UserContext = createContext<ChatUserContextType>({
  user: null,
  userLoading: false,
  updateUser: () => {},
});

const UserProvider: FC<{ children: ReactNode; user: User | null }> = ({
  children,
  user,
}) => {
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = async (newUser: User) => {
    try {
      setLoading(true);
      let metadata = newUser.user_metadata;
      if (metadata) {
        setChatUser({
          email: metadata.email,
          name: metadata.name,
        });
      }
    } catch (error) {
      toast.error(error as string);
    } finally {
      setLoading(false);
    }
  };

  const getProfile = useCallback(async () => {
    if (!user) {
      setChatUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let metadata = user.user_metadata;
      if (metadata) {
        setChatUser({
          email: metadata.email,
          name: metadata.name,
        });
      }
    } catch (error) {
      console.log(error as string);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    getProfile();
  }, [user, getProfile]);

  return (
    <UserContext.Provider
      value={{
        user: chatUser,
        userLoading: loading,
        updateUser: setUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;

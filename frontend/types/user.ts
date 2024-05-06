import { User } from "@supabase/auth-js";

type UpdateUserFunction = (user: User) => void;
export interface ChatUser {
  email: string;
  name: string;
}

export type ChatUserContextType = {
  user: ChatUser | null;
  userLoading: boolean;
  updateUser: UpdateUserFunction;
};

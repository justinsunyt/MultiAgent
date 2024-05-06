import { UserContext } from "@/context/userContext";
import { useRouter } from "next/navigation";
import { ReactNode, useContext } from "react";

export default function PrivatePage({
  reversed = false,
  children,
}: {
  reversed?: boolean;
  children: ReactNode;
}) {
  const { user, userLoading } = useContext(UserContext);
  const router = useRouter();

  if (reversed) {
    if (!userLoading && user) {
      router.push("/");
    }
  } else {
    if (!userLoading && !user) {
      router.push("/login?redirected=true");
    }
  }

  return <>{children}</>;
}

import { createClient } from "./supabase/client";
import { toast } from "sonner";

export async function fetchBearer(route: string) {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_PLATFORM_URL}${route}`,
      {
        headers: { Authorization: "Bearer " + token },
      }
    );
    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(errorDetail["detail"]);
    } else {
      return response;
    }
  } catch (error) {
    toast.error(error as string);
    return null;
  }
}

export async function postBearer(route: string, body?: FormData) {
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_PLATFORM_URL}${route}`,
      {
        headers: { Authorization: "Bearer " + token },
        method: "POST",
        body,
      }
    );
    if (!response.ok) {
      const errorDetail = await response.json();
      throw new Error(errorDetail["detail"]);
    } else {
      return response;
    }
  } catch (error) {
    toast.error(error as string);
    return null;
  }
}

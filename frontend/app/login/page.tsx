"use client";

import { useContext, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { UserContext } from "@/context/userContext";
import SidebarLayout from "@/components/sidebarLayout";
import PrivatePage from "@/components/privatePage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function LoginPage() {
  const [haveAccount, setHaveAccount] = useState(true);
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const redirected = searchParams.get("redirected");
  const supabase = createClient();
  const router = useRouter();
  const { updateUser: updateUser } = useContext(UserContext);

  async function login(formData: FormData) {
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      toast.error(error.message);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      updateUser(user!);
      router.push("/");
    }
  }

  async function signup(formData: FormData) {
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      options: {
        data: {
          name: formData.get("name") as string,
        },
        emailRedirectTo: `https://${process.env.NEXT_PUBLIC_PLATFORM_URL}/login?verified=true`,
      },
    };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
      toast.error(error.message);
    } else {
      router.push("/verify");
    }
  }

  return (
    <PrivatePage reversed>
      <SidebarLayout>
        {verified ? (
          <div className="mt-12 absolute z-20 top-0 left-0 right-0 mx-auto px-6 flex justify-center">
            <Alert className="w-[24rem]">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email Successfully Verified</AlertTitle>
              <AlertDescription>
                Please login with your credentials!
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          redirected && (
            <div className="mt-12 absolute z-20 top-0 left-0 right-0 mx-auto px-6 flex justify-center">
              <Alert className="w-[24rem]">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Required</AlertTitle>
                <AlertDescription>
                  Please login to use this feature!
                </AlertDescription>
              </Alert>
            </div>
          )
        )}

        <Card className="w-[24rem]">
          <form>
            <CardHeader className="text-base md:text-xl font-bold inline-block">
              {haveAccount ? "Login To " : "Sign Up For "}Multi
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-200 to-blue-400">
                Agent
              </span>
            </CardHeader>
            <CardContent className="grid w-full items-center gap-4">
              {!haveAccount && (
                <div className="flex flex-col">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required className="mt-1.5" />
                </div>
              )}
              <div className="flex flex-col">
                <Label htmlFor="name">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1.5"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="" className="text-sm underline">
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1.5"
                />
              </div>
            </CardContent>
            <CardFooter className="grid w-full items-center gap-4">
              <Button
                className="bg-gradient-to-r from-green-200 to-blue-400 hover:opacity-90 w-full"
                formAction={haveAccount ? login : signup}
                type="submit"
              >
                {haveAccount ? "Login" : "Sign Up"}
              </Button>

              {haveAccount ? (
                <div className="text-sm text-zinc-400 text-center w-full">
                  Don&apos;t have an account?
                  <span
                    className="pl-1 text-white underline cursor-pointer"
                    onClick={() => setHaveAccount(false)}
                  >
                    Sign Up Now
                  </span>
                </div>
              ) : (
                <div className="text-sm text-zinc-400 text-center w-full">
                  Have an account?
                  <span
                    className="pl-1 text-white underline cursor-pointer"
                    onClick={() => setHaveAccount(true)}
                  >
                    Log In Now
                  </span>
                </div>
              )}
            </CardFooter>
          </form>
        </Card>
      </SidebarLayout>
    </PrivatePage>
  );
}

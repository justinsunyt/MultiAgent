"use client";

import PrivatePage from "@/components/privatePage";
import SidebarLayout from "@/components/sidebarLayout";

export default function VerifyPage() {
  return (
    <PrivatePage reversed>
      <SidebarLayout>
        <div className="text-xl font-medium">
          Please check your email for verification!
        </div>
      </SidebarLayout>
    </PrivatePage>
  );
}

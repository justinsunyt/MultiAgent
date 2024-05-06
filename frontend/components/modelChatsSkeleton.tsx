import { Skeleton } from "@/components/ui/skeleton";

export default function ModelChatsSkeleton() {
  {
    return (
      <div className="flex flex-col space-y-2 p-3">
        <div className="flex">
          <Skeleton key="1" className="h-12 w-12 shrink-0 rounded-full" />
          <Skeleton key="2" className="ml-4 w-full h-12" />
        </div>
        <Skeleton className="w-full h-4" />
      </div>
    );
  }
}

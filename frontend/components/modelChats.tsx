import { Chat } from "@/types/chat";
import { fetchBearer, postBearer } from "@/utils/bearer";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import { Plus } from "lucide-react";

export default function ModelChats({ model }: { model: string }) {
  const router = useRouter();

  const { data: chats, isPending: chatsLoading } = useQuery({
    queryKey: ["chats", model],
    queryFn: () =>
      fetchBearer(`/chat/get_by_model/${model}`).then((res) => res?.json()),
    select: (data) => data as [Chat],
  });

  const createChat = useMutation({
    mutationFn: () => {
      return postBearer(`/chat/create/${model}`);
    },
    onSuccess: (data, _variables, _context) => {
      data?.json().then((chat: Chat) => {
        router.push(`/chat/${chat.id}`);
      });
    },
  });

  return (
    <div className="w-full flex flex-col items-start">
      <div className="w-full flex items-center justify-between mb-2">
        <div className="text-base font-medium pl-3">{model}</div>
        <Button
          variant="ghost"
          className="p-3"
          onClick={() => createChat.mutate()}
        >
          <Plus size={20} />
        </Button>
      </div>
      {chatsLoading ? (
        <Skeleton className="w-full h-10" />
      ) : chats ? (
        <>
          {chats.map((chat) => (
            <Button
              variant="ghost"
              className="w-full text-xs justify-start p-3"
              onClick={() => router.push(`/chat/${chat.id}`)}
              key={chat.id}
            >
              <div className="truncate">
                {chat.messages.length > 0
                  ? chat.messages[chat.messages.length - 1]["content"]
                  : `New chat: ${chat.id}`}
              </div>
            </Button>
          ))}
        </>
      ) : (
        <div className="flex items-center text-xs h-10">Try this model!</div>
      )}
    </div>
  );
}

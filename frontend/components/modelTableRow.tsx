import { TableRow } from "@/components/ui/table";
import { Chat } from "@/types/chat";
import { postBearer } from "@/utils/bearer";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ModelTableRow({ model }: { model: string }) {
  const router = useRouter();

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
    <TableRow
      onClick={() => createChat.mutate()}
      className="flex items-center p-6 cursor-pointer"
    >
      <Plus size={16} />
      <div className="ml-2 font-medium">{model}</div>
    </TableRow>
  );
}

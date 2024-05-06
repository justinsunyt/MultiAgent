"use client";

import {
  useState,
  useRef,
  useContext,
  useEffect,
  FormEvent,
  KeyboardEvent,
  ChangeEvent,
  useCallback,
} from "react";
import { ArrowRight, ChevronDown, ImageUp, Plus, Trash2 } from "lucide-react";
import Message from "@/components/message";
import { createClient } from "@/utils/supabase/client";
import { UserContext } from "@/context/userContext";
import SidebarLayout from "@/components/sidebarLayout";
import PrivatePage from "@/components/privatePage";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchBearer, postBearer } from "@/utils/bearer";
import { Chat } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarContext } from "@/context/sidebarContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import MessageSkeleton from "@/components/messageSkeleton";

export default function ChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<
    { type: string; role: string; content: string }[]
  >([]);
  const { user } = useContext(UserContext);
  const { open } = useContext(SidebarContext);
  const [textInput, setTextInput] = useState("");
  const [imageInput, setImageInput] = useState<File>();
  const [imagePreview, setImagePreview] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const websocket = useRef<WebSocket>();
  const connected = useRef(false);
  const scrollRef = useRef<null | HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: chat, isPending: chatLoading } = useQuery({
    queryKey: ["chat", params.id],
    queryFn: () =>
      fetchBearer(`/chat/get/${params.id}`).then((res) => res?.json()),
    select: (data) => data as Chat,
    initialData: keepPreviousData,
  });

  const createChat = useMutation({
    mutationFn: () => {
      return postBearer(`/chat/create/${chat.model}`);
    },
    onSuccess: (data, _variables, _context) => {
      data?.json().then((chat: Chat) => {
        router.push(`/chat/${chat.id}`);
      });
    },
  });

  const deleteChat = useMutation({
    mutationFn: () => {
      return postBearer(`/chat/delete/${params.id}`);
    },
    onSuccess: (data, _variables, _context) => {
      data?.json().then(() => {
        router.push("/");
      });
    },
  });

  useEffect(() => {
    setMessages(chat ? chat.messages : []);
  }, [chat]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (textInput.trim()) {
      let updatedMessages = [...messages];
      const inputMessage = {
        type: "text",
        role: "user",
        content: textInput,
      };
      if (imageInput) {
        if (imageInput.size < 10485760) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64data = reader.result as string;
            const fileMessage = {
              type: "file",
              role: "user",
              content: base64data,
            };
            updatedMessages.push(fileMessage);
            updatedMessages.push(inputMessage);
            setMessages(updatedMessages);
            handleChat(updatedMessages, !!imageInput);
            setTextInput("");
            setImageInput(undefined);
            setImagePreview("");
            setAgentLoading(true);
            setImageLoading(true);
          };
          reader.readAsDataURL(imageInput);
        } else {
          toast.error("Image is too big!");
        }
      } else {
        updatedMessages.push(inputMessage);
        setMessages(updatedMessages);
        handleChat(updatedMessages, !!imageInput);
        setTextInput("");
        setImageInput(undefined);
        setImagePreview("");
        setMessageLoading(true);
      }
    }
  }

  function resizeTextarea(e: ChangeEvent<HTMLTextAreaElement>) {
    const textarea = e.target;
    textarea.style.height = "auto";
    const maxHeight = 104;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;

    if (textarea.scrollHeight > maxHeight) {
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.overflowY = "hidden";
    }
  }

  async function handleMessage(e: MessageEvent) {
    let output = JSON.parse(e.data);

    if (output["role"] === "system") {
      if (output["content"] === "Awaiting input") {
        setAgentLoading(false);
      }
      if (output["content"] === "Done") {
        setAgentLoading(false);
        toast.success("Request completed");
      }
    } else {
      const updateState = (
        latestMessages: { type: string; role: string; content: string }[]
      ): { type: string; role: string; content: string }[] => {
        return [...latestMessages, output];
      };
      if (output["type"] === "file") {
        setTimeout(() => {
          setMessages(updateState);
          setMessageLoading(false);
          setImageLoading(false);
          queryClient.refetchQueries({ queryKey: ["chats", chat.model] });
        }, 500);
      } else {
        setMessages(updateState);
        setMessageLoading(false);
        setImageLoading(false);
        queryClient.refetchQueries({ queryKey: ["chats", chat.model] });
      }
    }
  }

  async function handleClose(e: CloseEvent) {
    let errorMessage = "Websocket disconnected";
    if (e.reason && e.reason.startsWith("body:")) {
      let reason = e.reason.replace(/'/g, '"');
      reason = reason.replace(/(\w+):/g, '"$1":');
      let reasonParsed = JSON.parse(`{${reason}}`);
      errorMessage = reasonParsed["body"]["detail"]["message"];
    }
    toast.error(errorMessage, {
      action: {
        label:
          errorMessage === "Session not found" ? "Start new chat" : "Reconnect",
        onClick: async () => {
          if (errorMessage === "Session not found") {
            createChat.mutate();
          } else {
            const token = (await supabase.auth.getSession()).data.session
              ?.access_token;
            const url = `wss://${
              process.env.NEXT_PUBLIC_PLATFORM_URL
            }/chat/run/${params.id}?token=${encodeURIComponent(token!)}`;
            const ws = new WebSocket(url);
            ws.onopen = () => {
              ws.send(JSON.stringify(token));
              const continueMessage = {
                type: "text",
                role: "user",
                content: "Continue with the previous command",
              };
              setMessages((latestMessages) => [
                ...latestMessages,
                continueMessage,
              ]);
              setAgentLoading(true);
              ws.send(JSON.stringify(continueMessage));
            };
            websocket.current = ws;
            connected.current = true;
            ws.onmessage = handleMessage;
            ws.onclose = handleClose;
          }
        },
      },
    });
  }

  async function handleChat(
    updatedMessages: { type: string; role: string; content: string }[],
    file: boolean
  ) {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!connected.current) {
      const url = `wss://${process.env.NEXT_PUBLIC_PLATFORM_URL}/chat/run/${
        params.id
      }?token=${encodeURIComponent(token!)}`;
      const ws = new WebSocket(url);

      ws.onopen = () => {
        ws.send(JSON.stringify(token));
        if (file) {
          ws.send(JSON.stringify(updatedMessages[updatedMessages.length - 2]));
        }
        ws.send(JSON.stringify(updatedMessages[updatedMessages.length - 1]));
      };
      websocket.current = ws;
      connected.current = true;
    } else {
      websocket.current!.send(JSON.stringify(token));
      if (file) {
        websocket.current!.send(
          JSON.stringify(updatedMessages[updatedMessages.length - 2])
        );
      }
      websocket.current!.send(
        JSON.stringify(updatedMessages[updatedMessages.length - 1])
      );
    }
    websocket.current!.onmessage = handleMessage;
    websocket.current!.onclose = handleClose;
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <PrivatePage>
      <SidebarLayout margins={false}>
        <motion.div
          layout
          className={`${
            open ? "px-16 md:px-3" : "px-16"
          } w-full pt-6 flex items-center`}
        >
          {!chatLoading && chat ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto flex flex-col items-start space-y-2 p-3"
                >
                  <motion.div layout className="flex items-center">
                    <div className="mr-4 text-lg font-medium">{chat.model}</div>
                    <ChevronDown className="text-zinc-400" size={16} />
                  </motion.div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => createChat.mutate()}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>New chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteChat.mutate()}
                    className="cursor-pointer text-red-500 focus:text-red-500 dark:focus:text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete chat</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Skeleton className="w-36 h-[3.25rem]" />
          )}
        </motion.div>
        <div ref={scrollRef} className="h-full w-full px-6 overflow-auto">
          <motion.div
            layout
            initial={{ height: "100%" }}
            className="mx-auto max-w-screen-md flex flex-col"
          >
            <div className="h-4 shrink-0"></div>
            <div className="flex flex-col space-y-4">
              {!chatLoading &&
                user &&
                messages.map((message) => (
                  <Message
                    type={message["type"]}
                    role={message["role"]}
                    content={message["content"]
                      .replace("User: ", "")
                      .replace("\nAssistant: ", "")}
                    model={chat.model}
                    username={user.name}
                    key={message["content"]}
                  />
                ))}
              {(agentLoading || messageLoading) && (
                <MessageSkeleton model={chat.model} image={imageLoading} />
              )}
            </div>
            <div className="h-8 shrink-0"></div>
          </motion.div>
        </div>
        <motion.div
          layout
          className="w-full px-6 pb-6 flex-col items-center space-y-2"
        >
          <form className="w-full flex" onSubmit={handleSubmit}>
            <motion.div
              layout
              className="w-full max-w-screen-md mx-auto pl-2 pr-2 border border-zinc-800 rounded-xl flex flex-col items-center justify-center overflow-hidden"
            >
              <AnimatePresence>
                {imagePreview && (
                  <motion.div
                    className="p-4 h-64"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Image
                      src={imagePreview}
                      alt="Uploaded image"
                      width={256}
                      height={256}
                      style={{
                        height: "100%",
                        width: "auto",
                        borderRadius: "0.5rem",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div layout className="w-full flex items-center">
                <Button
                  variant="ghost"
                  type="button"
                  className="p-0"
                  disabled={chatLoading || agentLoading || messageLoading}
                >
                  <ImageUp className="text-zinc-400 m-3" size={20} />
                  <input
                    id="file"
                    name="file"
                    type="file"
                    accept="image/*"
                    disabled={chatLoading || agentLoading || messageLoading}
                    onChange={(e) => {
                      if (e.target.files) {
                        let reader = new FileReader();
                        let file = e.target.files![0];
                        setImageInput(file);
                        if (file) {
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                  />
                </Button>
                <textarea
                  rows={1}
                  className="flex-1 py-4 mx-2 focus:outline-none resize-none text-white placeholder:text-sm placeholder:text-zinc-400 bg-transparent"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onInput={resizeTextarea}
                  onKeyDown={handleKeyDown}
                  disabled={chatLoading}
                  placeholder={
                    chatLoading
                      ? "Loading..."
                      : `Ask ${chat.model} agent anything!`
                  }
                />
                <Button
                  disabled={
                    chatLoading ||
                    agentLoading ||
                    messageLoading ||
                    !textInput.trim()
                  }
                  variant="ghost"
                  type="submit"
                  className="p-3"
                >
                  <ArrowRight className="text-zinc-400" size={20} />
                </Button>
              </motion.div>
            </motion.div>
          </form>
        </motion.div>
      </SidebarLayout>
    </PrivatePage>
  );
}

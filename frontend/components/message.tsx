import userImg from "@/images/user.jpg";
import assistantImg from "@/images/kaguya.jpg";
import Image from "next/image";

interface MessageProps {
  type: string;
  role: string;
  content: string;
  model: string;
  username: string;
}

const Message: React.FC<MessageProps> = ({
  type,
  role,
  content,
  model,
  username,
}) => {
  return (
    <div
      className={`w-full flex flex-col ${
        role === "assistant" ? "items-start" : "items-end"
      }`}
    >
      <div
        className={`flex items-center mb-2 space-x-4 ${
          role === "assistant" ? "flex-row" : "flex-row-reverse space-x-reverse"
        }`}
      >
        <div className="w-8 h-8">
          <Image
            src={role === "assistant" ? assistantImg : userImg}
            alt={role === "assistant" ? model + " agent" : username}
            className="aspect-square object-cover rounded-full"
          />
        </div>
        <div>{role === "assistant" ? model + " agent" : username}</div>
      </div>
      <div className="bg-zinc-800 rounded-xl p-4 whitespace-pre-wrap mx-8">
        {type === "text" ? (
          content
        ) : (
          <div className="h-64">
            <Image
              src={content}
              alt="Image"
              width={871}
              height={489}
              style={{
                height: "100%",
                width: "auto",
                borderRadius: "0.5rem",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;

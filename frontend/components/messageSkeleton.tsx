import Image from "next/image";
import assistantImg from "@/images/kaguya.jpg";

export default function MessageSkeleton({
  model,
  image,
  agent,
  paused,
}: {
  model: string;
  image: boolean;
  agent: boolean;
  paused: boolean;
}) {
  return (
    <div className="w-full flex flex-col items-start">
      <div className="flex items-center mb-2 space-x-4 flex-row">
        <div className="w-8 h-8">
          <Image
            src={assistantImg}
            alt={model + " agent"}
            className="aspect-square object-cover rounded-full"
          />
        </div>
        <div>{model + " agent"}</div>
        {paused && (
          <div className="ml-2 text-xs text-black rounded-full p-2 bg-gradient-to-r from-red-200 to-red-400">
            Pausing agent
          </div>
        )}
        {image && (
          <div className="ml-2 text-xs text-black rounded-full p-2 bg-gradient-to-r from-green-200 to-blue-400">
            Processing image with {model}
          </div>
        )}
        {agent && !paused && (
          <div className="ml-2 text-xs text-black rounded-full p-2 bg-gradient-to-r from-green-200 to-blue-400">
            Processing command with MultiOn agent
          </div>
        )}
      </div>
      <div className="bg-zinc-800 rounded-xl p-4 whitespace-pre-wrap mx-8 animate-pulse">
        ...
      </div>
    </div>
  );
}

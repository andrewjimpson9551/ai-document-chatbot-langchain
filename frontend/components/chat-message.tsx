import { ThumbsUp, ThumbsDown, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatMessageProps {
  message: {
    role: "user" | "assistant"
    content: string
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "bg-black text-white" : "bg-muted"} rounded-2xl px-4 py-2`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && (
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


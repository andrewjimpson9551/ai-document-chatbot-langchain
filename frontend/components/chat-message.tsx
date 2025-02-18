import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ChatMessageProps {
  message: {
    role: "user" | "assistant"
    content: string
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "bg-black text-white" : "bg-muted"} rounded-2xl px-4 py-2`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && (
          <div className="flex gap-2 mt-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy to clipboard"}
            >
              <Copy className={`h-4 w-4 ${copied ? "text-green-500" : ""}`} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


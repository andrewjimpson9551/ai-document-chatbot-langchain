"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip, ArrowUp } from "lucide-react"
import { ExamplePrompts } from "@/components/example-prompts"
import { ChatMessage } from "@/components/chat-message"

export default function Home() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setMessages((prev) => [...prev, { role: "user", content: input }])
    // Add mock response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "This is a mock response. In a real implementation, this would come from your chosen AI provider.",
        },
      ])
    }, 1000)
    setInput("")
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24 max-w-5xl mx-auto w-full">
      {messages.length === 0 ? (
        <>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-medium text-muted-foreground max-w-md mx-auto">
                This ai chatbot is an example to accompany the book: <a href="https://tinyurl.com/learning-langchain" className="underline hover:text-foreground">Learning LangChain (O'Reilly): Building AI and LLM applications with LangChain and LangGraph</a>
              </p>
            </div>
          </div>
          <ExamplePrompts onPromptSelect={setInput} />
        </>
      ) : (
        <div className="w-full space-y-4 mb-20">
          {messages.map((message, i) => (
            <ChatMessage key={i} message={message} />
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="flex gap-2 border rounded-md overflow-hidden bg-gray-50">
            <Button type="button" variant="ghost" size="icon" className="rounded-none h-12">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent"
            />
            <Button type="submit" size="icon" className="rounded-none h-12" disabled={!input.trim()}>
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}


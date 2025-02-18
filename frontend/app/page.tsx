"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip, ArrowUp, Loader2 } from "lucide-react"
import { ExamplePrompts } from "@/components/example-prompts"
import { ChatMessage } from "@/components/chat-message"
import { FilePreview } from "@/components/file-preview"
import type { Thread, DefaultValues } from "@langchain/langgraph-sdk"
import { client } from "@/lib/langgraph-client"

export default function Home() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Create a thread when the component mounts
    const initThread = async () => {
      // Skip if we already have a thread
      if (threadId) return;
      
      try {
        // Check if we can get the thread status before creating a new one
        const thread = await client.createThread()
        console.log('Thread created', thread)
        setThreadId(thread.thread_id)
      } catch (error) {
        console.error("Error creating thread:", error)
        alert("Error creating thread. Please make sure you have set the LANGGRAPH_API_URL environment variable correctly. " + error)
      }
    }
    initThread()
  }, []) 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !threadId || isLoading) return

    const userMessage = input.trim()
    setMessages((prev) => [
      ...prev, 
      { role: "user", content: userMessage },
      { role: "assistant", content: "" } // Add empty assistant message immediately
    ])
    console.log('Messages after submit:', messages)
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
      
        const chunkStr = new TextDecoder().decode(value);
        const lines = chunkStr.split("\n").filter(Boolean);
      
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
      
          const sseString = line.slice("data: ".length);
          let sseEvent: any;
          try {
            sseEvent = JSON.parse(sseString);
          } catch (err) {
            console.error("Error parsing SSE line:", err, line);
            continue;
          }
      
          const { event, data } = sseEvent;
      
          if (event === "messages/partial" || event === "messages/complete") {
            if (Array.isArray(data)) {
              const lastObj = data[data.length - 1];
              if (lastObj?.type === "ai") {
                const partialContent = lastObj.content ?? "";
                setMessages(prev => {
                  const newArr = [...prev];
                  // Now we know the last message is always the current assistant response
                  newArr[newArr.length - 1].content = partialContent;
                  return newArr;
                });
              }
            }
          }
          else if (event === "messages/metadata") {
            // Possibly do nothing, or log for debugging:
            console.log("Metadata event:", data);
          }
          else {
            // fallback for any other event
            console.log("Unknown SSE event:", event, data);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error processing your message." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    // Check if all files are PDFs
    const nonPdfFiles = selectedFiles.filter(file => file.type !== "application/pdf")
    if (nonPdfFiles.length > 0) {
      alert("Please upload PDF files only")
      return
    }

    setIsUploading(true)
    try {
      // replace simulate upload delay with actual upload delay
      await new Promise((resolve) => setTimeout(resolve, 5000))
      setFiles(prev => [...prev, ...selectedFiles])
    } catch (error) {
      console.error("Error uploading files:", error)
      alert("Failed to upload files")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = '' // Reset file input
      }
    }
  }

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove))
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
        <div className="max-w-5xl mx-auto space-y-4">
          {/* File Previews */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => handleRemoveFile(file)}
                />
              ))}
            </div>
          )}
          
          {/* Chat Input Form */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex gap-2 border rounded-md overflow-hidden bg-gray-50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                multiple
                className="hidden"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="rounded-none h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isUploading ? "Uploading PDF..." : "Send a message..."}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent"
                disabled={isUploading || isLoading || !threadId}
              />
              <Button type="submit" size="icon" className="rounded-none h-12" disabled={!input.trim() || isUploading || isLoading || !threadId}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}


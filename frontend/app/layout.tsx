import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI Chatbot",
  description: "Next.js AI Chatbot",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>{children}</body>
    </html>
  )
}



import './globals.css'
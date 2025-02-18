import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { message } = await req.json()

  // This is where you would typically integrate with an AI service
  // For now, we'll just echo the message back
  const response = `You said: ${message}`

  return NextResponse.json({ message: response })
}


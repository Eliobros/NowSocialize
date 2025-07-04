import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("socializenow")
    const supportTickets = db.collection("supportTickets")

    const tickets = await supportTickets.find({}).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("Get support tickets error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

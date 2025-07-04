import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export async function PUT(request: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const { action } = await request.json()
    const { ticketId } = params

    if (action !== "close") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db("socializenow")
    const supportTickets = db.collection("supportTickets")

    await supportTickets.updateOne(
      { _id: new ObjectId(ticketId) },
      {
        $set: {
          status: "closed",
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({ message: "Ticket fechado com sucesso" })
  } catch (error) {
    console.error("Close support ticket error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

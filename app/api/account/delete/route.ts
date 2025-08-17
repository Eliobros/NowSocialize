import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Marcar conta para exclusão (período de 60 dias)
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const users = db.collection("users");

    const userId = new ObjectId(user.userId);
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 60); // 60 dias no futuro

    // Marcar a conta para exclusão
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          markedForDeletion: true,
          deletionScheduledAt: deletionDate,
          markedForDeletionAt: new Date(),
        }
      }
    );

    return NextResponse.json({ 
      message: "Conta marcada para exclusão",
      deletionDate: deletionDate.toISOString(),
      daysRemaining: 60
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// Cancelar exclusão de conta
export async function DELETE(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const users = db.collection("users");

    const userId = new ObjectId(user.userId);

    // Cancelar a exclusão
    await users.updateOne(
      { _id: userId },
      {
        $unset: {
          markedForDeletion: "",
          deletionScheduledAt: "",
          markedForDeletionAt: "",
        }
      }
    );

    return NextResponse.json({ message: "Exclusão de conta cancelada" });
  } catch (error) {
    console.error("Cancel deletion error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// Desativar conta (reversível)
export async function PATCH(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { action } = await request.json();

    const client = await clientPromise;
    const db = client.db("socializenow");
    const users = db.collection("users");

    const userId = new ObjectId(user.userId);

    if (action === "deactivate") {
      // Desativar conta
      await users.updateOne(
        { _id: userId },
        {
          $set: {
            isDeactivated: true,
            deactivatedAt: new Date(),
          }
        }
      );
      return NextResponse.json({ message: "Conta desativada" });
    } else if (action === "reactivate") {
      // Reativar conta
      await users.updateOne(
        { _id: userId },
        {
          $unset: {
            isDeactivated: "",
            deactivatedAt: "",
          }
        }
      );
      return NextResponse.json({ message: "Conta reativada" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Account deactivation error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
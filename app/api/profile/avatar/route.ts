import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import cloudinary from "@/lib/cloudinary";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipo e tamanho da imagem
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas arquivos de imagem são permitidos" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem deve ter no máximo 5MB" }, { status: 400 });
    }

    // Converter arquivo para base64 para enviar ao Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload para Cloudinary, dentro da pasta "avatars"
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: "avatars",
      use_filename: true,
      unique_filename: false,
      overwrite: true,  // Pode ajustar conforme quiser
      public_id: `${user.userId}`, // Usa o userId como nome do arquivo para substituir a imagem anterior
    });

    const avatarUrl = uploadResult.secure_url;

    // Atualiza no banco
    const client = await clientPromise;
    const db = client.db("socializenow");
    const users = db.collection("users");

    await users.updateOne(
      { _id: new ObjectId(user.userId) },
      { $set: { avatar: avatarUrl, updatedAt: new Date() } }
    );

    return NextResponse.json({
      message: "Avatar atualizado com sucesso",
      avatarUrl,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

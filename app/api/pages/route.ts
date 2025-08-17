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

// GET - Listar páginas do usuário
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const pages = db.collection("pages");

    const userId = new ObjectId(user.userId);

    const userPages = await pages.find({ 
      ownerId: userId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).toArray();

    // Converter ObjectIds para strings
    const formattedPages = userPages.map(page => ({
      ...page,
      _id: page._id.toString(),
      ownerId: page.ownerId.toString()
    }));

    return NextResponse.json({ pages: formattedPages });
  } catch (error) {
    console.error("Get pages error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Criar nova página
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { 
      name, 
      description, 
      category, 
      isPublic, 
      customUrl,
      avatar,
      coverImage 
    } = await request.json();

    // Validações
    if (!name || !description || !category) {
      return NextResponse.json({ 
        error: "Nome, descrição e categoria são obrigatórios" 
      }, { status: 400 });
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({ 
        error: "Nome deve ter entre 3 e 50 caracteres" 
      }, { status: 400 });
    }

    if (description.length > 500) {
      return NextResponse.json({ 
        error: "Descrição deve ter no máximo 500 caracteres" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const pages = db.collection("pages");

    const userId = new ObjectId(user.userId);

    // Verificar se já existe uma página com o mesmo nome para o usuário
    const existingPage = await pages.findOne({ 
      ownerId: userId, 
      name: name,
      isDeleted: { $ne: true }
    });

    if (existingPage) {
      return NextResponse.json({ 
        error: "Você já possui uma página com esse nome" 
      }, { status: 400 });
    }

    // Verificar URL customizada se fornecida
    if (customUrl) {
      const urlPattern = /^[a-zA-Z0-9-_]+$/;
      if (!urlPattern.test(customUrl)) {
        return NextResponse.json({ 
          error: "URL customizada deve conter apenas letras, números, hífens e underscores" 
        }, { status: 400 });
      }

      const existingUrl = await pages.findOne({ 
        customUrl: customUrl,
        isDeleted: { $ne: true }
      });

      if (existingUrl) {
        return NextResponse.json({ 
          error: "Esta URL customizada já está em uso" 
        }, { status: 400 });
      }
    }

    // Criar a página
    const newPage = {
      name,
      description,
      category,
      isPublic: isPublic || false,
      customUrl: customUrl || null,
      avatar: avatar || null,
      coverImage: coverImage || null,
      ownerId: userId,
      followers: [],
      followersCount: 0,
      postsCount: 0,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };

    const result = await pages.insertOne(newPage);

    const createdPage = {
      ...newPage,
      _id: result.insertedId.toString(),
      ownerId: userId.toString()
    };

    return NextResponse.json({ 
      message: "Página criada com sucesso", 
      page: createdPage 
    });
  } catch (error) {
    console.error("Create page error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
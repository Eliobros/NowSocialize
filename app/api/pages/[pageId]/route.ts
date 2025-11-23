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

// GET - Buscar página específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    
    const client = await clientPromise;
    const db = client.db("socializenow");
    const pages = db.collection("pages");

    // Validar se o pageId é um ObjectId válido
    if (!ObjectId.isValid(pageId)) {
      return NextResponse.json({ error: "ID da página inválido" }, { status: 400 });
    }

    const pageObjectId = new ObjectId(pageId);

    const page = await pages.findOne({
      _id: pageObjectId,
      isDeleted: { $ne: true }
    });

    if (!page) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }

    // Converter ObjectIds para strings
    const formattedPage = {
      ...page,
      _id: page._id.toString(),
      ownerId: page.ownerId.toString()
    };

    return NextResponse.json({ page: formattedPage });
  } catch (error) {
    console.error("Get page error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT - Editar página
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    
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

    if (!ObjectId.isValid(pageId)) {
      return NextResponse.json({ error: "ID da página inválido" }, { status: 400 });
    }

    const pageObjectId = new ObjectId(pageId);

    // Verificar se a página existe e se o usuário é o dono
    const existingPage = await pages.findOne({
      _id: pageObjectId,
      isDeleted: { $ne: true }
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }

    if (!existingPage.ownerId.equals(userId)) {
      return NextResponse.json({
        error: "Você não tem permissão para editar esta página"
      }, { status: 403 });
    }

    // Verificar se já existe uma página com o mesmo nome (exceto a atual)
    const duplicatePage = await pages.findOne({
      ownerId: userId,
      name: name,
      _id: { $ne: pageObjectId },
      isDeleted: { $ne: true }
    });

    if (duplicatePage) {
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
        _id: { $ne: pageObjectId },
        isDeleted: { $ne: true }
      });

      if (existingUrl) {
        return NextResponse.json({
          error: "Esta URL customizada já está em uso"
        }, { status: 400 });
      }
    }

    // Atualizar a página
    const updateData = {
      name,
      description,
      category,
      isPublic: isPublic || false,
      customUrl: customUrl || null,
      avatar: avatar || existingPage.avatar,
      coverImage: coverImage || existingPage.coverImage,
      updatedAt: new Date()
    };

    await pages.updateOne({ _id: pageObjectId }, { $set: updateData });

    const updatedPage = await pages.findOne({ _id: pageObjectId });

    return NextResponse.json({
      message: "Página atualizada com sucesso",
      page: {
        ...updatedPage,
        _id: updatedPage!._id.toString(),
        ownerId: updatedPage!.ownerId.toString()
      }
    });
  } catch (error) {
    console.error("Update page error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Deletar página
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const pages = db.collection("pages");

    const userId = new ObjectId(user.userId);

    if (!ObjectId.isValid(pageId)) {
      return NextResponse.json({ error: "ID da página inválido" }, { status: 400 });
    }

    const pageObjectId = new ObjectId(pageId);

    // Verificar se a página existe e se o usuário é o dono
    const existingPage = await pages.findOne({
      _id: pageObjectId,
      isDeleted: { $ne: true }
    });

    if (!existingPage) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }

    if (!existingPage.ownerId.equals(userId)) {
      return NextResponse.json({
        error: "Você não tem permissão para deletar esta página"
      }, { status: 403 });
      }

    // Marcar como deletada (soft delete)
    await pages.updateOne(
      { _id: pageObjectId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );

    return NextResponse.json({ message: "Página deletada com sucesso" });
  } catch (error) {
    console.error("Delete page error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

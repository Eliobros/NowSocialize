import { Server } from 'socket.io'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // Verifica se já existe uma instância do Socket.io
  if ((global as any).io) {
    console.log('Socket.io já está rodando')
    return NextResponse.json({ success: true, message: 'Socket.io já inicializado' })
  }

  try {
    // Cria servidor HTTP customizado (Next.js usa isso internamente)
    const httpServer = (req as any).socket?.server

    if (!httpServer) {
      console.log('Servidor HTTP não encontrado, Socket.io será inicializado na próxima requisição')
      return NextResponse.json({ success: true, message: 'Aguardando servidor HTTP' })
    }

    // Inicializa Socket.io
    const io = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*', // Em produção, coloca seu domínio aqui
        methods: ['GET', 'POST']
      }
    })

    // Salva instância globalmente
    ;(global as any).io = io

    console.log('✅ Socket.io inicializado com sucesso!')

    // Event handlers
    io.on('connection', (socket) => {
      console.log('🔵 Usuário conectado:', socket.id)

      // Entrar em sala de conversa
      socket.on('join_conversation', (conversationId: string) => {
        socket.join(conversationId)
        console.log(`👤 Socket ${socket.id} entrou na conversa ${conversationId}`)
      })

      // Sair de sala de conversa
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(conversationId)
        console.log(`👋 Socket ${socket.id} saiu da conversa ${conversationId}`)
      })

      // Desconexão
      socket.on('disconnect', () => {
        console.log('🔴 Usuário desconectado:', socket.id)
      })
    })

    return NextResponse.json({ success: true, message: 'Socket.io inicializado' })
  } catch (error) {
    console.error('❌ Erro ao inicializar Socket.io:', error)
    return NextResponse.json({ success: false, error: 'Erro ao inicializar Socket.io' }, { status: 500 })
  }
}

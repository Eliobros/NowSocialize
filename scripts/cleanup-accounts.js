const { MongoClient, ObjectId } = require("mongodb");

async function cleanupAccounts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db("socializenow");
    
    console.log("🗑️  Iniciando limpeza de contas...");
    
    const now = new Date();
    
    // Buscar contas marcadas para exclusão que já passaram do prazo
    const accountsToDelete = await db.collection("users").find({
      markedForDeletion: true,
      deletionScheduledAt: { $lte: now }
    }).toArray();
    
    console.log(`📋 Encontradas ${accountsToDelete.length} contas para exclusão`);
    
    for (const account of accountsToDelete) {
      const userId = account._id;
      
      try {
        // Deletar todos os dados relacionados ao usuário
        console.log(`🗑️  Deletando conta: ${account.name} (${account.email})`);
        
        // Deletar posts do usuário
        const postsResult = await db.collection("posts").deleteMany({ authorId: userId });
        console.log(`   📝 Posts deletados: ${postsResult.deletedCount}`);
        
        // Deletar likes do usuário
        const likesResult = await db.collection("likes").deleteMany({ userId });
        console.log(`   ❤️  Likes deletados: ${likesResult.deletedCount}`);
        
        // Deletar comentários do usuário
        const commentsResult = await db.collection("comments").deleteMany({ authorId: userId });
        console.log(`   💬 Comentários deletados: ${commentsResult.deletedCount}`);
        
        // Deletar mensagens do usuário
        const messagesResult = await db.collection("messages").deleteMany({ 
          $or: [{ sender: userId }, { receiver: userId }] 
        });
        console.log(`   📨 Mensagens deletadas: ${messagesResult.deletedCount}`);
        
        // Deletar conversas do usuário
        const conversationsResult = await db.collection("conversations").deleteMany({
          participants: userId
        });
        console.log(`   💬 Conversas deletadas: ${conversationsResult.deletedCount}`);
        
        // Deletar notificações do usuário
        const notificationsResult = await db.collection("notifications").deleteMany({
          $or: [{ userId }, { fromUserId: userId }]
        });
        console.log(`   🔔 Notificações deletadas: ${notificationsResult.deletedCount}`);
        
        // Deletar stories do usuário
        const storiesResult = await db.collection("stories").deleteMany({ authorId: userId });
        console.log(`   📸 Stories deletados: ${storiesResult.deletedCount}`);
        
        // Deletar reels do usuário
        const reelsResult = await db.collection("reels").deleteMany({ authorId: userId });
        console.log(`   🎥 Reels deletados: ${reelsResult.deletedCount}`);
        
        // Remover usuário de listas de seguidores/seguindo
        await db.collection("users").updateMany(
          {},
          { 
            $pull: { 
              followers: userId,
              following: userId 
            } 
          }
        );
        console.log(`   👥 Removido de listas de seguidores`);
        
        // Deletar chaves de criptografia
        const encryptionResult = await db.collection("encryption_keys").deleteMany({ userId });
        console.log(`   🔐 Chaves de criptografia deletadas: ${encryptionResult.deletedCount}`);
        
        // Por fim, deletar a conta do usuário
        await db.collection("users").deleteOne({ _id: userId });
        console.log(`   ✅ Conta deletada com sucesso`);
        
      } catch (error) {
        console.error(`❌ Erro ao deletar conta ${account.email}:`, error);
      }
    }
    
    console.log("✅ Limpeza de contas concluída!");
    
  } catch (error) {
    console.error("❌ Erro na limpeza de contas:", error);
  } finally {
    await client.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanupAccounts();
}

module.exports = cleanupAccounts;
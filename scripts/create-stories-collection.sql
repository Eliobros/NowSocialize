-- Criar coleção de stories
db.createCollection("stories")

-- Criar índices para stories
db.stories.createIndex({ "author": 1 })
db.stories.createIndex({ "createdAt": -1 })
db.stories.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 }) -- Stories expiram em 24 horas

#!/bin/bash

# Lista de arquivos para corrigir
files=(
  "app/api/profile/[userId]/posts/route.ts"
  "app/api/profile/[userId]/route.ts"
  "app/api/reels/[reelId]/like/route.ts"
  "app/api/reels/[reelId]/view/route.ts"
  "app/api/posts/[postId]/like/route.ts"
  "app/api/posts/[postId]/route.ts"
  "app/api/stories/[storyId]/like/route.ts"
  "app/api/stories/[storyId]/view/route.ts"
  "app/api/notifications/[notificationId]/read/route.ts"
  "app/api/pages/[pageId]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Corrigindo $file..."
    # Substitui a tipagem antiga pela nova
    sed -i 's/{ params }: { params: { \([^}]*\) }/{ params }: { params: Promise<{ \1 }>/g' "$file"
    # Adiciona await antes de params (nas linhas que fazem destructuring)
    sed -i 's/const { \([^}]*\) } = params/const { \1 } = await params/g' "$file"
  fi
done

echo "Correção concluída!"

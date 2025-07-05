import { Suspense } from "react"
import VerificaContent from "./VerificaClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VerificaContent />
    </Suspense>
  )
}
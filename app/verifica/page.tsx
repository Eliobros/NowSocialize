import { Suspense } from "react"
import VerificaContent from "./VerificaContent"

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VerificaContent />
    </Suspense>
  )
}
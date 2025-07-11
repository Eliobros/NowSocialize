"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function EmailVerificado() {
  const [countdown, setCountdown] = useState(10)
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    if (countdown === 0) {
      clearInterval(timer)
      router.push("/feed")
    }

    return () => clearInterval(timer)
  }, [countdown, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-700 mb-4">✅ E-mail verificado com sucesso!</h1>
        <p className="text-gray-700 mb-6">
          Você será redirecionado ao feed em <span className="font-semibold">{countdown}</span> segundos.
        </p>
        <button
          onClick={() => router.push("/feed")}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Voltar agora
        </button>
      </div>
    </div>
  )
}

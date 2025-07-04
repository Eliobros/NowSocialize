import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SocializeNow - Conecte-se com o mundo",
  description: "A rede social que conecta pessoas ao redor do mundo.",
  openGraph: {
    title: "SocializeNow - Conecte-se com o mundo",
    description: "A rede social que conecta pessoas ao redor do mundo.",
    url: "https://socializenow.onrender.com", // troque pelo seu domínio
    siteName: "SocializeNow",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SocializeNow - Conecte-se com o mundo",
    description: "A rede social que conecta pessoas ao redor do mundo.",
    creator: "@seuuser", // se tiver Twitter
  },
  icons: {
    icon: "/soocializenow.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="https://progressier.app/WqR446EWpW6NmDDNQwu9/progressier.json" />
        <script defer src="https://progressier.app/WqR446EWpW6NmDDNQwu9/script.js"></script>
      </head>
      <body className={`${inter.className} pb-20 md:pb-0`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

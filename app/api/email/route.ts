import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message } = await request.json()

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,  // seu email Gmail
        pass: process.env.GMAIL_PASS,  // senha ou app password
      },
    })

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      text: message,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ message: 'Email enviado com sucesso!' })
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    )
  }
}

import mongoose, { Schema } from 'mongoose'

const paymentSchema = new Schema({
  numero: String,
  nome: String,
  email: String,
  valor: String,
  meio_de_pagamento: String,
  status: { type: String, default: 'pendente' }, // ou 'sucesso'
  createdAt: { type: Date, default: Date.now },
})

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)

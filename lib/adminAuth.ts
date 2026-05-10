import { NextRequest } from "next/server"

export function isAdminAuthorized(request: NextRequest) {
  const token = request.headers.get("x-admin-token")
  return token === process.env.ADMIN_TOKEN
}

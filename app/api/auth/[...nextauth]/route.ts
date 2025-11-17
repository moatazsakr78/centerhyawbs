import { handlers } from "@/lib/auth.config"

// Force Node.js runtime (required for 'pg' database connections)
export const runtime = 'nodejs'

export const { GET, POST } = handlers

import { createApiHandler } from '../../../../server/api.js'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const handle = createApiHandler()
export const GET = handle
export const POST = handle
export const PATCH = handle
export const PUT = handle
export const DELETE = handle

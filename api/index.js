// Vercel Function: vercel.json rewrites every /api/* request here, req.url keeps the original path.
import { createHandler } from '../server/index.js'
export default createHandler()

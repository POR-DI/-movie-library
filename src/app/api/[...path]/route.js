import { createApiHandler } from '../../../../server/api.js'
import { movieService } from '../../../../server/service.js'
export const GET = createApiHandler({ movieService })

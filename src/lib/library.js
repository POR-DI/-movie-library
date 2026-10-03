const same = (item, id, kind) =>
  item.tmdb_movie_id === id && item.kind === kind

export const idsOf = (items, kind) =>
  new Set(items.filter((i) => i.kind === kind).map((i) => i.tmdb_movie_id))

export function applyToggle(items, movie, kind, userId) {
  const removed = items.find((i) => same(i, movie.id, kind))
  if (removed)
    return {
      action: 'delete',
      row: { user_id: userId, tmdb_movie_id: movie.id, kind },
      removed,
      items: items.filter((i) => i !== removed),
    }
  const row = {
    user_id: userId,
    tmdb_movie_id: movie.id,
    kind,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
  }
  const { user_id: _owner, ...item } = row
  return {
    action: 'insert',
    row,
    items: [{ ...item, created_at: new Date().toISOString() }, ...items],
  }
}

// Undo one failed toggle against the latest items, leaving other toggles intact.
export function revertToggle(items, result) {
  const { tmdb_movie_id: id, kind } = result.row
  if (result.action === 'insert')
    return items.filter((i) => !same(i, id, kind))
  if (items.some((i) => same(i, id, kind))) return items
  return [result.removed, ...items].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
}

export const itemToMovie = (item) => ({
  id: item.tmdb_movie_id,
  title: item.title,
  poster_path: item.poster_path,
})

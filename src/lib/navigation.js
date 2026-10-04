const base = 'http://cineshelf.invalid'

// Resolve like the browser does (it strips tabs/newlines, so "/\t/evil.com" is "//evil.com")
// and keep only paths on this site; Next's router hard-navigates to external URLs.
export function safeNext(requested, fallback = '/library') {
  if (!requested?.startsWith('/')) return fallback
  let url
  try {
    url = new URL(requested, base)
  } catch {
    return fallback
  }
  if (url.origin !== base || /^\/(login|register)(?:\/|$)/.test(url.pathname))
    return fallback
  return url.pathname + url.search + url.hash
}

// toString() instead of .size: URLSearchParams.size is missing before Safari 17.
export function moviesHref(params) {
  const query = params.toString()
  return '/movies' + (query ? '?' + query : '')
}

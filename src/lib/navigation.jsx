'use client'
import Link from 'next/link'
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation'
import { useCallback, useEffect } from 'react'
// Small UI helpers over Next navigation; all routes are owned by App Router.
export function useLocation() {
  return { pathname: usePathname() }
}
export function useNavigate() {
  const router = useRouter()
  return useCallback(
    (href, options = {}) =>
      options.replace ? router.replace(href) : router.push(href),
    [router],
  )
}
export function useSearchParams() {
  const params = useNextSearchParams(),
    pathname = usePathname(),
    router = useRouter()
  const setParams = useCallback(
    (values, options = {}) => {
      const query = new URLSearchParams(values).toString()
      const href = pathname + (query ? '?' + query : '')
      if (options.replace) router.replace(href, { scroll: false })
      else router.push(href, { scroll: false })
    },
    [pathname, router],
  )
  return [params, setParams]
}
export function NavLink({
  href,
  end = false,
  className = '',
  children,
  ...props
}) {
  const pathname = usePathname()
  const active = end
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={[className, active ? 'active' : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {children}
    </Link>
  )
}
export function Navigate({ href, replace = false }) {
  const router = useRouter()
  useEffect(() => {
    if (replace) router.replace(href)
    else router.push(href)
  }, [href, replace, router])
  return null
}

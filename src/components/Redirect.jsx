'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from './States'
// Replaces react-router's <Navigate replace />.
export default function Redirect({ to }) {
  const router = useRouter()
  useEffect(() => router.replace(to), [router, to])
  return <Loading />
}

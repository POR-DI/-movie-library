'use client'

import { useRouter } from 'next/navigation'
export default function RefreshButton({ children }) {
  const router = useRouter()
  return <button onClick={() => router.refresh()}>{children}</button>
}

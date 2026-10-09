import { useEffect, useState } from 'react'
import { api } from '../lib/api'
// R1: shared loading/error state, optional URL, cleanup against stale responses.
export default function useFetch(url, initialData = null) {
  const [seedUrl] = useState(url)
  const [result, setResult] = useState({
    url: initialData ? url : null,
    data: initialData,
    error: null,
    loading: !initialData,
  })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!url) return
    if (initialData && url === seedUrl && attempt === 0) return
    const controller = new AbortController()
    let active = true
    setResult({ url, data: null, error: null, loading: true })
    api(url, { signal: controller.signal })
      .then((data) => {
        if (active) setResult({ url, data, error: null, loading: false })
      })
      .catch((error) => {
        if (active) setResult({ url, data: null, error, loading: false })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [url, attempt, initialData, seedUrl])
  function setData(data) {
    setResult({ url, data, error: null, loading: false })
  }
  function retry() {
    setAttempt((value) => value + 1)
  }
  if (!url) return { data: null, error: null, loading: false, retry, setData }
  if (result.url !== url)
    return { data: null, error: null, loading: true, retry, setData }
  return { ...result, retry, setData }
}

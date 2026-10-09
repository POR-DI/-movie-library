// Map insertion order tracks least-to-most recently used entries.
export class LruCache<K, V> {
  private entries = new Map<K, { value: V; expires: number }>()
  private capacity: number
  private ttl: number
  private now: () => number
  constructor(capacity: number, ttl: number, now: () => number = Date.now) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new RangeError('Cache capacity must be a positive integer')
    if (!Number.isFinite(ttl) || ttl < 0)
      throw new RangeError('Cache TTL must be non-negative and finite')
    this.capacity = capacity
    this.ttl = ttl
    this.now = now
  }
  get(key: K): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    this.entries.delete(key)
    if (entry.expires <= this.now()) return undefined
    this.entries.set(key, entry)
    return entry.value
  }
  set(key: K, value: V): void {
    this.entries.delete(key)
    this.entries.set(key, { value, expires: this.now() + this.ttl })
    if (this.entries.size > this.capacity)
      this.entries.delete(this.entries.keys().next().value!)
  }
  clear(): void {
    this.entries.clear()
  }
}

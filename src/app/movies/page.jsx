import { Suspense } from 'react'
import Movies from '../../views/Movies'
import { Loading } from '../../components/States'
export default function MoviesPage() {
  return (
    <Suspense fallback={<Loading cards />}>
      <Movies />
    </Suspense>
  )
}

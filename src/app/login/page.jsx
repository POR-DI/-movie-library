import { Suspense } from 'react'
import Auth from '../../views/Auth'
import { Loading } from '../../components/States'
export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Auth />
    </Suspense>
  )
}

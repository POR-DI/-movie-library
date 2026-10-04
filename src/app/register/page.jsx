import { Suspense } from 'react'
import Auth from '../../views/Auth'
import { Loading } from '../../components/States'
export default function RegisterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Auth register />
    </Suspense>
  )
}

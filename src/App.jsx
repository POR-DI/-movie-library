import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetail from './pages/MovieDetail'
import Library from './pages/Library'
import Auth from './pages/Auth'
import Shared from './pages/Shared'
import { About, NotFound } from './pages/Static'
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="movies" element={<Movies />} />
        <Route path="movies/:id" element={<MovieDetail />} />
        <Route path="library" element={<Library />} />
        <Route path="login" element={<Auth key="login" />} />
        <Route path="register" element={<Auth key="register" register />} />
        <Route path="s/:token" element={<Shared />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

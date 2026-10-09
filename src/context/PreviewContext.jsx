import { createContext, useContext, useState } from 'react'
const PreviewContext = createContext(null)
export function PreviewProvider({ children }) {
  const [movie, setMovie] = useState(null)
  return (
    <PreviewContext.Provider
      value={{ movie, preview: setMovie, close: () => setMovie(null) }}
    >
      {children}
    </PreviewContext.Provider>
  )
}
export const usePreview = () => useContext(PreviewContext)

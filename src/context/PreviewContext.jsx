import { createContext, useContext, useState } from 'react'
const PreviewContext = createContext(null)
export function PreviewProvider({ children }) {
  const [movie, setMovie] = useState(null)
  const [requestId, setRequestId] = useState(0)
  return (
    <PreviewContext.Provider
      value={{
        movie,
        requestId,
        preview: (selected) => {
          setMovie(selected)
          setRequestId((id) => id + 1)
        },
        close: () => setMovie(null),
      }}
    >
      {children}
    </PreviewContext.Provider>
  )
}
export const usePreview = () => useContext(PreviewContext)

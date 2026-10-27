import { useContext } from 'react'
import { EmbeddingBackfillContext } from '../context/EmbeddingBackfillContext'

export function useEmbeddingBackfill() {
  const value = useContext(EmbeddingBackfillContext)
  if (!value) throw new Error('EmbeddingBackfillProvider is required')
  return value
}

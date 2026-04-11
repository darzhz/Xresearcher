import { useState, useCallback } from 'react'
import { useLLM } from './useLLM'
import { getPageIndex, isRelevant } from '../lib/indexer'

export function useXReChat(paperId: string) {
  const { queryLLM } = useLLM()
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [readingSections, setReadingSections] = useState<string[]>([])

  const askQuestion = useCallback(async (query: string) => {
    if (!query.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)
    setReadingSections([])

    try {
      // 1. Fetch Index from Dexie
      const index = await getPageIndex(paperId)
      
      if (!index) {
        throw new Error('Paper index not found. Please ensure the paper is saved.')
      }

      // 2. Traversal: Find relevant sections
      const relevantSections = index.sections
        .filter(s => isRelevant(query, s))
        .slice(0, 2) // Limit to top 2 sections for SLM context window

      if (relevantSections.length > 0) {
        setReadingSections(relevantSections.map(s => s.title))
      } else {
        // Fallback to abstract if no specific section matches
        const abstract = index.sections.find(s => s.type === 'abstract')
        if (abstract) {
          relevantSections.push(abstract)
          setReadingSections(['Abstract (Fallback)'])
        }
      }

      // 3. Construct the "Newsprint" Prompt
      const context = relevantSections
        .map(s => `[[${s.title}]]:\n${s.content.slice(0, 3000)}`)
        .join('\n\n')

      const prompt = `
You are XReChat, a research assistant. 
Use the following context from a research paper to answer the user's question accurately and concisely.
If the answer is not in the context, say you don't know based on the provided sections.

CONTEXT:
${context}

QUESTION: ${query}
ANSWER:
`.trim()

      // 4. Query LLM
      const response = await queryLLM(prompt)
      
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'No response from model.' }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }])
    } finally {
      setLoading(false)
      setReadingSections([])
    }
  }, [paperId, queryLLM])

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    loading,
    readingSections,
    askQuestion,
    clearChat
  }
}

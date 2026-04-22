import { useState } from 'react'
import { AnalyzeUrlForm } from '../../components/AnalyzeUrlForm/AnalyzeUrlForm'
import { WordsPreview } from '../../components/WordsPreview/WordsPreview'
import { analyzeArticle } from '../../modules/articleAnalyzer/articleAnalyzer.api'
import type { AnalyzeArticleResponse } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import './HomePage.css'

const sampleUrls = [
  'https://www.reuters.com/',
  'https://apnews.com/',
  'https://www.npr.org/',
]

export function HomePage() {
  const [url, setUrl] = useState(sampleUrls[0])
  const [analysis, setAnalysis] = useState<AnalyzeArticleResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleAnalyze = async () => {
    const trimmedUrl = url.trim()

    if (!trimmedUrl) {
      setErrorMessage('Please enter an article URL.')
      setAnalysis(null)
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await analyzeArticle({ url: trimmedUrl })
      setAnalysis(response)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to analyze this article right now.'

      setErrorMessage(message)
      setAnalysis(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="home-page">
      <section className="home-page__controls">
        <AnalyzeUrlForm
          url={url}
          isLoading={isLoading}
          sampleUrls={sampleUrls}
          onUrlChange={setUrl}
          onSampleSelect={setUrl}
          onSubmit={handleAnalyze}
        />
      </section>

      <section className="home-page__visualization">
        <WordsPreview
          analysis={analysis}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      </section>
    </main>
  )
}
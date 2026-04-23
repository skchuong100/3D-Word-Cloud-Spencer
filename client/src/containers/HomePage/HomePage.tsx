import { useState } from 'react'
import { AnalyzeUrlForm } from '../../components/AnalyzeUrlForm/AnalyzeUrlForm'
import { WordsPreview } from '../../components/WordsPreview/WordsPreview'
import { analyzeArticle } from '../../modules/articleAnalyzer/articleAnalyzer.api'
import type { AnalyzeArticleResponse } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import './HomePage.css'

const sampleArticles = [
  {
    label: 'News Article 1',
    url: 'https://abcnews.com/US/georgia-wildfire-destroys-dozens-homes-spreads-5000-acres/story?id=132268739',
  },
  {
    label: 'News Article 2',
    url: 'https://www.npr.org/2026/04/22/nx-s1-5795403/golden-helmet-romania-recovery',
  },
  {
    label: 'News Article 3',
    url: 'https://abcnews.com/Technology/nasa-administrator-artemis-ii-1st-step-moon-base/story?id=131983922',
  },
]

export function HomePage() {
  const [url, setUrl] = useState(sampleArticles[0].url)
  const [analysis, setAnalysis] = useState<AnalyzeArticleResponse | null>(null)
  const [lastSuccessfulAnalysis, setLastSuccessfulAnalysis] =
    useState<AnalyzeArticleResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleAnalyze = async () => {
    const trimmedUrl = url.trim()

    if (!trimmedUrl) {
      setErrorMessage('Please enter an article URL.')
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await analyzeArticle({ url: trimmedUrl })
      setAnalysis(response)
      setLastSuccessfulAnalysis(response)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to analyze this article right now.'

      setAnalysis(null)
      setErrorMessage(message)
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
          sampleArticles={sampleArticles}
          onUrlChange={setUrl}
          onSampleSelect={setUrl}
          onSubmit={handleAnalyze}
        />
      </section>

      <section className="home-page__visualization">
        <WordsPreview
          analysis={analysis ?? lastSuccessfulAnalysis}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      </section>
    </main>
  )
}
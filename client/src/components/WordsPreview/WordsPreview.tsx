import { useEffect, useState } from 'react'
import type { AnalyzeArticleResponse } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import { WordCloudScene } from '../WordCloudScene/WordCloudScene'
import './WordsPreview.css'

type WordsPreviewProps = {
  analysis: AnalyzeArticleResponse | null
  isLoading: boolean
  errorMessage: string
}

export function WordsPreview({
  analysis,
  isLoading,
  errorMessage,
}: WordsPreviewProps) {
  const [lastSuccessfulAnalysis, setLastSuccessfulAnalysis] =
    useState<AnalyzeArticleResponse | null>(analysis)

  useEffect(() => {
    if (analysis) {
      setLastSuccessfulAnalysis(analysis)
    }
  }, [analysis])

  const activeAnalysis = analysis ?? lastSuccessfulAnalysis
  const hasScene = Boolean(activeAnalysis)
  const showLoadingOverlay = isLoading
  const showErrorOverlay = !isLoading && Boolean(errorMessage)
  const showOverlay = showLoadingOverlay || showErrorOverlay

  if (!hasScene && !isLoading && errorMessage) {
    return (
      <section className="words-preview">
        <div className="words-preview__empty">
          <p className="words-preview__error">{errorMessage}</p>
        </div>
      </section>
    )
  }

  if (!hasScene && !isLoading) {
    return (
      <section className="words-preview">
        <div className="words-preview__empty">
          <p>Paste a news article URL above to generate the word cloud.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="words-preview" aria-busy={isLoading}>
      {activeAnalysis ? (
        <div
          className={`words-preview__content ${
            showOverlay ? 'words-preview__content--covered' : ''
          }`}
        >
          <div className="words-preview__header">
            <p className="words-preview__kicker">Analysis preview</p>
            <h2 className="words-preview__title">{activeAnalysis.title}</h2>
            <p className="words-preview__url">{activeAnalysis.url}</p>
          </div>

          <div className="words-preview__scene-shell">
            <WordCloudScene words={activeAnalysis.words} />
          </div>
        </div>
      ) : null}

      {showLoadingOverlay ? (
        <div className="words-preview__overlay">
          <p>Loading article analysis...</p>
        </div>
      ) : null}

      {showErrorOverlay ? (
        <div className="words-preview__overlay">
          <p className="words-preview__error">{errorMessage}</p>
        </div>
      ) : null}

      {!activeAnalysis && isLoading ? (
        <div className="words-preview__empty">
          <p>Loading article analysis...</p>
        </div>
      ) : null}
    </section>
  )
}
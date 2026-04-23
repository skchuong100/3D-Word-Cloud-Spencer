import type { AnalyzeArticleResponse } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import { WordCloudScene } from '../WordCloudScene/WordCloudScene'
import './WordsPreview.css'

type WordsPreviewProps = {
  analysis: AnalyzeArticleResponse | null
  isLoading: boolean
  errorMessage: string
}

type OverlayState = 'loading' | 'error' | null

export function WordsPreview({
  analysis,
  isLoading,
  errorMessage,
}: WordsPreviewProps) {
  const overlayState: OverlayState = isLoading
    ? 'loading'
    : errorMessage
      ? 'error'
      : null

  const hasAnalysis = Boolean(analysis)
  const showEmptyState = !hasAnalysis && !overlayState
  const showOverlay = Boolean(overlayState)
  const isContentVisible = hasAnalysis && !showOverlay

  return (
    <section className="words-preview" aria-busy={isLoading}>
      {analysis ? (
        <div
          className={`words-preview__content ${
            isContentVisible
              ? 'words-preview__content--visible'
              : 'words-preview__content--hidden'
          }`}
        >
          <div className="words-preview__header">
            <p className="words-preview__kicker">Analysis preview</p>
            <h2 className="words-preview__title">{analysis.title}</h2>
            <p className="words-preview__url">{analysis.url}</p>
          </div>

          <div className="words-preview__scene-shell">
            <WordCloudScene words={analysis.words} />
          </div>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="words-preview__empty">
          <p>Paste a news article URL above to generate the word cloud.</p>
        </div>
      ) : null}

      <div
        className={`words-preview__overlay ${
          showOverlay
            ? 'words-preview__overlay--visible'
            : 'words-preview__overlay--hidden'
        }`}
        aria-hidden={!showOverlay}
      >
        {overlayState === 'loading' ? (
          <p>Loading article analysis...</p>
        ) : null}

        {overlayState === 'error' ? (
          <p className="words-preview__error">{errorMessage}</p>
        ) : null}
      </div>
    </section>
  )
}
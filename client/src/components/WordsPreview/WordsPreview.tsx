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
  if (isLoading) {
    return (
      <section className="words-preview">
        <div className="words-preview__empty">
          <p>Loading article analysis...</p>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="words-preview">
        <div className="words-preview__empty">
          <p className="words-preview__error">{errorMessage}</p>
        </div>
      </section>
    )
  }

  if (!analysis) {
    return (
      <section className="words-preview">
        <div className="words-preview__empty">
          <p>The 3D word area will go here in the next slice.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="words-preview">
      <div className="words-preview__header">
        <p className="words-preview__kicker">Analysis preview</p>
        <h2 className="words-preview__title">{analysis.title}</h2>
        <p className="words-preview__url">{analysis.url}</p>
      </div>

      <div className="words-preview__scene-shell">
        <WordCloudScene words={analysis.words} />
      </div>
    </section>
  )
}
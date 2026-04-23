import { useEffect, useRef, useState } from 'react'
import type { AnalyzeArticleResponse } from '../../modules/articleAnalyzer/articleAnalyzer.types'
import { WordCloudScene } from '../WordCloudScene/WordCloudScene'
import './WordsPreview.css'

type WordsPreviewProps = {
  analysis: AnalyzeArticleResponse | null
  isLoading: boolean
  errorMessage: string
}

type OverlayState = 'loading' | 'error' | null

const FADE_DURATION_MS = 280

export function WordsPreview({
  analysis,
  isLoading,
  errorMessage,
}: WordsPreviewProps) {
  const [displayedAnalysis, setDisplayedAnalysis] =
    useState<AnalyzeArticleResponse | null>(analysis)
  const [overlayState, setOverlayState] = useState<OverlayState>(null)
  const [isContentVisible, setIsContentVisible] = useState(Boolean(analysis))

  const timeoutRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (isLoading) {
      setOverlayState('loading')
      setIsContentVisible(false)
      return
    }

    if (errorMessage) {
      if (displayedAnalysis) {
        setOverlayState('error')
        setIsContentVisible(false)
      } else {
        setOverlayState('error')
      }

      return
    }

    if (!analysis) {
      if (!displayedAnalysis) {
        setOverlayState(null)
        setIsContentVisible(false)
      }

      return
    }

    if (!displayedAnalysis) {
      setDisplayedAnalysis(analysis)
      setOverlayState('loading')
      setIsContentVisible(false)

      animationFrameRef.current = window.requestAnimationFrame(() => {
        setOverlayState(null)
        setIsContentVisible(true)
      })

      return
    }

    if (displayedAnalysis === analysis) {
      setOverlayState(null)
      setIsContentVisible(true)
      return
    }

    timeoutRef.current = window.setTimeout(() => {
      setDisplayedAnalysis(analysis)

      animationFrameRef.current = window.requestAnimationFrame(() => {
        setOverlayState(null)
        setIsContentVisible(true)
      })
    }, FADE_DURATION_MS)
  }, [analysis, displayedAnalysis, errorMessage, isLoading])

  const showEmptyState = !displayedAnalysis && !overlayState

  return (
    <section className="words-preview" aria-busy={isLoading}>
      {displayedAnalysis ? (
        <div
          className={`words-preview__content ${
            isContentVisible
              ? 'words-preview__content--visible'
              : 'words-preview__content--hidden'
          }`}
        >
          <div className="words-preview__header">
            <p className="words-preview__kicker">Analysis preview</p>
            <h2 className="words-preview__title">{displayedAnalysis.title}</h2>
            <p className="words-preview__url">{displayedAnalysis.url}</p>
          </div>

          <div className="words-preview__scene-shell">
            <WordCloudScene words={displayedAnalysis.words} />
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
          overlayState ? 'words-preview__overlay--visible' : 'words-preview__overlay--hidden'
        }`}
        aria-hidden={!overlayState}
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
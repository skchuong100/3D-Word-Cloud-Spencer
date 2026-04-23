import type { FormEvent } from 'react'
import './AnalyzeUrlForm.css'

type SampleArticle = {
  label: string
  url: string
}

type AnalyzeUrlFormProps = {
  url: string
  isLoading: boolean
  sampleArticles: SampleArticle[]
  onUrlChange: (value: string) => void
  onSampleSelect: (value: string) => void
  onSubmit: () => void
}

export function AnalyzeUrlForm({
  url,
  isLoading,
  sampleArticles,
  onUrlChange,
  onSampleSelect,
  onSubmit,
}: AnalyzeUrlFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="analyze-url-form">
      <div className="analyze-url-form__copy">
        <p className="analyze-url-form__eyebrow">3D News Topic Explorer</p>
        <h1 className="analyze-url-form__title">
          Turn a news article into a weighted word cloud
        </h1>
        <p className="analyze-url-form__subcopy">
          Paste a news article URL, send it to the backend, and preview the
          top-ranked words in a 3D scene below.
        </p>
      </div>

      <form className="analyze-url-form__form" onSubmit={handleSubmit}>
        <label className="analyze-url-form__label" htmlFor="article-url">
          Article URL
        </label>

        <div className="analyze-url-form__field-row">
          <input
            id="article-url"
            className="analyze-url-form__input"
            type="url"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://example.com/news-story"
            required
          />
          <button
            className="analyze-url-form__button"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </form>

      <div className="analyze-url-form__samples">
        <p className="analyze-url-form__samples-label">Sample links</p>
        <div className="analyze-url-form__sample-list">
          {sampleArticles.map((sampleArticle) => (
            <button
              key={sampleArticle.url}
              className="analyze-url-form__sample-chip"
              type="button"
              onClick={() => onSampleSelect(sampleArticle.url)}
            >
              {sampleArticle.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
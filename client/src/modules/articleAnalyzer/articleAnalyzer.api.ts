import type {
  AnalyzeArticleRequest,
  AnalyzeArticleResponse,
} from './articleAnalyzer.types'

export async function analyzeArticle(
  payload: AnalyzeArticleRequest,
): Promise<AnalyzeArticleResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let message = 'Unable to analyze this article right now.'

    try {
      const errorData = (await response.json()) as { detail?: string }
      if (errorData.detail) {
        message = errorData.detail
      }
    } catch {
      message = 'Unable to analyze this article right now.'
    }

    throw new Error(message)
  }

  return (await response.json()) as AnalyzeArticleResponse
}
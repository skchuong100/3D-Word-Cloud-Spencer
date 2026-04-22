export type ArticleWord = {
  word: string
  score: number
  weight: number
}

export type AnalyzeArticleRequest = {
  url: string
}

export type AnalyzeArticleResponse = {
  url: string
  title: string
  words: ArticleWord[]
}
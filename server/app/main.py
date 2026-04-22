from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from app.article_analysis import ArticleAnalysisError, analyze_article_url

app = FastAPI(title="3D Word Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeArticleRequest(BaseModel):
    url: HttpUrl


class WordResult(BaseModel):
    word: str
    score: float
    weight: float


class AnalyzeArticleResponse(BaseModel):
    url: HttpUrl
    title: str
    words: list[WordResult]


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeArticleResponse)
async def analyze_article(payload: AnalyzeArticleRequest):
    try:
        analysis = analyze_article_url(str(payload.url))
    except ArticleAnalysisError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return AnalyzeArticleResponse(
        url=payload.url,
        title=analysis.title,
        words=[
            WordResult(
                word=item.word,
                score=item.score,
                weight=item.weight,
            )
            for item in analysis.words
        ],
    )
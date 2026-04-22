from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

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


PREVIEW_WORDS: list[tuple[str, float]] = [
    ("policy", 19.4),
    ("economy", 18.8),
    ("global", 17.9),
    ("market", 17.1),
    ("technology", 16.6),
    ("research", 15.8),
    ("company", 15.2),
    ("climate", 14.7),
    ("growth", 14.1),
    ("election", 13.5),
    ("health", 12.9),
    ("energy", 12.4),
    ("science", 11.8),
    ("security", 11.3),
    ("future", 10.9),
    ("trade", 10.4),
    ("data", 10.0),
    ("public", 9.6),
    ("industry", 9.1),
    ("digital", 8.7),
    ("policy-makers", 8.3),
    ("investment", 7.9),
    ("analysis", 7.5),
    ("supply", 7.1),
    ("innovation", 6.8),
]


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeArticleResponse)
async def analyze_article(payload: AnalyzeArticleRequest):
    parsed_url = urlparse(str(payload.url))
    domain = parsed_url.netloc.replace("www.", "") or "article"
    max_score = PREVIEW_WORDS[0][1]

    words = [
        WordResult(
            word=word,
            score=score,
            weight=round(score / max_score, 4),
        )
        for word, score in PREVIEW_WORDS
    ]

    return AnalyzeArticleResponse(
        url=payload.url,
        title=f"Preview analysis for {domain}",
        words=words,
    )
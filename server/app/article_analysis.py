import re
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
import trafilatura
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

MAX_RESULTS = 25
MIN_EXTRACTED_TEXT_LENGTH = 250

CUSTOM_STOP_WORDS = {
    "said",
    "says",
    "say",
    "reuters",
    "ap",
    "news",
    "report",
    "reports",
    "reporting",
    "according",
    "told",
    "including",
    "include",
    "mr",
    "mrs",
    "ms",
    "new",
    "also",
    "would",
    "could",
    "may",
    "might",
    "like",
    "still",
    "many",
    "much",
    "made",
    "make",
    "get",
    "go",
    "going",
    "last",
    "first",
    "second",
    "third",
    "one",
    "two",
    "three",
    "week",
    "weeks",
    "month",
    "months",
    "year",
    "years",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
}

STOP_WORDS = sorted(set(ENGLISH_STOP_WORDS).union(CUSTOM_STOP_WORDS))
SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")
WHITESPACE_PATTERN = re.compile(r"\s+")

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


class ArticleAnalysisError(Exception):
    pass


@dataclass
class RankedWord:
    word: str
    score: float
    weight: float


@dataclass
class ArticleAnalysisResult:
    title: str
    words: list[RankedWord]


def analyze_article_url(url: str) -> ArticleAnalysisResult:
    downloaded = fetch_document(url)

    extracted_text = extract_best_text(downloaded)
    cleaned_text = normalize_article_text(extracted_text)

    if len(cleaned_text) < MIN_EXTRACTED_TEXT_LENGTH:
        raise ArticleAnalysisError(
            "Could not extract enough readable article text from that URL."
        )

    chunks = build_text_chunks(cleaned_text)
    ranked_words = extract_ranked_words(chunks)

    if not ranked_words:
        raise ArticleAnalysisError("No usable keywords were found for that article.")

    metadata = trafilatura.extract_metadata(downloaded)
    title = extract_title(metadata, url)

    return ArticleAnalysisResult(title=title, words=ranked_words)


def fetch_document(url: str) -> str:
    downloaded = trafilatura.fetch_url(url)
    if downloaded:
        return downloaded

    try:
        response = requests.get(url, headers=REQUEST_HEADERS, timeout=15)
        response.raise_for_status()
        return response.text
    except requests.RequestException as error:
        raise ArticleAnalysisError("Unable to fetch content from that URL.") from error


def extract_best_text(downloaded: str) -> str:
    attempts = [
        trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            deduplicate=True,
            favor_precision=True,
        ),
        trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            deduplicate=True,
            favor_recall=True,
        ),
        trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            deduplicate=False,
            favor_recall=True,
        ),
    ]

    best_text = ""
    for attempt in attempts:
        if attempt and len(attempt) > len(best_text):
            best_text = attempt

    return best_text


def normalize_article_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)

    lines: list[str] = []
    for raw_line in normalized.split("\n"):
        line = WHITESPACE_PATTERN.sub(" ", raw_line).strip()
        if line:
            lines.append(line)

    return "\n".join(lines)


def build_text_chunks(text: str) -> list[str]:
    paragraphs = [
        paragraph.strip()
        for paragraph in text.split("\n")
        if len(paragraph.split()) >= 8
    ]

    if len(paragraphs) >= 4:
        return paragraphs

    sentences = split_sentences(text)
    if len(sentences) >= 6:
        return merge_sentences(sentences, window_size=3)

    return build_word_windows(text)


def split_sentences(text: str) -> list[str]:
    candidates = SENTENCE_SPLIT_PATTERN.split(text)
    return [sentence.strip() for sentence in candidates if len(sentence.split()) >= 6]


def merge_sentences(sentences: list[str], window_size: int) -> list[str]:
    chunks: list[str] = []

    for index in range(0, len(sentences), window_size):
        chunk = " ".join(sentences[index : index + window_size]).strip()
        if len(chunk.split()) >= 12:
            chunks.append(chunk)

    return chunks or [" ".join(sentences)]


def build_word_windows(text: str) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    window_size = 80
    step = 50

    for start in range(0, len(words), step):
        chunk_words = words[start : start + window_size]
        if len(chunk_words) >= 20:
            chunks.append(" ".join(chunk_words))
        if len(chunks) >= 12:
            break

    return chunks or [text]


def extract_ranked_words(chunks: list[str]) -> list[RankedWord]:
    ranked_terms = rank_terms(chunks, ngram_range=(1, 2))
    if not ranked_terms:
        ranked_terms = rank_terms(chunks, ngram_range=(1, 1))
    return ranked_terms


def rank_terms(chunks: list[str], ngram_range: tuple[int, int]) -> list[RankedWord]:
    try:
        vectorizer = TfidfVectorizer(
            stop_words=STOP_WORDS,
            lowercase=True,
            strip_accents="unicode",
            ngram_range=ngram_range,
            token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z\-]{2,}\b",
            max_features=300,
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform(chunks)
    except ValueError:
        return []

    feature_names = vectorizer.get_feature_names_out()
    raw_scores = matrix.sum(axis=0).tolist()[0]

    ranked_pairs = sorted(
        zip(feature_names, raw_scores),
        key=lambda item: item[1],
        reverse=True,
    )

    cleaned_pairs: list[tuple[str, float]] = []
    seen_terms: set[str] = set()

    for term, raw_score in ranked_pairs:
        cleaned_term = normalize_term(term)

        if not is_usable_term(cleaned_term):
            continue

        if cleaned_term in seen_terms:
            continue

        seen_terms.add(cleaned_term)
        cleaned_pairs.append((cleaned_term, float(raw_score)))

        if len(cleaned_pairs) == MAX_RESULTS:
            break

    if not cleaned_pairs:
        return []

    max_score = cleaned_pairs[0][1]

    return [
        RankedWord(
            word=term,
            score=round(score, 6),
            weight=round(score / max_score, 4) if max_score else 0.0,
        )
        for term, score in cleaned_pairs
    ]


def normalize_term(term: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", term).strip().lower()


def is_usable_term(term: str) -> bool:
    if len(term) < 3:
        return False

    if term.count(" ") > 1:
        return False

    if any(part in STOP_WORDS for part in term.split(" ")):
        return False

    if re.fullmatch(r"(?:[a-z])(?:\s+[a-z])+", term):
        return False

    return True


def extract_title(metadata: object, url: str) -> str:
    title = getattr(metadata, "title", None)

    if isinstance(title, str) and title.strip():
        return title.strip()

    domain = urlparse(url).netloc.replace("www.", "").strip()
    return domain or "Article analysis"
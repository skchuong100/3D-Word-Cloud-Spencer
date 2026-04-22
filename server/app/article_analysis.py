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
    "release",
    "released",
    "story",
    "stories",
    "source",
    "sources",
    "scheduled",
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
    unigram_candidates = rank_terms(
        chunks,
        ngram_range=(1, 1),
        limit=MAX_RESULTS * 5,
        remove_stop_words=True,
    )

    bigram_candidates = rank_terms(
        chunks,
        ngram_range=(2, 2),
        limit=MAX_RESULTS * 5,
        remove_stop_words=False,
    )

    candidates = merge_ranked_candidates(unigram_candidates, bigram_candidates)
    selected_pairs = filter_ranked_terms(candidates)

    if not selected_pairs:
        return []

    selected_pairs = sorted(selected_pairs, key=lambda item: item[1], reverse=True)
    max_score = max(score for _, score in selected_pairs)

    return [
        RankedWord(
            word=term,
            score=round(score, 6),
            weight=round(score / max_score, 4) if max_score else 0.0,
        )
        for term, score in selected_pairs
    ]


def rank_terms(
    chunks: list[str],
    ngram_range: tuple[int, int],
    limit: int,
    remove_stop_words: bool,
) -> list[tuple[str, float]]:
    try:
        token_pattern = get_token_pattern(ngram_range, remove_stop_words)

        vectorizer = TfidfVectorizer(
            stop_words=STOP_WORDS if remove_stop_words else None,
            lowercase=True,
            strip_accents="unicode",
            ngram_range=ngram_range,
            token_pattern=token_pattern,
            max_features=400,
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

        if len(cleaned_pairs) == limit:
            break

    return sorted(cleaned_pairs, key=candidate_sort_key, reverse=True)

def get_token_pattern(
    ngram_range: tuple[int, int],
    remove_stop_words: bool,
) -> str:
    if ngram_range == (2, 2) and not remove_stop_words:
        return r"(?u)\b[a-zA-Z][a-zA-Z\-]{1,}\b"

    return r"(?u)\b[a-zA-Z][a-zA-Z\-]{2,}\b"

def merge_ranked_candidates(
    unigram_candidates: list[tuple[str, float]],
    bigram_candidates: list[tuple[str, float]],
) -> list[tuple[str, float]]:
    merged: dict[str, float] = {}

    for term, score in unigram_candidates:
        merged[term] = max(score, merged.get(term, 0.0))

    for term, score in bigram_candidates:
        merged[term] = max(score, merged.get(term, 0.0))

    return sorted(merged.items(), key=candidate_sort_key, reverse=True)

def candidate_sort_key(item: tuple[str, float]) -> tuple[float, int, int]:
    term, score = item
    token_count = len(term.split())
    adjusted_score = score * (1.12 if token_count > 1 else 1.0)
    return (adjusted_score, token_count, len(term))


def filter_ranked_terms(candidates: list[tuple[str, float]]) -> list[tuple[str, float]]:
    selected: list[tuple[str, float]] = []

    for term, score in candidates:
        selected = remove_weaker_single_terms(term, score, selected)

        if should_skip_candidate(term, score, selected):
            continue

        selected.append((term, score))

        if len(selected) == MAX_RESULTS:
            break

    if len(selected) < MAX_RESULTS:
        selected_terms = {term for term, _ in selected}

        for term, score in candidates:
            if term in selected_terms:
                continue

            selected.append((term, score))
            selected_terms.add(term)

            if len(selected) == MAX_RESULTS:
                break

    return selected


def remove_weaker_single_terms(
    candidate_term: str,
    candidate_score: float,
    selected: list[tuple[str, float]],
) -> list[tuple[str, float]]:
    candidate_tokens = candidate_term.split()

    if len(candidate_tokens) <= 1:
        return selected

    candidate_token_set = set(candidate_tokens)
    filtered_selected: list[tuple[str, float]] = []

    for existing_term, existing_score in selected:
        existing_tokens = existing_term.split()

        if (
            len(existing_tokens) == 1
            and existing_term in candidate_token_set
            and candidate_score >= existing_score * 0.65
        ):
            continue

        filtered_selected.append((existing_term, existing_score))

    return filtered_selected


def should_skip_candidate(
    candidate_term: str,
    candidate_score: float,
    selected: list[tuple[str, float]],
) -> bool:
    candidate_tokens = candidate_term.split()
    candidate_token_set = set(candidate_tokens)

    for existing_term, existing_score in selected:
        existing_tokens = existing_term.split()
        existing_token_set = set(existing_tokens)
        shared_tokens = candidate_token_set & existing_token_set

        if not shared_tokens:
            continue

        if len(candidate_tokens) == 1 and len(existing_tokens) > 1:
            if candidate_term in existing_token_set and existing_score >= candidate_score * 0.7:
                return True

        if len(candidate_tokens) > 1 and len(existing_tokens) > 1:
            if candidate_token_set <= existing_token_set and existing_score >= candidate_score * 0.85:
                return True

            if existing_token_set <= candidate_token_set and existing_score >= candidate_score * 0.85:
                return True

    return False

def normalize_term(term: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", term).strip().lower()


def is_usable_term(term: str) -> bool:
    if len(term) < 3:
        return False

    tokens = term.split()

    if len(tokens) > 2:
        return False

    if any(len(token) < 2 for token in tokens):
        return False

    if len(tokens) == 1:
        if tokens[0] in STOP_WORDS:
            return False
    else:
        if any(token in STOP_WORDS for token in tokens):
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
from typing import Final

REPORTING_STOP_WORDS: Final[set[str]] = {
    "according",
    "ap",
    "news",
    "report",
    "reporting",
    "reports",
    "reuters",
    "said",
    "say",
    "says",
    "source",
    "sources",
    "story",
    "stories",
    "told",
}

GENERIC_FILLER_STOP_WORDS: Final[set[str]] = {
    "also",
    "could",
    "get",
    "go",
    "going",
    "include",
    "including",
    "like",
    "made",
    "make",
    "many",
    "may",
    "might",
    "much",
    "new",
    "one",
    "still",
    "three",
    "two",
    "would",
}

TIME_STOP_WORDS: Final[set[str]] = {
    "friday",
    "last",
    "monday",
    "month",
    "months",
    "saturday",
    "second",
    "sunday",
    "thursday",
    "third",
    "tuesday",
    "wednesday",
    "week",
    "weeks",
    "year",
    "years",
}

TITLE_METADATA_STOP_WORDS: Final[set[str]] = {
    "first",
    "mr",
    "mrs",
    "ms",
    "release",
    "released",
    "scheduled",
}

CUSTOM_STOP_WORDS: Final[set[str]] = (
    REPORTING_STOP_WORDS
    | GENERIC_FILLER_STOP_WORDS
    | TIME_STOP_WORDS
    | TITLE_METADATA_STOP_WORDS
)
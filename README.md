# 3D-Word-Cloud-Spencer

A full-stack project that takes a news article URL, extracts the article text on the backend, ranks important terms, and renders the results as an interactive 3D word cloud.

## Stack

### Frontend

* React
* TypeScript
* Vite
* React Three Fiber
* Drei
* Three.js

### Backend

* Python
* FastAPI
* Trafilatura
* scikit-learn

## Project Structure

```text
/client   React frontend
/server   FastAPI backend
```

Frontend organization:

* `src/containers` for page-level containers
* `src/components` for reusable UI components
* `src/modules` for backend communication logic
* `src/routes` for routing
* `src/types` for shared frontend type definitions

## Run the project

From the root of the repository on macOS:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

The root script will:

* install frontend dependencies
* create the backend virtual environment if needed
* install backend dependencies
* start both servers concurrently

After startup:

* Frontend: `http://localhost:5173`
* Backend: `http://127.0.0.1:8000`

## API

### `POST /analyze`

Request body:

```json
{
  "url": "https://example.com/article"
}
```

Response shape:

```json
{
  "url": "https://example.com/article",
  "title": "Article title",
  "words": [
    {
      "word": "example",
      "score": 1.234567,
      "weight": 0.91
    }
  ]
}
```

## Notes

* The backend extracts article text and ranks the top weighted terms.
* The frontend visualizes those terms in a 3D word cloud.
* The startup script is intended for macOS
* For local Windows testing, the script can be run through Git Bash.
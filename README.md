# 3D-Word-Cloud-Spencer

A small full-stack project that analyzes a news article URL and visualizes the extracted keywords as a 3D word cloud.

## Stack

Frontend:
- React
- TypeScript
- Vite
- React Three Fiber
- Drei
- Three.js

Backend:
- Python
- FastAPI
- Trafilatura
- scikit-learn

## Run the project

From the root of the repository on macOS:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

A couple small notes:

- I would use `start-dev.sh` instead of something like `setup.sh`, because this script is both installing and starting.
- Since the requirement says macOS only, a bash script is completely fine.
- Your existing `client/package.json` and `server/requirements.txt` are already enough for this; you do not need a root `package.json`.

After adding that, this requirement should be covered.
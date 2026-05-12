# Life in the UK Test Practice

A lightweight web app for practicing the **Life in the UK** exam with multiple study modes, progress tracking, bookmarks, and mistake review.

## Overview

This project includes:

- A static frontend (`index.html`, `style.css`, `app.js`) that runs entirely in the browser.
- A generated data file (`exams.json`) used by the app at runtime.
- Python scripts to generate study data from CSV sources.
- Pytest tests for the data-generation scripts.

The app is designed to be simple to run locally: serve the folder and open it in a browser.

## Features

- **Dashboard** with exam cards and progress stats.
- **Exam mode** with timed quizzes (45 minutes).
- **Random Exam** mode (24 random questions).
- **Marathon** mode (all questions, no timer).
- **Study mode** for all questions or per-exam review.
- **Bookmarks** to save and revisit specific questions.
- **Mistakes review** based on incorrect answers.
- **Persistent progress** via `localStorage` in the browser.

## Project Structure

```text
.
├─ index.html              # App layout and UI structure
├─ style.css               # App styling and responsive behavior
├─ app.js                  # Quiz logic, modes, navigation, persistence
├─ exams.json              # Runtime question dataset consumed by the app
├─ questions.csv           # Question source data
├─ answers.csv             # Answer source data
├─ exams.md                # Generated markdown study guide
├─ generate_json.py        # Builds exams.json from CSV files
├─ generate_markdown.py    # Downloads CSVs and builds exams.md
├─ tests/
│  ├─ test_generate_json.py
│  └─ test_generate_markdown.py
└─ pyproject.toml          # Python project/test configuration
```

## Requirements

- Python 3.14+ (as specified in `pyproject.toml`)
- A browser (Chrome, Edge, Firefox, etc.)

Python dependencies used in this repo:

- `pytest`
- `requests`

## Install Dependencies

If you use `uv`:

```bash
uv sync
```

Or with `pip`:

```bash
pip install -U pytest requests
```

## Run the Web App Locally

Because the app fetches `exams.json`, run it behind a local HTTP server (do not open `index.html` directly via `file://`).

From the project root:

```bash
python -m http.server 8000
```

Then open:

- [http://localhost:8000](http://localhost:8000)


## Notes

- User progress, bookmarks, and mistakes are stored in browser `localStorage`.
- Clearing browser storage will reset those values.
- If `exams.json` is missing or invalid, the app shows an error on the dashboard.

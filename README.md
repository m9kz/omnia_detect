# Image Detection API (FastAPI, Onion/DDD)

## Quickstart
```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

```bash
pip install -U requirements.txt
```

```bash
uvicorn app.presentation.main:app --reload
```

The API is now live.
You should see something like: 

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Uploading an image
Requst URL
```
POST http://localhost:8000/api/images
```

Response JSON
```json
{
    "image_id": "15b6f210-0e0b-4c5d-a9e3-0a7b29e8d5a1",
    "url": "http://localhost:8000/media/cat.jpg",
    "width": 1280,
    "height": 853,
    "filename": "cat.jpg"
}
```

## Runnning detection
Requst URL
```
POST http://localhost:8000/api/images/15b6f210-0e0b-4c5d-a9e3-0a7b29e8d5a1/detect
```

Response JSON
```json
{
  "image_id": "15b6f210-0e0b-4c5d-a9e3-0a7b29e8d5a1",
  "detections": [
    {
      "class_name": "cat",
      "confidence": 0.92,
      "bbox": {
        "x": 0.12,
        "y": 0.20,
        "w": 0.31,
        "h": 0.28
      }
    },
    {
      "class_name": "dog",
      "confidence": 0.76,
      "bbox": {
        "x": 0.55,
        "y": 0.33,
        "w": 0.38,
        "h": 0.42
      }
    }
  ]
}
```

## View Uploaded Image

Open in browser (for now)
```bash
http://localhost:8000/media/cat.jpg
```
# Image Detection API (FastAPI, Onion/DDD)

# Quickstart

## Create and activate a virtual environment
```bash
python -m venv .venv && source .venv/bin/activate

# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

## Install dependencies
```bash
pip install -r requirements.txt
```

## Run tthe API
```bash
uvicorn app.presentation.main:app --reload
```

### You should see something like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

The API is now live at: http://localhost:8000

# Architecture Overview

```graphql
app/
├── domain/                # Entities & pure business logic
│   ├── entities/          # RawFile, DatasetConfig, YoloDataset, etc.
│   └── services/          # DatasetBuilderService, etc.
│
├── application/           # Use cases orchestrating domain & infrastructure
│   ├── use_cases/         # BuildDataset, TrainModel, etc.
│   └── ports/             # Interfaces (Protocol classes)
│
├── infrastructure/        # External concerns (YOLO, DB, filesystem, zip)
│   ├── repo_sqlite.py     # SQLite repositories
│   ├── train_service.py   # YOLO training wrapper
│   └── zip_write.py       # ZIP writer for YOLO datasets
│
├── presentation/          # FastAPI routes, request/response schemas
│   ├── routes_dataset.py  # Build, list, download datasets
│   ├── routes_train.py    # Train from dataset, list models
│   └── routes_admin.py    # Hot-swap YOLO weights
│
└── core/
    ├── config.py          # Settings & paths
    └── di.py              # Dependency injection container
```

# Uploading an image

## Requst URL
```
POST http://localhost:8000/api/images
```

## Response JSON
```json
{
    "image_id": "15b6f210-0e0b-4c5d-a9e3-0a7b29e8d5a1",
    "url": "http://localhost:8000/media/cat.jpg",
    "width": 1280,
    "height": 853,
    "filename": "cat.jpg"
}
```

You can open the image directly:
```bash
http://localhost:8000/media/cat.jpg
```

# Runnning detection

## Requst URL
```
POST http://localhost:8000/api/images/{image_id}/detect
```

## Response JSON
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

# Building a Dataset (for fine-tuning)

The builder pairs your uploaded images (.jpg/.png) with their YOLO label files (.txt), splits them into train/val sets, and produces a ready-to-train ZIP file.

## Request URL
```bash
POST http://localhost:8000/api/dataset/build
```

## Form Data

| **Field**     | **Type**| **Example**                 |
| ------------- | ------- | --------------------------- |
| `ratio`       | float   | `0.8`                       |
| `class_names` | str     | `orange_cat,black_cat`      |
| `image_files` | file[]  | multiple `.jpg` images      |
| `label_files` | file[]  | corresponding `.txt` labels |

## Response JSON
```json
{
  "id": "f4eac3b0-f81f-4c9b-a2e1-8b097efb3913",
  "class_names": ["orange_cat", "black_cat"],
  "ratio": 0.8,
  "num_pairs": 12,
  "train_count": 9,
  "val_count": 3,
  "created_at": "2025-10-22T12:45:18.392Z",
  "download_url": "http://localhost:8000/api/dataset/f4eac3b0-f81f-4c9b-a2e1-8b097efb3913/download"
}
```

The dataset is stored under data/datasets/<dataset_id>/dataset.zip
and is ready to use for training.

# List or Download Datasets

## Request URL
```bash
GET http://localhost:8000/api/dataset
GET http://localhost:8000/api/dataset/{dataset_id}/download
```

# Train a Model
Use a stored dataset to fine-tune YOLOv8.

## Request URL
```bash
POST http://localhost:8000/api/train/by-dataset
```

## Form Data

| **Field**    | **Type**| **Description**               |
| ------------ | ------- | ----------------------------- |
| `dataset_id` | UUID    | ID of dataset created earlier |
| `epochs`     | int     | Number of training epochs     |
| `imgsz`      | int     | Image size (default: 640)     |

## Reponse JSON
```json
{
  "id": "3dfad9e0-f282-4f4c-9d19-2e02b24b1f93",
  "dataset_id": "f4eac3b0-f81f-4c9b-a2e1-8b097efb3913",
  "best_weights_path": "models/finetuned/3dfad9e0-f282-4f4c-9d19-2e02b24b1f93/best.pt",
  "epochs": 10,
  "imgsz": 640,
  "created_at": "2025-10-22T12:53:00.391Z",
  "metrics_path": "models/finetuned/3dfad9e0-f282-4f4c-9d19-2e02b24b1f93/results.yaml"
}
```

# Swap Model Weights (Hot-Reload Detector)
Apply a trained model immediately without redeploying.

## Request URL
```bash
POST http://localhost:8000/api/admin/detector/swap/{model_id}
```

## Response JSON
```bash
{
  "ok": true,
  "weights": "models/finetuned/3dfad9e0-f282-4f4c-9d19-2e02b24b1f93/best.pt"
}
```

# API Summary
| **Endpoint**                          | **Method** | **Description**              |
| ------------------------------------- | ------     | ---------------------------- |
| `/api/images`                         | POST       | Upload image                 |
| `/api/images/{id}/detect`             | POST       | Run detection                |
| `/api/dataset/build`                  | POST       | Build and store YOLO dataset |
| `/api/dataset`                        | GET        | List datasets                |
| `/api/dataset/{id}/download`          | GET        | Download dataset ZIP         |
| `/api/train/by-dataset`               | POST       | Fine-tune YOLO on dataset    |
| `/api/admin/detector/swap/{model_id}` | POST       | Swap active weights          |

# License
MIT License © 2025 omnia


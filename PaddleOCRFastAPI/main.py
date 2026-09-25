# -*- coding: utf-8 -*-

# import uvicorn
import os

os.environ.setdefault("PADDLE_PDX_MODEL_SOURCE", "modelscope")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
# import uvicorn
import yaml

from models.RestfulModel import *
from routers import document, ocr, pdf_ocr, table
from utils.ImageHelper import *

app = FastAPI(title="Paddle OCR API",
              description="基于 Paddle OCR 和 FastAPI 的自用接口")


# 跨域设置
# The Node backend calls this service server-to-server, so browsers need no
# access by default. Set CORS_ALLOW_ORIGINS (comma separated) to open it up.
origins = [o.strip() for o in os.environ.get("CORS_ALLOW_ORIGINS", "").split(",") if o.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"]
    )

# Endpoints that read a server-side path or fetch an arbitrary URL let any
# caller read local files or make this box request internal addresses. They
# are off unless explicitly enabled for local experimentation.
REMOTE_FETCH_PATHS = {
    "/ocr/predict-by-path",
    "/ocr/predict-by-url",
    "/pdf/predict-by-url",
    "/table/predict-by-url",
}
ENABLE_REMOTE_FETCH = os.environ.get("ENABLE_REMOTE_FETCH", "").lower() in {"1", "true", "yes"}


@app.middleware("http")
async def block_remote_fetch(request: Request, call_next):
    if not ENABLE_REMOTE_FETCH and request.url.path.rstrip("/") in REMOTE_FETCH_PATHS:
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    return await call_next(request)


@app.on_event("startup")
def warm_up_ocr():
    document.start_warm_up()


@app.get("/health", tags=["Health"])
def health():
    # "ok" means the API is serving; `ocr_models` says whether scans can be
    # read yet ("pending" while the models load after a deploy).
    return {"status": "ok", "ocr_models": document.warmup_state["status"]}


app.include_router(document.router)
app.include_router(ocr.router)
app.include_router(pdf_ocr.router)
app.include_router(table.router)

# uvicorn.run(app=app, host="0.0.0.0", port=8000)

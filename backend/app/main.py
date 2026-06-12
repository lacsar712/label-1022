"""
Influencer Management Platform - Main Application
"""
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from .config import settings
from .database import engine, Base
from .utils.logger import logger, log_request
from .routers import auth, users, profile, categories, influencers, collaborations, statistics, tiers, deliverables, brands, brand_portal, pipelines, competitive_intelligence

# Import all models to ensure they are registered
from .models.user import User, Role
from .models.category import Category
from .models.tier import Tier
from .models.influencer import Influencer
from .models.collaboration import Collaboration
from .models.deliverable import ContentDeliverable
from .models.price_history import PriceHistory
from .models.brand import Brand, BrandCollaborationAuthorization
from .models.pipeline import InfluencerPipeline
from .models.competitive_intelligence import CompetitiveIntelligence


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    yield
    
    logger.info("Application shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="企业级Influencer管理平台API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests"""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration_ms = (time.time() - start_time) * 1000
    log_request(request.method, request.url.path, response.status_code, duration_ms)
    
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误，请稍后重试"}
    )


# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(profile.router)
app.include_router(categories.router)
app.include_router(tiers.router)
app.include_router(influencers.router)
app.include_router(collaborations.router)
app.include_router(deliverables.router)
app.include_router(statistics.router)
app.include_router(brands.router)
app.include_router(brand_portal.router)
app.include_router(pipelines.router)
app.include_router(competitive_intelligence.router)


@app.get("/", tags=["健康检查"])
async def root():
    """API根路径"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health", tags=["健康检查"])
async def health_check():
    """健康检查"""
    return {"status": "healthy"}

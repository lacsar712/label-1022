"""
Brand Portal Router - 品牌方门户专用路由
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from datetime import datetime, timedelta, date
from typing import Optional, List
from decimal import Decimal

from ..database import get_db
from ..utils.security import (
    get_current_user,
    is_brand_user,
    mask_phone,
    mask_email,
    mask_wechat,
    mask_contact_name
)
from ..models.brand import BrandCollaborationAuthorization, Brand
from ..models.collaboration import Collaboration
from ..models.influencer import Influencer
from ..models.user import User
from ..utils.logger import logger

router = APIRouter(prefix="/api/brand-portal", tags=["品牌方门户"])


async def get_brand_portal_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """品牌方门户用户依赖：校验角色为brand且关联了brand_id"""
    if not is_brand_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="仅限品牌方用户访问"
        )
    if not current_user.brand_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户未关联品牌，无法访问"
        )
    return current_user


def _build_masked_influencer(influencer: Influencer) -> dict:
    """构造脱敏后的达人信息字典"""
    return {
        "id": influencer.id,
        "name": influencer.name,
        "platform": influencer.platform,
        "account_id": influencer.account_id,
        "avatar": influencer.avatar,
        "followers": influencer.followers,
        "category_id": influencer.category_id,
        "contact_name": mask_contact_name(influencer.contact_name) if influencer.contact_name else None,
        "contact_phone": mask_phone(influencer.contact_phone) if influencer.contact_phone else None,
        "contact_email": mask_email(influencer.contact_email) if influencer.contact_email else None,
        "contact_wechat": mask_wechat(influencer.contact_wechat) if influencer.contact_wechat else None,
        "tags": influencer.tags,
        "tier_id": influencer.tier_id,
        "cost_per_post": float(influencer.cost_per_post) if influencer.cost_per_post else 0,
        "engagement_rate": float(influencer.engagement_rate) if influencer.engagement_rate else 0,
        "status": influencer.status
    }


def _get_authorized_collaboration_ids(db: Session, brand_id: int):
    """获取品牌已授权的合作ID子查询"""
    return db.query(BrandCollaborationAuthorization.collaboration_id).filter(
        BrandCollaborationAuthorization.brand_id == brand_id
    )


@router.get("/overview", summary="获取品牌门户总览数据")
async def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取品牌门户总览数据（根据品牌授权范围过滤）"""
    brand_id = current_user.brand_id
    authorized_ids = _get_authorized_collaboration_ids(db, brand_id)

    base_query = db.query(Collaboration).filter(Collaboration.id.in_(authorized_ids))

    total_collaborations = base_query.count()
    in_progress_count = base_query.filter(Collaboration.status == "in_progress").count()
    completed_count = base_query.filter(Collaboration.status == "completed").count()

    total_budget = db.query(func.sum(Collaboration.budget)).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or Decimal("0")

    total_spent = db.query(func.sum(Collaboration.actual_cost)).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or Decimal("0")

    spend_progress = 0.0
    if total_budget > 0:
        spend_progress = round((float(total_spent) / float(total_budget)) * 100, 2)

    total_views = db.query(func.sum(Collaboration.views)).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or 0

    total_likes = db.query(func.sum(Collaboration.likes)).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or 0

    total_comments = db.query(func.sum(Collaboration.comments)).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or 0

    total_shares = db.query(func.sum(Collaboration.shares)).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or 0

    influencer_count = db.query(func.count(func.distinct(Collaboration.influencer_id))).filter(
        Collaboration.id.in_(authorized_ids)
    ).scalar() or 0

    return {
        "collaborations": {
            "total": total_collaborations,
            "in_progress": in_progress_count,
            "completed": completed_count
        },
        "budget": {
            "total": float(total_budget),
            "spent": float(total_spent),
            "progress_percent": spend_progress
        },
        "engagement": {
            "total_views": int(total_views),
            "total_likes": int(total_likes),
            "total_comments": int(total_comments),
            "total_shares": int(total_shares)
        },
        "influencers_count": int(influencer_count)
    }


@router.get("/collaborations", summary="获取授权的合作列表")
async def get_collaborations(
    status: Optional[str] = Query(None, description="合作状态筛选"),
    keyword: Optional[str] = Query(None, description="项目名称关键词搜索"),
    start_date_from: Optional[date] = Query(None, description="开始日期起始"),
    start_date_to: Optional[date] = Query(None, description="开始日期截止"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取授权的合作列表（分页，支持筛选，达人信息脱敏）"""
    brand_id = current_user.brand_id
    authorized_ids = _get_authorized_collaboration_ids(db, brand_id)

    query = db.query(Collaboration).options(
        joinedload(Collaboration.influencer)
    ).filter(Collaboration.id.in_(authorized_ids))

    if status:
        query = query.filter(Collaboration.status == status)
    if keyword:
        query = query.filter(Collaboration.project_name.like(f"%{keyword}%"))
    if start_date_from:
        query = query.filter(Collaboration.start_date >= start_date_from)
    if start_date_to:
        query = query.filter(Collaboration.start_date <= start_date_to)

    total = query.count()

    collaborations = query.order_by(Collaboration.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }

    items = []
    for collab in collaborations:
        influencer_data = _build_masked_influencer(collab.influencer) if collab.influencer else None
        items.append({
            "id": collab.id,
            "project_name": collab.project_name,
            "status": collab.status,
            "status_label": status_labels.get(collab.status, collab.status),
            "start_date": collab.start_date.isoformat() if collab.start_date else None,
            "end_date": collab.end_date.isoformat() if collab.end_date else None,
            "budget": float(collab.budget) if collab.budget else 0,
            "actual_cost": float(collab.actual_cost) if collab.actual_cost else 0,
            "content_type": collab.content_type,
            "views": collab.views or 0,
            "likes": collab.likes or 0,
            "comments": collab.comments or 0,
            "shares": collab.shares or 0,
            "influencer": influencer_data,
            "created_at": collab.created_at.isoformat()
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/collaborations/{collab_id}", summary="获取单个合作详情")
async def get_collaboration_detail(
    collab_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取单个合作详情（校验授权范围，达人信息全脱敏）"""
    brand_id = current_user.brand_id

    is_authorized = db.query(BrandCollaborationAuthorization).filter(
        BrandCollaborationAuthorization.brand_id == brand_id,
        BrandCollaborationAuthorization.collaboration_id == collab_id
    ).first()

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="该合作不在您的授权范围内"
        )

    collab = db.query(Collaboration).options(
        joinedload(Collaboration.influencer)
    ).filter(Collaboration.id == collab_id).first()

    if not collab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作不存在"
        )

    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }

    influencer_data = _build_masked_influencer(collab.influencer) if collab.influencer else None

    return {
        "id": collab.id,
        "project_name": collab.project_name,
        "status": collab.status,
        "status_label": status_labels.get(collab.status, collab.status),
        "start_date": collab.start_date.isoformat() if collab.start_date else None,
        "end_date": collab.end_date.isoformat() if collab.end_date else None,
        "budget": float(collab.budget) if collab.budget else 0,
        "actual_cost": float(collab.actual_cost) if collab.actual_cost else 0,
        "content_type": collab.content_type,
        "content_requirements": collab.content_requirements,
        "deliverables": collab.deliverables,
        "notes": collab.notes,
        "views": collab.views or 0,
        "likes": collab.likes or 0,
        "comments": collab.comments or 0,
        "shares": collab.shares or 0,
        "influencer": influencer_data,
        "created_at": collab.created_at.isoformat(),
        "updated_at": collab.updated_at.isoformat()
    }


@router.get("/influencers", summary="获取合作过的达人列表")
async def get_influencers(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取合作过的达人列表（去重，联系方式脱敏，含合作次数统计）"""
    brand_id = current_user.brand_id
    authorized_ids = _get_authorized_collaboration_ids(db, brand_id)

    base_query = db.query(
        Influencer,
        func.count(Collaboration.id).label("collab_count")
    ).join(
        Collaboration, Collaboration.influencer_id == Influencer.id
    ).filter(
        Collaboration.id.in_(authorized_ids)
    ).group_by(Influencer.id)

    total = base_query.count()

    results = base_query.order_by(
        func.count(Collaboration.id).desc()
    ).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    items = []
    for influencer, collab_count in results:
        influencer_data = _build_masked_influencer(influencer)
        influencer_data["collaboration_count"] = collab_count
        items.append(influencer_data)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/campaign-progress", summary="获取预算消耗进度")
async def get_campaign_progress(
    order_by: str = Query("progress_desc", pattern=r'^(progress_desc|progress_asc|budget_desc|budget_asc)$', description="排序方式"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取预算消耗进度（按合作维度，支持排序）"""
    brand_id = current_user.brand_id
    authorized_ids = _get_authorized_collaboration_ids(db, brand_id)

    query = db.query(Collaboration).filter(Collaboration.id.in_(authorized_ids))

    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }

    collaborations = query.all()

    items = []
    for collab in collaborations:
        budget = float(collab.budget) if collab.budget else 0.0
        actual_cost = float(collab.actual_cost) if collab.actual_cost else 0.0
        progress_percent = 0.0
        if budget > 0:
            progress_percent = round((actual_cost / budget) * 100, 2)
        items.append({
            "collaboration_id": collab.id,
            "project_name": collab.project_name,
            "status": collab.status,
            "status_label": status_labels.get(collab.status, collab.status),
            "budget": budget,
            "spent": actual_cost,
            "progress_percent": progress_percent
        })

    if order_by == "progress_desc":
        items.sort(key=lambda x: x["progress_percent"], reverse=True)
    elif order_by == "progress_asc":
        items.sort(key=lambda x: x["progress_percent"])
    elif order_by == "budget_desc":
        items.sort(key=lambda x: x["budget"], reverse=True)
    elif order_by == "budget_asc":
        items.sort(key=lambda x: x["budget"])

    return items


@router.get("/status-distribution", summary="获取合作状态分布统计")
async def get_status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取合作状态分布统计"""
    brand_id = current_user.brand_id
    authorized_ids = _get_authorized_collaboration_ids(db, brand_id)

    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }

    result = db.query(
        Collaboration.status,
        func.count(Collaboration.id).label("count")
    ).filter(
        Collaboration.id.in_(authorized_ids)
    ).group_by(Collaboration.status).all()

    return [{
        "status": r.status,
        "status_label": status_labels.get(r.status, r.status),
        "count": r.count
    } for r in result]


@router.get("/engagement-trend", summary="获取近6个月效果趋势")
async def get_engagement_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_brand_portal_user)
):
    """获取近6个月的效果趋势（按月聚合：曝光/点赞/评论/分享）"""
    brand_id = current_user.brand_id
    authorized_ids = _get_authorized_collaboration_ids(db, brand_id)

    end_date = datetime.now()
    start_date = end_date - timedelta(days=30 * 6)

    result = db.query(
        extract('year', Collaboration.created_at).label('year'),
        extract('month', Collaboration.created_at).label('month'),
        func.sum(Collaboration.views).label('total_views'),
        func.sum(Collaboration.likes).label('total_likes'),
        func.sum(Collaboration.comments).label('total_comments'),
        func.sum(Collaboration.shares).label('total_shares')
    ).filter(
        Collaboration.id.in_(authorized_ids),
        Collaboration.created_at >= start_date
    ).group_by(
        extract('year', Collaboration.created_at),
        extract('month', Collaboration.created_at)
    ).order_by(
        extract('year', Collaboration.created_at),
        extract('month', Collaboration.created_at)
    ).all()

    months_map = {}
    for r in result:
        key = f"{int(r.year)}-{int(r.month):02d}"
        months_map[key] = {
            "month": key,
            "total_views": int(r.total_views or 0),
            "total_likes": int(r.total_likes or 0),
            "total_comments": int(r.total_comments or 0),
            "total_shares": int(r.total_shares or 0)
        }

    trend = []
    for i in range(5, -1, -1):
        target_date = end_date - timedelta(days=30 * i)
        key = f"{target_date.year}-{target_date.month:02d}"
        if key in months_map:
            trend.append(months_map[key])
        else:
            trend.append({
                "month": key,
                "total_views": 0,
                "total_likes": 0,
                "total_comments": 0,
                "total_shares": 0
            })

    return trend


"""
===============================
在 main.py 中注册路由的方法
===============================

1. 导入路由模块：
   from app.routers import brand_portal

2. 注册路由：
   app.include_router(brand_portal.router)

示例（完整main.py片段）：
---
from fastapi import FastAPI
from app.routers import auth, users, influencers, collaborations, statistics, brand_portal

app = FastAPI(title="ModelX API")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(influencers.router)
app.include_router(collaborations.router)
app.include_router(statistics.router)
app.include_router(brand_portal.router)  # <-- 添加这行
---
"""

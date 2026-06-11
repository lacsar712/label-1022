"""
Statistics Router - Dashboard Statistics
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models.influencer import Influencer
from ..models.collaboration import Collaboration
from ..models.category import Category
from ..models.user import User
from ..utils.security import get_current_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/statistics", tags=["数据统计"])


@router.get("/overview", summary="获取总览统计")
async def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取仪表盘总览数据"""
    # Total influencers
    total_influencers = db.query(Influencer).count()
    active_influencers = db.query(Influencer).filter(Influencer.status == "active").count()
    
    # Total collaborations
    total_collaborations = db.query(Collaboration).count()
    active_collaborations = db.query(Collaboration).filter(Collaboration.status == "in_progress").count()
    completed_collaborations = db.query(Collaboration).filter(Collaboration.status == "completed").count()
    
    # Total followers (sum of all influencers)
    total_followers = db.query(func.sum(Influencer.followers)).scalar() or 0
    
    # Total budget and actual cost
    total_budget = db.query(func.sum(Collaboration.budget)).scalar() or 0
    total_cost = db.query(func.sum(Collaboration.actual_cost)).scalar() or 0
    
    # Total engagement (views, likes, comments, shares)
    total_views = db.query(func.sum(Collaboration.views)).scalar() or 0
    total_likes = db.query(func.sum(Collaboration.likes)).scalar() or 0
    total_comments = db.query(func.sum(Collaboration.comments)).scalar() or 0
    total_shares = db.query(func.sum(Collaboration.shares)).scalar() or 0
    
    # Categories count
    total_categories = db.query(Category).count()
    
    return {
        "influencers": {
            "total": total_influencers,
            "active": active_influencers
        },
        "collaborations": {
            "total": total_collaborations,
            "active": active_collaborations,
            "completed": completed_collaborations
        },
        "followers": total_followers,
        "budget": {
            "total": float(total_budget),
            "spent": float(total_cost)
        },
        "engagement": {
            "views": total_views,
            "likes": total_likes,
            "comments": total_comments,
            "shares": total_shares
        },
        "categories": total_categories
    }


@router.get("/platform-distribution", summary="获取平台分布")
async def get_platform_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取Influencer平台分布"""
    result = db.query(
        Influencer.platform,
        func.count(Influencer.id).label('count')
    ).group_by(Influencer.platform).all()
    
    return [{"platform": r.platform, "count": r.count} for r in result]


@router.get("/category-distribution", summary="获取分类分布")
async def get_category_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取Influencer分类分布"""
    result = db.query(
        Category.name,
        func.count(Influencer.id).label('count')
    ).outerjoin(Influencer, Category.id == Influencer.category_id).group_by(Category.id, Category.name).all()
    
    return [{"category": r.name, "count": r.count} for r in result]


@router.get("/collaboration-status", summary="获取合作状态分布")
async def get_collaboration_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取合作状态分布"""
    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }
    
    result = db.query(
        Collaboration.status,
        func.count(Collaboration.id).label('count')
    ).group_by(Collaboration.status).all()
    
    return [{"status": status_labels.get(r.status, r.status), "value": r.status, "count": r.count} for r in result]


@router.get("/monthly-trends", summary="获取月度趋势")
async def get_monthly_trends(
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取月度合作趋势"""
    # Get data for past N months
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30 * months)
    
    result = db.query(
        extract('year', Collaboration.created_at).label('year'),
        extract('month', Collaboration.created_at).label('month'),
        func.count(Collaboration.id).label('count'),
        func.sum(Collaboration.budget).label('budget'),
        func.sum(Collaboration.actual_cost).label('cost')
    ).filter(
        Collaboration.created_at >= start_date
    ).group_by(
        extract('year', Collaboration.created_at),
        extract('month', Collaboration.created_at)
    ).order_by(
        extract('year', Collaboration.created_at),
        extract('month', Collaboration.created_at)
    ).all()
    
    trends = []
    for r in result:
        trends.append({
            "month": f"{int(r.year)}-{int(r.month):02d}",
            "count": r.count,
            "budget": float(r.budget or 0),
            "cost": float(r.cost or 0)
        })
    
    return trends


@router.get("/top-influencers", summary="获取Top Influencer")
async def get_top_influencers(
    limit: int = Query(10, ge=1, le=50),
    order_by: str = Query("followers", pattern=r'^(followers|collaborations|engagement)$'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取Top Influencer列表"""
    if order_by == "followers":
        influencers = db.query(Influencer).order_by(Influencer.followers.desc()).limit(limit).all()
        return [{
            "id": inf.id,
            "name": inf.name,
            "platform": inf.platform,
            "avatar": inf.avatar,
            "followers": inf.followers,
            "value": inf.followers
        } for inf in influencers]
    
    elif order_by == "collaborations":
        result = db.query(
            Influencer,
            func.count(Collaboration.id).label('collab_count')
        ).outerjoin(Collaboration).group_by(Influencer.id).order_by(
            func.count(Collaboration.id).desc()
        ).limit(limit).all()
        
        return [{
            "id": inf.id,
            "name": inf.name,
            "platform": inf.platform,
            "avatar": inf.avatar,
            "followers": inf.followers,
            "value": count
        } for inf, count in result]
    
    else:  # engagement
        result = db.query(
            Influencer,
            func.sum(Collaboration.views + Collaboration.likes + Collaboration.comments + Collaboration.shares).label('engagement')
        ).outerjoin(Collaboration).group_by(Influencer.id).order_by(
            func.sum(Collaboration.views + Collaboration.likes + Collaboration.comments + Collaboration.shares).desc()
        ).limit(limit).all()
        
        return [{
            "id": inf.id,
            "name": inf.name,
            "platform": inf.platform,
            "avatar": inf.avatar,
            "followers": inf.followers,
            "value": int(eng or 0)
        } for inf, eng in result]


@router.get("/recent-collaborations", summary="获取最近合作")
async def get_recent_collaborations(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取最近合作记录"""
    from sqlalchemy.orm import joinedload
    
    collaborations = db.query(Collaboration).options(
        joinedload(Collaboration.influencer)
    ).order_by(Collaboration.created_at.desc()).limit(limit).all()
    
    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }
    
    return [{
        "id": c.id,
        "project_name": c.project_name,
        "influencer_name": c.influencer.name if c.influencer else "未知",
        "influencer_avatar": c.influencer.avatar if c.influencer else None,
        "status": c.status,
        "status_label": status_labels.get(c.status, c.status),
        "budget": float(c.budget),
        "created_at": c.created_at.isoformat()
    } for c in collaborations]


@router.get("/operator-kpi", summary="获取运营人员 KPI 统计")
async def get_operator_kpi(
    year: int = Query(..., description="年份"),
    month: int = Query(..., description="月份", ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取指定月份各运营人员的 KPI 统计数据"""
    from sqlalchemy.orm import joinedload
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    status_labels = {
        "pending": "待开始",
        "in_progress": "进行中",
        "completed": "已完成",
        "cancelled": "已取消"
    }
    
    operators = db.query(User).filter(
        User.status == "active"
    ).all()
    
    operator_stats = []
    
    for operator in operators:
        collabs_query = db.query(Collaboration).options(
            joinedload(Collaboration.influencer)
        ).filter(
            Collaboration.user_id == operator.id,
            Collaboration.created_at >= start_date,
            Collaboration.created_at < end_date
        )
        
        collabs = collabs_query.all()
        collab_count = len(collabs)
        
        completed_collabs = [c for c in collabs if c.status == "completed"]
        completed_count = len(completed_collabs)
        
        total_budget = sum(float(c.budget or 0) for c in collabs)
        total_cost = sum(float(c.actual_cost or 0) for c in collabs)
        total_views = sum(c.views or 0 for c in collabs)
        
        avg_cpm = 0
        if total_views > 0 and total_cost > 0:
            avg_cpm = (total_cost / total_views) * 1000
        
        completion_rate = 0
        if collab_count > 0:
            completion_rate = round((completed_count / collab_count) * 100, 1)
        
        collab_list = []
        for c in collabs:
            collab_list.append({
                "id": c.id,
                "project_name": c.project_name,
                "influencer_name": c.influencer.name if c.influencer else "未知",
                "status": c.status,
                "status_label": status_labels.get(c.status, c.status),
                "budget": float(c.budget or 0),
                "actual_cost": float(c.actual_cost or 0),
                "views": c.views or 0,
                "likes": c.likes or 0,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "created_at": c.created_at.isoformat()
            })
        
        operator_stats.append({
            "user_id": operator.id,
            "username": operator.username,
            "nickname": operator.nickname or operator.username,
            "avatar": operator.avatar,
            "initiated_count": collab_count,
            "completed_count": completed_count,
            "completion_rate": completion_rate,
            "total_budget": total_budget,
            "total_cost": total_cost,
            "total_views": total_views,
            "avg_cpm": round(avg_cpm, 2),
            "collaborations": collab_list
        })
    
    operator_stats.sort(key=lambda x: x["completed_count"], reverse=True)
    
    team_totals = {
        "initiated_count": sum(s["initiated_count"] for s in operator_stats),
        "completed_count": sum(s["completed_count"] for s in operator_stats),
        "total_budget": sum(s["total_budget"] for s in operator_stats),
        "total_cost": sum(s["total_cost"] for s in operator_stats),
        "total_views": sum(s["total_views"] for s in operator_stats)
    }
    if team_totals["total_views"] > 0 and team_totals["total_cost"] > 0:
        team_totals["avg_cpm"] = round((team_totals["total_cost"] / team_totals["total_views"]) * 1000, 2)
    else:
        team_totals["avg_cpm"] = 0
    
    return {
        "year": year,
        "month": month,
        "team_totals": team_totals,
        "operators": operator_stats
    }

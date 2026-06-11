"""
Influencers Router - Influencer Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from ..database import get_db
from ..models.influencer import Influencer
from ..models.category import Category
from ..models.collaboration import Collaboration
from ..models.user import User
from ..schemas.influencer import (
    InfluencerCreate, 
    InfluencerUpdate, 
    InfluencerResponse,
    InfluencerListResponse
)
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger

router = APIRouter(prefix="/api/influencers", tags=["Influencer管理"])


@router.get("", response_model=InfluencerListResponse, summary="获取Influencer列表")
async def get_influencers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = None,
    platform: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    min_followers: Optional[int] = None,
    max_followers: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取Influencer列表
    - 支持分页
    - 支持多维度筛选
    """
    query = db.query(Influencer).options(joinedload(Influencer.category))
    
    # Apply filters
    if keyword:
        query = query.filter(
            or_(
                Influencer.name.contains(keyword),
                Influencer.account_id.contains(keyword),
                Influencer.tags.contains(keyword)
            )
        )
    
    if platform:
        query = query.filter(Influencer.platform == platform)
    
    if category_id:
        query = query.filter(Influencer.category_id == category_id)
    
    if status:
        query = query.filter(Influencer.status == status)
    
    if min_followers is not None:
        query = query.filter(Influencer.followers >= min_followers)
    
    if max_followers is not None:
        query = query.filter(Influencer.followers <= max_followers)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    influencers = query.order_by(Influencer.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Add collaboration count
    items = []
    for inf in influencers:
        collab_count = db.query(Collaboration).filter(Collaboration.influencer_id == inf.id).count()
        inf_dict = {
            "id": inf.id,
            "name": inf.name,
            "platform": inf.platform,
            "account_id": inf.account_id,
            "avatar": inf.avatar,
            "followers": inf.followers,
            "category_id": inf.category_id,
            "contact_name": inf.contact_name,
            "contact_phone": inf.contact_phone,
            "contact_email": inf.contact_email,
            "contact_wechat": inf.contact_wechat,
            "tags": inf.tags,
            "cost_per_post": inf.cost_per_post,
            "engagement_rate": inf.engagement_rate,
            "status": inf.status,
            "notes": inf.notes,
            "created_at": inf.created_at,
            "updated_at": inf.updated_at,
            "category": inf.category,
            "collaboration_count": collab_count
        }
        items.append(InfluencerResponse(**inf_dict))
    
    return InfluencerListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=InfluencerResponse, summary="创建Influencer")
async def create_influencer(
    influencer_data: InfluencerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建Influencer"""
    # Check category exists if provided
    if influencer_data.category_id:
        category = db.query(Category).filter(Category.id == influencer_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )
    
    new_influencer = Influencer(**influencer_data.model_dump())
    db.add(new_influencer)
    db.commit()
    db.refresh(new_influencer)
    
    logger.info(f"Influencer created: {new_influencer.name} by {current_user.username}")
    
    return InfluencerResponse(
        id=new_influencer.id,
        name=new_influencer.name,
        platform=new_influencer.platform,
        account_id=new_influencer.account_id,
        avatar=new_influencer.avatar,
        followers=new_influencer.followers,
        category_id=new_influencer.category_id,
        contact_name=new_influencer.contact_name,
        contact_phone=new_influencer.contact_phone,
        contact_email=new_influencer.contact_email,
        contact_wechat=new_influencer.contact_wechat,
        tags=new_influencer.tags,
        cost_per_post=new_influencer.cost_per_post,
        engagement_rate=new_influencer.engagement_rate,
        status=new_influencer.status,
        notes=new_influencer.notes,
        created_at=new_influencer.created_at,
        updated_at=new_influencer.updated_at,
        category=None,
        collaboration_count=0
    )


@router.get("/platforms", summary="获取平台列表")
async def get_platforms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有平台选项"""
    platforms = [
        {"value": "抖音", "label": "抖音"},
        {"value": "小红书", "label": "小红书"},
        {"value": "B站", "label": "B站"},
        {"value": "微博", "label": "微博"},
        {"value": "快手", "label": "快手"},
        {"value": "微信", "label": "微信"},
        {"value": "YouTube", "label": "YouTube"},
        {"value": "Instagram", "label": "Instagram"},
        {"value": "TikTok", "label": "TikTok"},
        {"value": "其他", "label": "其他"}
    ]
    return platforms


@router.get("/{influencer_id}", response_model=InfluencerResponse, summary="获取Influencer详情")
async def get_influencer(
    influencer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取Influencer详情"""
    influencer = db.query(Influencer).options(
        joinedload(Influencer.category)
    ).filter(Influencer.id == influencer_id).first()
    
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )
    
    collab_count = db.query(Collaboration).filter(Collaboration.influencer_id == influencer_id).count()
    
    return InfluencerResponse(
        id=influencer.id,
        name=influencer.name,
        platform=influencer.platform,
        account_id=influencer.account_id,
        avatar=influencer.avatar,
        followers=influencer.followers,
        category_id=influencer.category_id,
        contact_name=influencer.contact_name,
        contact_phone=influencer.contact_phone,
        contact_email=influencer.contact_email,
        contact_wechat=influencer.contact_wechat,
        tags=influencer.tags,
        cost_per_post=influencer.cost_per_post,
        engagement_rate=influencer.engagement_rate,
        status=influencer.status,
        notes=influencer.notes,
        created_at=influencer.created_at,
        updated_at=influencer.updated_at,
        category=influencer.category,
        collaboration_count=collab_count
    )


@router.put("/{influencer_id}", response_model=InfluencerResponse, summary="更新Influencer")
async def update_influencer(
    influencer_id: int,
    influencer_data: InfluencerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新Influencer"""
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )
    
    # Check category exists if provided
    if influencer_data.category_id:
        category = db.query(Category).filter(Category.id == influencer_data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )
    
    update_data = influencer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(influencer, field, value)
    
    db.commit()
    db.refresh(influencer)
    
    # Reload with category
    influencer = db.query(Influencer).options(
        joinedload(Influencer.category)
    ).filter(Influencer.id == influencer_id).first()
    
    collab_count = db.query(Collaboration).filter(Collaboration.influencer_id == influencer_id).count()
    
    logger.info(f"Influencer updated: {influencer.name} by {current_user.username}")
    
    return InfluencerResponse(
        id=influencer.id,
        name=influencer.name,
        platform=influencer.platform,
        account_id=influencer.account_id,
        avatar=influencer.avatar,
        followers=influencer.followers,
        category_id=influencer.category_id,
        contact_name=influencer.contact_name,
        contact_phone=influencer.contact_phone,
        contact_email=influencer.contact_email,
        contact_wechat=influencer.contact_wechat,
        tags=influencer.tags,
        cost_per_post=influencer.cost_per_post,
        engagement_rate=influencer.engagement_rate,
        status=influencer.status,
        notes=influencer.notes,
        created_at=influencer.created_at,
        updated_at=influencer.updated_at,
        category=influencer.category,
        collaboration_count=collab_count
    )


@router.delete("/{influencer_id}", summary="删除Influencer")
async def delete_influencer(
    influencer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除Influencer"""
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer不存在"
        )
    
    # Check for collaborations
    collab_count = db.query(Collaboration).filter(Collaboration.influencer_id == influencer_id).count()
    if collab_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该Influencer有 {collab_count} 条合作记录，无法删除"
        )
    
    db.delete(influencer)
    db.commit()
    
    logger.info(f"Influencer deleted: {influencer.name} by {current_user.username}")
    
    return {"message": "Influencer已删除"}

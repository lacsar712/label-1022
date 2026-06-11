"""
Tiers Router - 达人等级管理
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.tier import Tier
from ..models.influencer import Influencer
from ..models.user import User
from ..schemas.tier import TierCreate, TierUpdate, TierResponse
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger

router = APIRouter(prefix="/api/tiers", tags=["达人等级管理"])


@router.get("", response_model=List[TierResponse], summary="获取达人等级列表")
async def get_tiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有达人等级，按排序值排序"""
    tiers = db.query(Tier).order_by(Tier.sort_order, Tier.id).all()
    
    result = []
    for tier in tiers:
        tier_dict = {
            "id": tier.id,
            "name": tier.name,
            "color": tier.color,
            "min_followers": tier.min_followers,
            "max_followers": tier.max_followers,
            "sort_order": tier.sort_order,
            "description": tier.description,
            "created_at": tier.created_at,
            "updated_at": tier.updated_at,
            "influencer_count": db.query(Influencer).filter(Influencer.tier_id == tier.id).count()
        }
        result.append(TierResponse(**tier_dict))
    
    return result


@router.post("", response_model=TierResponse, summary="创建达人等级")
async def create_tier(
    tier_data: TierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建达人等级"""
    existing = db.query(Tier).filter(Tier.name == tier_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="等级名称已存在"
        )
    
    new_tier = Tier(**tier_data.model_dump())
    db.add(new_tier)
    db.commit()
    db.refresh(new_tier)
    
    logger.info(f"Tier created: {new_tier.name} by {current_user.username}")
    
    return TierResponse(
        id=new_tier.id,
        name=new_tier.name,
        color=new_tier.color,
        min_followers=new_tier.min_followers,
        max_followers=new_tier.max_followers,
        sort_order=new_tier.sort_order,
        description=new_tier.description,
        created_at=new_tier.created_at,
        updated_at=new_tier.updated_at,
        influencer_count=0
    )


@router.get("/{tier_id}", response_model=TierResponse, summary="获取达人等级详情")
async def get_tier(
    tier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取达人等级详情"""
    tier = db.query(Tier).filter(Tier.id == tier_id).first()
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="等级不存在"
        )
    
    influencer_count = db.query(Influencer).filter(Influencer.tier_id == tier_id).count()
    
    return TierResponse(
        id=tier.id,
        name=tier.name,
        color=tier.color,
        min_followers=tier.min_followers,
        max_followers=tier.max_followers,
        sort_order=tier.sort_order,
        description=tier.description,
        created_at=tier.created_at,
        updated_at=tier.updated_at,
        influencer_count=influencer_count
    )


@router.put("/{tier_id}", response_model=TierResponse, summary="更新达人等级")
async def update_tier(
    tier_id: int,
    tier_data: TierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新达人等级"""
    tier = db.query(Tier).filter(Tier.id == tier_id).first()
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="等级不存在"
        )
    
    if tier_data.name:
        existing = db.query(Tier).filter(
            Tier.name == tier_data.name,
            Tier.id != tier_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="等级名称已存在"
            )
    
    update_data = tier_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tier, field, value)
    
    db.commit()
    db.refresh(tier)
    
    logger.info(f"Tier updated: {tier.name} by {current_user.username}")
    
    influencer_count = db.query(Influencer).filter(Influencer.tier_id == tier_id).count()
    
    return TierResponse(
        id=tier.id,
        name=tier.name,
        color=tier.color,
        min_followers=tier.min_followers,
        max_followers=tier.max_followers,
        sort_order=tier.sort_order,
        description=tier.description,
        created_at=tier.created_at,
        updated_at=tier.updated_at,
        influencer_count=influencer_count
    )


@router.delete("/{tier_id}", summary="删除达人等级")
async def delete_tier(
    tier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除达人等级"""
    tier = db.query(Tier).filter(Tier.id == tier_id).first()
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="等级不存在"
        )
    
    influencer_count = db.query(Influencer).filter(Influencer.tier_id == tier_id).count()
    if influencer_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该等级下有 {influencer_count} 个达人，无法删除"
        )
    
    db.delete(tier)
    db.commit()
    
    logger.info(f"Tier deleted: {tier.name} by {current_user.username}")
    
    return {"message": "等级已删除"}


@router.post("/reorder", summary="批量调整等级排序")
async def reorder_tiers(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """批量调整等级排序
    order_data: { tier_id: sort_order }
    """
    orders = order_data.get("orders", {})
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="排序数据不能为空"
        )
    
    for tier_id, sort_order in orders.items():
        tier = db.query(Tier).filter(Tier.id == int(tier_id)).first()
        if tier:
            tier.sort_order = int(sort_order)
    
    db.commit()
    
    logger.info(f"Tiers reordered by {current_user.username}")
    
    return {"message": "排序已更新"}

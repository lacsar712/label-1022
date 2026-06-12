"""
Competitive Intelligence Router - 竞品情报管理
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models.competitive_intelligence import CompetitiveIntelligence
from ..models.influencer import Influencer
from ..models.user import User
from ..schemas.competitive_intelligence import (
    CompetitiveIntelligenceCreate,
    CompetitiveIntelligenceUpdate,
    CompetitiveIntelligenceResponse,
    CompetitiveIntelligenceListResponse,
)
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger

router = APIRouter(prefix="/api/competitive-intelligence", tags=["竞品情报"])


@router.get("", response_model=CompetitiveIntelligenceListResponse, summary="获取竞品情报列表")
async def get_competitive_intelligence_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = None,
    competitor_name: Optional[str] = None,
    influencer_id: Optional[int] = None,
    discovery_date_from: Optional[date] = None,
    discovery_date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取竞品情报列表
    - 支持分页
    - 支持多维度筛选和关键词检索
    """
    query = db.query(CompetitiveIntelligence).options(
        joinedload(CompetitiveIntelligence.influencer),
        joinedload(CompetitiveIntelligence.creator)
    )

    if keyword:
        query = query.filter(
            or_(
                CompetitiveIntelligence.competitor_name.contains(keyword),
                CompetitiveIntelligence.source.contains(keyword),
                CompetitiveIntelligence.notes.contains(keyword)
            )
        )

    if competitor_name:
        query = query.filter(CompetitiveIntelligence.competitor_name.contains(competitor_name))

    if influencer_id:
        query = query.filter(CompetitiveIntelligence.influencer_id == influencer_id)

    if discovery_date_from:
        query = query.filter(CompetitiveIntelligence.discovery_date >= discovery_date_from)

    if discovery_date_to:
        query = query.filter(CompetitiveIntelligence.discovery_date <= discovery_date_to)

    total = query.count()

    items = query.order_by(CompetitiveIntelligence.discovery_date.desc(), CompetitiveIntelligence.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()

    return CompetitiveIntelligenceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=CompetitiveIntelligenceResponse, summary="创建竞品情报")
async def create_competitive_intelligence(
    data: CompetitiveIntelligenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建竞品情报记录"""
    influencer = db.query(Influencer).filter(Influencer.id == data.influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer不存在"
        )

    new_record = CompetitiveIntelligence(
        **data.model_dump(),
        user_id=current_user.id
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    new_record = db.query(CompetitiveIntelligence).options(
        joinedload(CompetitiveIntelligence.influencer),
        joinedload(CompetitiveIntelligence.creator)
    ).filter(CompetitiveIntelligence.id == new_record.id).first()

    logger.info(f"Competitive intelligence created: {new_record.competitor_name} by {current_user.username}")

    return new_record


@router.get("/{record_id}", response_model=CompetitiveIntelligenceResponse, summary="获取竞品情报详情")
async def get_competitive_intelligence(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取竞品情报详情"""
    record = db.query(CompetitiveIntelligence).options(
        joinedload(CompetitiveIntelligence.influencer),
        joinedload(CompetitiveIntelligence.creator)
    ).filter(CompetitiveIntelligence.id == record_id).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="竞品情报记录不存在"
        )

    return record


@router.put("/{record_id}", response_model=CompetitiveIntelligenceResponse, summary="更新竞品情报")
async def update_competitive_intelligence(
    record_id: int,
    data: CompetitiveIntelligenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新竞品情报记录"""
    record = db.query(CompetitiveIntelligence).filter(CompetitiveIntelligence.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="竞品情报记录不存在"
        )

    update_data = data.model_dump(exclude_unset=True)

    if 'influencer_id' in update_data:
        influencer = db.query(Influencer).filter(Influencer.id == update_data['influencer_id']).first()
        if not influencer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Influencer不存在"
            )

    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    record = db.query(CompetitiveIntelligence).options(
        joinedload(CompetitiveIntelligence.influencer),
        joinedload(CompetitiveIntelligence.creator)
    ).filter(CompetitiveIntelligence.id == record_id).first()

    logger.info(f"Competitive intelligence updated: {record.competitor_name} by {current_user.username}")

    return record


@router.delete("/{record_id}", summary="删除竞品情报")
async def delete_competitive_intelligence(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除竞品情报记录"""
    record = db.query(CompetitiveIntelligence).filter(CompetitiveIntelligence.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="竞品情报记录不存在"
        )

    db.delete(record)
    db.commit()

    logger.info(f"Competitive intelligence deleted: {record.competitor_name} by {current_user.username}")

    return {"message": "竞品情报记录已删除"}

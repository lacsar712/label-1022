"""
Collaborations Router - Collaboration Management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models.collaboration import Collaboration
from ..models.influencer import Influencer
from ..models.user import User
from ..schemas.collaboration import (
    CollaborationCreate, 
    CollaborationUpdate, 
    CollaborationResponse,
    CollaborationListResponse,
    CollaborationStatusUpdate
)
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger

router = APIRouter(prefix="/api/collaborations", tags=["合作管理"])


@router.get("", response_model=CollaborationListResponse, summary="获取合作列表")
async def get_collaborations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    keyword: Optional[str] = None,
    influencer_id: Optional[int] = None,
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    start_date_from: Optional[date] = None,
    start_date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取合作列表
    - 支持分页
    - 支持多维度筛选
    """
    query = db.query(Collaboration).options(
        joinedload(Collaboration.influencer),
        joinedload(Collaboration.creator)
    )
    
    # Apply filters
    if keyword:
        query = query.filter(
            or_(
                Collaboration.project_name.contains(keyword),
                Collaboration.notes.contains(keyword)
            )
        )
    
    if influencer_id:
        query = query.filter(Collaboration.influencer_id == influencer_id)
    
    if status:
        query = query.filter(Collaboration.status == status)
    
    if content_type:
        query = query.filter(Collaboration.content_type == content_type)
    
    if start_date_from:
        query = query.filter(Collaboration.start_date >= start_date_from)
    
    if start_date_to:
        query = query.filter(Collaboration.start_date <= start_date_to)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    collaborations = query.order_by(Collaboration.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return CollaborationListResponse(
        items=collaborations,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=CollaborationResponse, summary="创建合作")
async def create_collaboration(
    collaboration_data: CollaborationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """创建合作"""
    # Check influencer exists
    influencer = db.query(Influencer).filter(Influencer.id == collaboration_data.influencer_id).first()
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer不存在"
        )
    
    # Validate dates
    if collaboration_data.start_date and collaboration_data.end_date:
        if collaboration_data.end_date < collaboration_data.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="结束日期不能早于开始日期"
            )
    
    new_collaboration = Collaboration(
        **collaboration_data.model_dump(),
        user_id=current_user.id
    )
    db.add(new_collaboration)
    db.commit()
    db.refresh(new_collaboration)
    
    # Reload with relations
    new_collaboration = db.query(Collaboration).options(
        joinedload(Collaboration.influencer),
        joinedload(Collaboration.creator)
    ).filter(Collaboration.id == new_collaboration.id).first()
    
    logger.info(f"Collaboration created: {new_collaboration.project_name} by {current_user.username}")
    
    return new_collaboration


@router.get("/statuses", summary="获取状态列表")
async def get_statuses(current_user: User = Depends(get_current_user)):
    """获取合作状态选项"""
    statuses = [
        {"value": "pending", "label": "待开始"},
        {"value": "in_progress", "label": "进行中"},
        {"value": "completed", "label": "已完成"},
        {"value": "cancelled", "label": "已取消"}
    ]
    return statuses


@router.get("/content-types", summary="获取内容类型列表")
async def get_content_types(current_user: User = Depends(get_current_user)):
    """获取内容类型选项"""
    types = [
        {"value": "图文", "label": "图文"},
        {"value": "短视频", "label": "短视频"},
        {"value": "长视频", "label": "长视频"},
        {"value": "直播", "label": "直播"},
        {"value": "故事/动态", "label": "故事/动态"},
        {"value": "其他", "label": "其他"}
    ]
    return types


@router.get("/{collaboration_id}", response_model=CollaborationResponse, summary="获取合作详情")
async def get_collaboration(
    collaboration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取合作详情"""
    collaboration = db.query(Collaboration).options(
        joinedload(Collaboration.influencer),
        joinedload(Collaboration.creator)
    ).filter(Collaboration.id == collaboration_id).first()
    
    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作记录不存在"
        )
    
    return collaboration


@router.put("/{collaboration_id}", response_model=CollaborationResponse, summary="更新合作")
async def update_collaboration(
    collaboration_id: int,
    collaboration_data: CollaborationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新合作"""
    collaboration = db.query(Collaboration).filter(Collaboration.id == collaboration_id).first()
    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作记录不存在"
        )
    
    # Validate dates if both provided
    update_data = collaboration_data.model_dump(exclude_unset=True)
    
    # Validate influencer if being changed
    if 'influencer_id' in update_data:
        influencer = db.query(Influencer).filter(Influencer.id == update_data['influencer_id']).first()
        if not influencer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Influencer不存在"
            )
    
    start = update_data.get('start_date', collaboration.start_date)
    end = update_data.get('end_date', collaboration.end_date)
    if start and end and end < start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="结束日期不能早于开始日期"
        )
    
    for field, value in update_data.items():
        setattr(collaboration, field, value)
    
    db.commit()
    db.refresh(collaboration)
    
    # Reload with relations
    collaboration = db.query(Collaboration).options(
        joinedload(Collaboration.influencer),
        joinedload(Collaboration.creator)
    ).filter(Collaboration.id == collaboration_id).first()
    
    logger.info(f"Collaboration updated: {collaboration.project_name} by {current_user.username}")
    
    return collaboration


@router.put("/{collaboration_id}/status", response_model=CollaborationResponse, summary="更新合作状态")
async def update_collaboration_status(
    collaboration_id: int,
    status_data: CollaborationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """更新合作状态"""
    collaboration = db.query(Collaboration).filter(Collaboration.id == collaboration_id).first()
    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作记录不存在"
        )
    
    collaboration.status = status_data.status
    db.commit()
    db.refresh(collaboration)
    
    # Reload with relations
    collaboration = db.query(Collaboration).options(
        joinedload(Collaboration.influencer),
        joinedload(Collaboration.creator)
    ).filter(Collaboration.id == collaboration_id).first()
    
    logger.info(f"Collaboration status updated: {collaboration.project_name} to {status_data.status} by {current_user.username}")
    
    return collaboration


@router.delete("/{collaboration_id}", summary="删除合作")
async def delete_collaboration(
    collaboration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除合作"""
    collaboration = db.query(Collaboration).filter(Collaboration.id == collaboration_id).first()
    if not collaboration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="合作记录不存在"
        )
    
    db.delete(collaboration)
    db.commit()
    
    logger.info(f"Collaboration deleted: {collaboration.project_name} by {current_user.username}")
    
    return {"message": "合作记录已删除"}

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from ..database import get_db
from ..models.deliverable import ContentDeliverable
from ..models.collaboration import Collaboration
from ..models.user import User
from ..schemas.deliverable import (
    DeliverableCreate,
    DeliverableUpdate,
    DeliverableResponse,
    DeliverableListResponse,
    CalendarDeliverableListResponse,
    CalendarDeliverableItem,
    CalendarCollaborationInfo
)
from ..utils.security import get_current_user, get_operator_or_admin, is_brand_user
from ..utils.logger import logger

router = APIRouter(prefix="/api/deliverables", tags=["内容交付物"])


@router.get("", response_model=DeliverableListResponse, summary="获取交付物列表")
async def get_deliverables(
    collaboration_id: int = Query(...),
    review_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ContentDeliverable).filter(
        ContentDeliverable.collaboration_id == collaboration_id
    )

    if review_status:
        query = query.filter(ContentDeliverable.review_status == review_status)

    items = query.order_by(ContentDeliverable.created_at.desc()).all()

    return DeliverableListResponse(items=items, total=len(items))


@router.post("", response_model=DeliverableResponse, summary="创建交付物")
async def create_deliverable(
    data: DeliverableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    collab = db.query(Collaboration).filter(Collaboration.id == data.collaboration_id).first()
    if not collab:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="合作记录不存在"
        )

    item = ContentDeliverable(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    logger.info(f"Deliverable created for collaboration {data.collaboration_id} by {current_user.username}")
    return item


@router.put("/{deliverable_id}", response_model=DeliverableResponse, summary="更新交付物")
async def update_deliverable(
    deliverable_id: int,
    data: DeliverableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    item = db.query(ContentDeliverable).filter(ContentDeliverable.id == deliverable_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交付物不存在"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    logger.info(f"Deliverable {deliverable_id} updated by {current_user.username}")
    return item


@router.delete("/{deliverable_id}", summary="删除交付物")
async def delete_deliverable(
    deliverable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    item = db.query(ContentDeliverable).filter(ContentDeliverable.id == deliverable_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交付物不存在"
        )

    db.delete(item)
    db.commit()

    logger.info(f"Deliverable {deliverable_id} deleted by {current_user.username}")
    return {"message": "交付物已删除"}


@router.get("/review-statuses", summary="获取审核状态列表")
async def get_review_statuses(current_user: User = Depends(get_current_user)):
    return [
        {"value": "pending", "label": "待审"},
        {"value": "approved", "label": "已通过"},
        {"value": "rejected", "label": "已驳回"}
    ]


@router.get("/platforms", summary="获取平台列表")
async def get_platforms(current_user: User = Depends(get_current_user)):
    return [
        {"value": "小红书", "label": "小红书"},
        {"value": "抖音", "label": "抖音"},
        {"value": "B站", "label": "B站"},
        {"value": "微博", "label": "微博"},
        {"value": "快手", "label": "快手"},
        {"value": "微信", "label": "微信"},
        {"value": "其他", "label": "其他"}
    ]


@router.get("/calendar", response_model=CalendarDeliverableListResponse, summary="获取日历视图交付物")
async def get_calendar_deliverables(
    start_date: date = Query(..., description="开始日期"),
    end_date: date = Query(..., description="结束日期"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    query = db.query(ContentDeliverable).join(
        Collaboration, ContentDeliverable.collaboration_id == Collaboration.id
    ).filter(
        ContentDeliverable.published_at.isnot(None),
        ContentDeliverable.published_at >= start_dt,
        ContentDeliverable.published_at <= end_dt
    )

    if is_brand_user(current_user):
        query = query.filter(Collaboration.user_id == current_user.id)

    items = query.order_by(ContentDeliverable.published_at.asc()).all()

    result_items = []
    for item in items:
        collab = item.collaboration
        influencer = collab.influencer if collab else None

        collab_info = CalendarCollaborationInfo(
            id=collab.id if collab else 0,
            project_name=collab.project_name if collab else "",
            content_type=collab.content_type if collab else None,
            influencer_name=influencer.name if influencer else None,
            influencer_platform=influencer.platform if influencer else None
        )

        result_items.append(CalendarDeliverableItem(
            id=item.id,
            collaboration_id=item.collaboration_id,
            platform=item.platform,
            content_link=item.content_link,
            published_at=item.published_at,
            review_status=item.review_status,
            notes=item.notes,
            collaboration=collab_info
        ))

    return CalendarDeliverableListResponse(items=result_items, total=len(result_items))

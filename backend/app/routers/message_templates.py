"""
Message Templates Router - 消息模板管理
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.message_template import MessageTemplate
from ..models.user import User
from ..schemas.message_template import (
    MessageTemplateCreate, 
    MessageTemplateUpdate, 
    MessageTemplateResponse,
    MessageTemplatePreviewRequest,
    MessageTemplateCategory
)
from ..utils.security import get_current_user, get_operator_or_admin
from ..utils.logger import logger
import re

router = APIRouter(prefix="/api/message-templates", tags=["消息模板管理"])


def parse_variables_from_content(content: str) -> List[str]:
    """从模板内容中解析变量"""
    pattern = r'\{([^}]+)\}'
    variables = re.findall(pattern, content)
    return list(set(variables))


def render_template(content: str, variables: dict) -> str:
    """渲染模板，替换变量"""
    def replace_var(match):
        var_name = match.group(1)
        return str(variables.get(var_name, match.group(0)))
    
    pattern = r'\{([^}]+)\}'
    return re.sub(pattern, replace_var, content)


@router.get("", response_model=List[MessageTemplateResponse], summary="获取消息模板列表")
async def get_message_templates(
    category: Optional[str] = Query(None, description="按分类筛选"),
    is_active: Optional[int] = Query(None, description="按状态筛选"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取消息模板列表，支持按分类和状态筛选"""
    query = db.query(MessageTemplate)
    
    if category:
        query = query.filter(MessageTemplate.category == category)
    if is_active is not None:
        query = query.filter(MessageTemplate.is_active == is_active)
    
    templates = query.order_by(MessageTemplate.category, MessageTemplate.sort_order, MessageTemplate.id).all()
    
    result = []
    for template in templates:
        variables = parse_variables_from_content(template.content)
        template_dict = {
            "id": template.id,
            "name": template.name,
            "category": template.category,
            "subject": template.subject,
            "content": template.content,
            "variables": ",".join(variables) if variables else template.variables,
            "description": template.description,
            "sort_order": template.sort_order,
            "is_active": template.is_active,
            "creator_id": template.creator_id,
            "creator_name": template.creator.nickname or template.creator.username if template.creator else None,
            "created_at": template.created_at,
            "updated_at": template.updated_at
        }
        result.append(MessageTemplateResponse(**template_dict))
    
    return result


@router.get("/categories", response_model=List[MessageTemplateCategory], summary="获取模板分类列表")
async def get_template_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有模板分类及数量统计"""
    from sqlalchemy import func
    results = db.query(
        MessageTemplate.category,
        func.count(MessageTemplate.id).label("count")
    ).filter(
        MessageTemplate.is_active == 1
    ).group_by(MessageTemplate.category).all()
    
    return [{"category": r.category, "count": r.count} for r in results]


@router.post("", response_model=MessageTemplateResponse, summary="创建消息模板")
async def create_message_template(
    template_data: MessageTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建消息模板"""
    variables = parse_variables_from_content(template_data.content)
    variables_str = ",".join(variables) if variables else None
    
    new_template = MessageTemplate(
        **template_data.model_dump(exclude={"variables"}),
        variables=variables_str,
        creator_id=current_user.id
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    logger.info(f"Message template created: {new_template.name} by {current_user.username}")
    
    return MessageTemplateResponse(
        id=new_template.id,
        name=new_template.name,
        category=new_template.category,
        subject=new_template.subject,
        content=new_template.content,
        variables=variables_str,
        description=new_template.description,
        sort_order=new_template.sort_order,
        is_active=new_template.is_active,
        creator_id=new_template.creator_id,
        creator_name=current_user.nickname or current_user.username,
        created_at=new_template.created_at,
        updated_at=new_template.updated_at
    )


@router.get("/{template_id}", response_model=MessageTemplateResponse, summary="获取消息模板详情")
async def get_message_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取消息模板详情"""
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    variables = parse_variables_from_content(template.content)
    
    return MessageTemplateResponse(
        id=template.id,
        name=template.name,
        category=template.category,
        subject=template.subject,
        content=template.content,
        variables=",".join(variables) if variables else template.variables,
        description=template.description,
        sort_order=template.sort_order,
        is_active=template.is_active,
        creator_id=template.creator_id,
        creator_name=template.creator.nickname or template.creator.username if template.creator else None,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.put("/{template_id}", response_model=MessageTemplateResponse, summary="更新消息模板")
async def update_message_template(
    template_id: int,
    template_data: MessageTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新消息模板"""
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    update_data = template_data.model_dump(exclude_unset=True)
    
    if "content" in update_data:
        variables = parse_variables_from_content(update_data["content"])
        update_data["variables"] = ",".join(variables) if variables else None
    
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    logger.info(f"Message template updated: {template.name} by {current_user.username}")
    
    variables = parse_variables_from_content(template.content)
    
    return MessageTemplateResponse(
        id=template.id,
        name=template.name,
        category=template.category,
        subject=template.subject,
        content=template.content,
        variables=",".join(variables) if variables else template.variables,
        description=template.description,
        sort_order=template.sort_order,
        is_active=template.is_active,
        creator_id=template.creator_id,
        creator_name=template.creator.nickname or template.creator.username if template.creator else None,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.delete("/{template_id}", summary="删除消息模板")
async def delete_message_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operator_or_admin)
):
    """删除消息模板"""
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    db.delete(template)
    db.commit()
    
    logger.info(f"Message template deleted: {template.name} by {current_user.username}")
    
    return {"message": "模板已删除"}


@router.post("/preview", summary="预览模板渲染效果")
async def preview_template(
    preview_data: MessageTemplatePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """预览模板渲染效果，替换变量"""
    template = db.query(MessageTemplate).filter(MessageTemplate.id == preview_data.template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    rendered_content = render_template(template.content, preview_data.variables)
    rendered_subject = render_template(template.subject or "", preview_data.variables)
    
    return {
        "subject": rendered_subject,
        "content": rendered_content,
        "original_subject": template.subject,
        "original_content": template.content,
        "variables_used": list(preview_data.variables.keys())
    }


@router.get("/{template_id}/variables", summary="获取模板所需变量")
async def get_template_variables(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取模板所需的变量列表"""
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模板不存在"
        )
    
    variables = parse_variables_from_content(template.content)
    
    return {
        "variables": variables,
        "count": len(variables)
    }

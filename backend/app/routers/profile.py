"""
Profile Router - Personal Center
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserResponse, UserUpdate, PasswordChange
from ..utils.security import get_current_user, get_password_hash, verify_password
from ..utils.logger import logger

router = APIRouter(prefix="/api/profile", tags=["个人中心"])


@router.get("", response_model=UserResponse, summary="获取个人信息")
async def get_profile(current_user: User = Depends(get_current_user)):
    """获取当前用户个人信息"""
    return current_user


@router.put("", response_model=UserResponse, summary="更新个人信息")
async def update_profile(
    profile_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新个人信息"""
    # Check if email is already used by another user
    if profile_data.email:
        existing = db.query(User).filter(
            User.email == profile_data.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已被其他用户使用"
            )
    
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Profile updated: {current_user.username}")
    
    return current_user


@router.put("/password", summary="修改密码")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改密码"""
    # Verify old password
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )
    
    # Check if new password is same as old
    if password_data.old_password == password_data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不能与原密码相同"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    logger.info(f"Password changed: {current_user.username}")
    
    return {"message": "密码修改成功"}


@router.put("/avatar", response_model=UserResponse, summary="更新头像")
async def update_avatar(
    avatar_url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新头像"""
    current_user.avatar = avatar_url
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Avatar updated: {current_user.username}")
    
    return current_user

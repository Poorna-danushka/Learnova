from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.module import Module
from app.models.user import User
from app.schemas.module import ModuleCreate, ModuleResponse, ModuleUpdate

router = APIRouter(prefix="/modules", tags=["modules"])


def get_owned_module(module_id: int, user: User, db: Session) -> Module:
    module = (
        db.query(Module)
        .filter(Module.id == module_id, Module.owner_id == user.id)
        .first()
    )
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")
    return module


@router.post("", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    data: ModuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = Module(owner_id=current_user.id, **data.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.get("", response_model=list[ModuleResponse])
def list_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Module)
        .filter(Module.owner_id == current_user.id)
        .order_by(Module.created_at.desc())
        .all()
    )


@router.patch("/{module_id}", response_model=ModuleResponse)
def update_module(
    module_id: int,
    data: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = get_owned_module(module_id, current_user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(module, field, value)
    db.commit()
    db.refresh(module)
    return module


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    module = get_owned_module(module_id, current_user, db)
    db.delete(module)
    db.commit()

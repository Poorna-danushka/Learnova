"""rename_subjects_to_modules

Revision ID: 68d1c102ff8d
Revises: e1f2a3b4c567
Create Date: 2026-09-17 22:51:19.349238

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68d1c102ff8d'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename subjects table to modules."""
    op.rename_table('subjects', 'modules')


def downgrade() -> None:
    """Rename modules table back to subjects."""
    op.rename_table('modules', 'subjects')

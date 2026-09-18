"""rename_subject_id_to_module_id

Revision ID: 42a4d6fa340b
Revises: 68d1c102ff8d
Create Date: 2026-09-18 09:05:32.823773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42a4d6fa340b'
down_revision: Union[str, Sequence[str], None] = '68d1c102ff8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename subject_id to module_id across all tables."""
    # Rename columns in 6 tables (foreign key constraints are preserved)
    op.alter_column('notes', 'subject_id', new_column_name='module_id')
    op.alter_column('quizzes', 'subject_id', new_column_name='module_id')
    op.alter_column('study_materials', 'subject_id', new_column_name='module_id')
    op.alter_column('calendar_events', 'subject_id', new_column_name='module_id')
    op.alter_column('study_sessions', 'subject_id', new_column_name='module_id')
    op.alter_column('study_goals', 'subject_id', new_column_name='module_id')


def downgrade() -> None:
    """Revert module_id back to subject_id."""
    # Reverse operation for rollback safety
    op.alter_column('study_goals', 'module_id', new_column_name='subject_id')
    op.alter_column('study_sessions', 'module_id', new_column_name='subject_id')
    op.alter_column('calendar_events', 'module_id', new_column_name='subject_id')
    op.alter_column('study_materials', 'module_id', new_column_name='subject_id')
    op.alter_column('quizzes', 'module_id', new_column_name='subject_id')
    op.alter_column('notes', 'module_id', new_column_name='subject_id')


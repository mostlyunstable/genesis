"""add incident intelligence and audit hash chaining columns

Revision ID: 7a1e2f3d4c5b
Revises: 8cc6109a3aea
Create Date: 2026-10-31 21:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1e2f3d4c5b'
down_revision: Union[str, None] = '8cc6109a3aea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Incidents table upgrades
    op.add_column('incidents', sa.Column('assigned_analyst', sa.String(length=128), nullable=True))
    op.add_column('incidents', sa.Column('comments', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('incidents', sa.Column('resolution_notes', sa.Text(), nullable=True))

    # Audit records table upgrades
    op.add_column('audit_records', sa.Column('previous_hash', sa.String(length=64), nullable=True))
    op.add_column('audit_records', sa.Column('record_hash', sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column('audit_records', 'record_hash')
    op.drop_column('audit_records', 'previous_hash')
    op.drop_column('incidents', 'resolution_notes')
    op.drop_column('incidents', 'comments')
    op.drop_column('incidents', 'assigned_analyst')

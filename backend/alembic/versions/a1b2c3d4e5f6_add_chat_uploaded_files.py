"""add chat uploaded files table for dataset and log analysis

Revision ID: a1b2c3d4e5f6
Revises: 9c2d1e4f5a6b
Create Date: 2026-11-01 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c2d1e4f5a6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chat_uploaded_files',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('conversation_id', sa.String(length=64), sa.ForeignKey('chat_conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(length=256), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('format_detected', sa.String(length=64), nullable=False, server_default='generic_log'),
        sa.Column('log_source', sa.String(length=64), nullable=False, server_default='file_upload'),
        sa.Column('record_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('parsed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('skipped_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('detection_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('incident_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='uploaded'),
        sa.Column('storage_path', sa.String(length=512), nullable=False),
        sa.Column('analysis_summary', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
    )
    op.create_index(op.f('ix_chat_uploaded_files_conversation_id'), 'chat_uploaded_files', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_chat_uploaded_files_status'), 'chat_uploaded_files', ['status'], unique=False)
    op.create_index(op.f('ix_chat_uploaded_files_user_id'), 'chat_uploaded_files', ['user_id'], unique=False)
    op.create_index('ix_chat_uploaded_files_conv', 'chat_uploaded_files', ['conversation_id', 'created_at'], unique=False)
    op.create_index('ix_chat_uploaded_files_hash', 'chat_uploaded_files', ['file_hash'], unique=False)


def downgrade() -> None:
    op.drop_table('chat_uploaded_files')

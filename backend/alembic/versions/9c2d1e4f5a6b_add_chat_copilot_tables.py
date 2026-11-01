"""add chat copilot persistent conversation and message tables

Revision ID: 9c2d1e4f5a6b
Revises: 7a1e2f3d4c5b
Create Date: 2026-11-01 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c2d1e4f5a6b'
down_revision: Union[str, None] = '7a1e2f3d4c5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create chat_conversations
    op.create_table(
        'chat_conversations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('title', sa.String(length=256), nullable=False, server_default='New Security Investigation'),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('context_metadata', sa.JSON(), nullable=False, server_default='{}'),
    )
    op.create_index(op.f('ix_chat_conversations_user_id'), 'chat_conversations', ['user_id'], unique=False)
    op.create_index('ix_chat_conversations_user_updated', 'chat_conversations', ['user_id', 'updated_at'], unique=False)

    # 2. Create chat_messages
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('conversation_id', sa.String(length=64), sa.ForeignKey('chat_conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('thought_process', sa.Text(), nullable=True),
        sa.Column('tool_calls', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('evidence_references', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('suggested_actions', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=True),
    )
    op.create_index(op.f('ix_chat_messages_conversation_id'), 'chat_messages', ['conversation_id'], unique=False)
    op.create_index('ix_chat_messages_conv_created', 'chat_messages', ['conversation_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')

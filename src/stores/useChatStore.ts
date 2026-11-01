import { create } from 'zustand';
import { 
  ConversationSummary, 
  ConversationDetail, 
  ChatMessage, 
  EvidenceReference, 
  SuggestedAction, 
  StreamInvestigationStep,
  UploadedFileSummary
} from '@/types';
import { sentinelApi } from '@/services/api';

interface ChatState {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeConversation: ConversationDetail | null;
  messages: ChatMessage[];
  uploadedFiles: UploadedFileSummary[];
  activeFileId: string | null;
  isUploading: boolean;
  uploadError: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  currentStep: StreamInvestigationStep | null;
  evidenceReferences: EvidenceReference[];
  suggestedActions: SuggestedAction[];
  selectedEvidence: EvidenceReference | null;
  isEvidencePanelOpen: boolean;
  isSideDrawerOpen: boolean;
  pendingDrawerPrompt: string | null;
  searchQuery: string;
  error: string | null;
  abortController: AbortController | null;

  // Actions
  loadConversations: (query?: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createNewConversation: (title?: string) => Promise<string>;
  updateConversation: (id: string, updates: { title?: string; isPinned?: boolean }) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  uploadFile: (file: File) => Promise<UploadedFileSummary | null>;
  loadFiles: (convId?: string) => Promise<void>;
  setActiveFileId: (fileId: string | null) => void;
  sendMessage: (text: string, contextIncidentId?: string, contextFileId?: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  stopStreaming: () => void;
  confirmAction: (action: SuggestedAction, confirmed: boolean) => Promise<void>;
  setSelectedEvidence: (ev: EvidenceReference | null) => void;
  setEvidencePanelOpen: (open: boolean) => void;
  setSideDrawerOpen: (open: boolean) => void;
  setPendingDrawerPrompt: (prompt: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  messages: [],
  uploadedFiles: [],
  activeFileId: null,
  isUploading: false,
  uploadError: null,
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  currentStep: null,
  evidenceReferences: [],
  suggestedActions: [],
  selectedEvidence: null,
  isEvidencePanelOpen: false,
  isSideDrawerOpen: false,
  pendingDrawerPrompt: null,
  searchQuery: '',
  error: null,
  abortController: null,

  loadConversations: async (query?: string) => {
    try {
      set({ isLoading: true, error: null });
      const items = await sentinelApi.chat.listConversations({ query });
      set({ conversations: items, isLoading: false });

      // If no active conversation and items exist, select the first one
      const { activeConversationId, selectConversation } = get();
      if (!activeConversationId && items.length > 0) {
        await selectConversation(items[0].id);
      }
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to load conversations' });
    }
  },

  selectConversation: async (id: string) => {
    try {
      set({ isLoading: true, activeConversationId: id, error: null });
      const detail = await sentinelApi.chat.getConversation(id);
      
      // Extract latest evidence references and suggested actions if available
      const lastAsst = [...detail.messages].reverse().find(m => m.role === 'assistant');
      const latestEvidence = lastAsst?.evidenceReferences || [];
      const latestActions = lastAsst?.suggestedActions || [];
      const fileList = detail.uploadedFiles || [];

      set({ 
        activeConversation: detail, 
        messages: detail.messages || [],
        uploadedFiles: fileList,
        activeFileId: fileList.length > 0 ? fileList[0].id : null,
        uploadError: null,
        evidenceReferences: latestEvidence,
        suggestedActions: latestActions,
        isLoading: false,
        streamingContent: '',
        currentStep: null,
        selectedEvidence: latestEvidence.length > 0 ? latestEvidence[0] : null
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || `Failed to load conversation ${id}` });
    }
  },

  createNewConversation: async (title?: string) => {
    try {
      set({ isLoading: true, error: null });
      const newConv = await sentinelApi.chat.createConversation(title || 'New Security Investigation');
      const convs = [newConv, ...get().conversations];
      set({
        conversations: convs,
        activeConversationId: newConv.id,
        activeConversation: {
          id: newConv.id,
          title: newConv.title,
          createdAt: newConv.createdAt,
          updatedAt: newConv.updatedAt,
          isPinned: newConv.isPinned,
          contextMetadata: newConv.contextMetadata,
          messages: []
        },
        messages: [],
        uploadedFiles: [],
        activeFileId: null,
        uploadError: null,
        evidenceReferences: [],
        suggestedActions: [],
        selectedEvidence: null,
        streamingContent: '',
        currentStep: null,
        isLoading: false
      });
      return newConv.id;
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to create conversation' });
      throw err;
    }
  },

  updateConversation: async (id: string, updates: { title?: string; isPinned?: boolean }) => {
    try {
      const updated = await sentinelApi.chat.updateConversation(id, updates);
      set(state => ({
        conversations: state.conversations.map(c => c.id === id ? { ...c, ...updates } : c),
        activeConversation: state.activeConversation?.id === id ? { ...state.activeConversation, ...updates } : state.activeConversation
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to update conversation' });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await sentinelApi.chat.deleteConversation(id);
      const remaining = get().conversations.filter(c => c.id !== id);
      set({
        conversations: remaining,
        activeConversationId: remaining.length > 0 ? remaining[0].id : null,
        activeConversation: null,
        messages: [],
        uploadedFiles: [],
        activeFileId: null
      });
      if (remaining.length > 0) {
        await get().selectConversation(remaining[0].id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete conversation' });
    }
  },

  uploadFile: async (file: File) => {
    try {
      set({ isUploading: true, uploadError: null });
      let convId = get().activeConversationId;
      if (!convId) {
        convId = await get().createNewConversation();
      }
      const record = await sentinelApi.chat.uploadFile(convId, file);
      set(state => ({
        uploadedFiles: [record, ...state.uploadedFiles.filter(f => f.id !== record.id)],
        activeFileId: record.id,
        isUploading: false,
        uploadError: null
      }));
      // Reload conversation messages and details immediately
      await get().selectConversation(convId);
      return record;
    } catch (err: any) {
      set({ isUploading: false, uploadError: err.message || 'File upload failed' });
      return null;
    }
  },

  loadFiles: async (convId?: string) => {
    const targetId = convId || get().activeConversationId;
    if (!targetId) return;
    try {
      const files = await sentinelApi.chat.listFiles(targetId);
      set({ uploadedFiles: files });
    } catch (err: any) {
      console.warn('Failed to load files for conversation:', err);
    }
  },

  setActiveFileId: (fileId: string | null) => {
    set({ activeFileId: fileId });
  },

  sendMessage: async (text: string, contextIncidentId?: string, contextFileId?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let convId = get().activeConversationId;
    if (!convId) {
      convId = await get().createNewConversation();
    }

    const targetFileId = contextFileId || get().activeFileId || undefined;

    const controller = new AbortController();
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    set(state => ({
      messages: [...state.messages, tempUserMsg],
      isStreaming: true,
      streamingContent: '',
      currentStep: { step: 'understanding', label: 'Initializing investigation...' },
      evidenceReferences: [],
      suggestedActions: [],
      abortController: controller,
      error: null
    }));

    let accumulatedTokens = '';
    let streamEvidence: EvidenceReference[] = [];
    let streamActions: SuggestedAction[] = [];

    try {
      await sentinelApi.chat.streamMessage(
        convId,
        trimmed,
        {
          onStep: (step) => {
            set({ currentStep: step });
          },
          onEvidence: (evidence) => {
            streamEvidence = evidence;
            set({ 
              evidenceReferences: evidence,
              isEvidencePanelOpen: evidence.length > 0,
              selectedEvidence: evidence.length > 0 ? evidence[0] : null
            });
          },
          onActions: (actions) => {
            streamActions = actions;
            set({ suggestedActions: actions });
          },
          onToken: (token) => {
            accumulatedTokens += token;
            set({ streamingContent: accumulatedTokens });
          },
          onDone: (data) => {
            const assistantMsg: ChatMessage = {
              id: data.messageId,
              conversationId: convId!,
              role: 'assistant',
              content: accumulatedTokens,
              evidenceReferences: streamEvidence,
              suggestedActions: streamActions,
              createdAt: data.timestamp || new Date().toISOString(),
              tokenCount: data.tokenCount
            };

            set(state => ({
              messages: [...state.messages, assistantMsg],
              isStreaming: false,
              streamingContent: '',
              currentStep: null,
              abortController: null
            }));

            // Refresh conversation list to update titles/snippet and reload files
            get().loadConversations();
            get().loadFiles(convId!);
          },
          onError: (err) => {
            set({
              isStreaming: false,
              error: err.message || 'Streaming failed',
              currentStep: null,
              abortController: null
            });
          }
        },
        contextIncidentId,
        undefined,
        controller.signal,
        targetFileId
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Handled via stopStreaming
        return;
      }
      set({ 
        isStreaming: false, 
        error: err.message || 'Error executing investigation',
        currentStep: null,
        abortController: null 
      });
    }
  },

  retryLastMessage: async () => {
    const { messages, sendMessage } = get();
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message if any
      set(state => ({
        messages: state.messages.filter(m => m.id !== lastUserMsg.id && (!m.role || m.role !== 'assistant' || m.createdAt < lastUserMsg.createdAt))
      }));
      await sendMessage(lastUserMsg.content);
    }
  },

  stopStreaming: () => {
    const { abortController, streamingContent, activeConversationId, evidenceReferences, suggestedActions } = get();
    if (abortController) {
      abortController.abort();
    }
    if (streamingContent && activeConversationId) {
      const partialMsg: ChatMessage = {
        id: `aborted-${Date.now()}`,
        conversationId: activeConversationId,
        role: 'assistant',
        content: streamingContent + ' *(Investigation stopped by analyst)*',
        evidenceReferences,
        suggestedActions,
        createdAt: new Date().toISOString()
      };
      set(state => ({
        messages: [...state.messages, partialMsg],
        isStreaming: false,
        streamingContent: '',
        currentStep: null,
        abortController: null
      }));
    } else {
      set({
        isStreaming: false,
        streamingContent: '',
        currentStep: null,
        abortController: null
      });
    }
  },

  confirmAction: async (action: SuggestedAction, confirmed: boolean) => {
    try {
      const res = await sentinelApi.chat.confirmAction({
        actionProposalId: action.id,
        confirmed,
        actionName: action.actionName,
        target: action.target,
        playbookId: action.playbookId,
        incidentId: action.incidentId
      });

      const updatedStatus = confirmed ? (res.status === 'EXECUTED' ? 'executed' : 'confirmed') : 'rejected';

      set(state => ({
        suggestedActions: state.suggestedActions.map(a => 
          a.id === action.id ? { ...a, status: updatedStatus as any, executionResult: res } : a
        ),
        messages: state.messages.map(m => {
          if (!m.suggestedActions) return m;
          return {
            ...m,
            suggestedActions: m.suggestedActions.map(a => 
              a.id === action.id ? { ...a, status: updatedStatus as any, executionResult: res } : a
            )
          };
        })
      }));
    } catch (err: any) {
      set({ error: err.message || 'Action authorization failed' });
      throw err;
    }
  },

  setSelectedEvidence: (ev: EvidenceReference | null) => {
    set({ selectedEvidence: ev, isEvidencePanelOpen: ev !== null });
  },

  setEvidencePanelOpen: (open: boolean) => {
    set({ isEvidencePanelOpen: open });
  },

  setSideDrawerOpen: (open: boolean) => {
    set({ isSideDrawerOpen: open });
  },

  setPendingDrawerPrompt: (prompt: string | null) => {
    set({ pendingDrawerPrompt: prompt });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearError: () => {
    set({ error: null });
  }
}));

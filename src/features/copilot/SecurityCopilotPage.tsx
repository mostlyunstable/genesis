import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  Square, 
  Search, 
  Plus, 
  Pin, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  User, 
  ShieldAlert, 
  Clock, 
  Copy, 
  RotateCcw, 
  AlertCircle,
  ShieldCheck,
  Flame,
  MessageSquare,
  Paperclip,
  UploadCloud,
  FileText,
  Loader2,
  FileUp,
  PanelLeft
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InvestigationStepsIndicator } from './InvestigationStepsIndicator';
import { ActionProposalCard } from './ActionProposalCard';

export const SecurityCopilotPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    currentStep,
    evidenceReferences,
    suggestedActions,
    uploadedFiles,
    activeFileId,
    isUploading,
    uploadError,
    isEvidencePanelOpen,
    searchQuery,
    error,
    loadConversations,
    selectConversation,
    createNewConversation,
    updateConversation,
    deleteConversation,
    uploadFile,
    setActiveFileId,
    sendMessage,
    retryLastMessage,
    stopStreaming,
    setSelectedEvidence,
    setEvidencePanelOpen,
    setSearchQuery,
    clearError
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      handleSubmit(q.trim());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const record = await uploadFile(file);
      if (record && !inputMessage.trim()) {
        setInputMessage(`Analyze uploaded log file ${record.filename} and perform full autonomous forensic investigation.`);
      }
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const record = await uploadFile(file);
      if (record && !inputMessage.trim()) {
        setInputMessage(`Analyze uploaded log file ${record.filename} and perform full autonomous forensic investigation.`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
  }, [messages, streamingContent, currentStep, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (presetText?: string) => {
    const textToSend = presetText || inputMessage;
    if (!textToSend.trim() || isStreaming) return;

    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(textToSend);
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  const startEditingTitle = (id: string, currentTitle: string) => {
    setEditingTitleId(id);
    setEditedTitle(currentTitle);
  };

  const saveEditedTitle = async (id: string) => {
    if (editedTitle.trim()) {
      await updateConversation(id, { title: editedTitle.trim() });
    }
    setEditingTitleId(null);
  };

  const handleChipClick = (id: string, type?: string) => {
    // Find matching evidence or construct temporary preview
    const found = evidenceReferences.find(e => e.id === id);
    if (found) {
      setSelectedEvidence(found);
    } else {
      setSelectedEvidence({
        id,
        title: `Telemetry Reference: ${id}`,
        type: (type as any) || (id.startsWith('INC-') ? 'incident' : id.startsWith('EVT-') ? 'event' : 'threat_intel'),
        snippet: `Inspecting entity ${id} referenced in investigation analysis.`
      });
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(c => 
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const recentConversations = filteredConversations.filter(c => !c.isPinned);

  return (
    <div className="w-full h-full flex min-h-0 min-w-0 overflow-hidden bg-[#F7F7F2] relative">
      {/* Mobile Backdrop for Conversation History */}
      {isHistoryOpen && (
        <div
          onClick={() => setIsHistoryOpen(false)}
          className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* COLUMN 1: LEFT CONVERSATION HISTORY & NEW INVESTIGATION */}
      {/* ---------------------------------------------------- */}
      <aside
        className={`bg-white border-r border-[#E3E5DC] flex flex-col shrink-0 min-h-0 h-full transition-all duration-200 select-none ${
          isHistoryOpen
            ? 'fixed md:relative inset-y-0 left-0 w-72 sm:w-80 z-30 shadow-xl md:shadow-none'
            : 'hidden'
        }`}
      >
        {/* Top Action Bar */}
        <div className="p-3.5 border-b border-[#E3E5DC] space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                createNewConversation();
                if (window.innerWidth < 768) setIsHistoryOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#54765C] hover:bg-[#436049] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="md:hidden p-2 rounded-xl text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors cursor-pointer"
              aria-label="Close conversation history"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#969B91]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F0F1EB] border border-[#E3E5DC] text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#969B91] hover:text-[#20251F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-[#969B91]">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No conversations found.</p>
            </div>
          ) : (
            <>
              {/* Pinned Group */}
              {pinnedConversations.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-[#73796F] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Pin className="w-3 h-3 text-[#54765C]" />
                    <span>Pinned</span>
                  </div>
                  {pinnedConversations.map(c => renderConversationItem(c))}
                </div>
              )}

              {/* Recent Group */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-[#73796F] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Clock className="w-3 h-3 text-[#73796F]" />
                  <span>Recent</span>
                </div>
                {recentConversations.map(c => renderConversationItem(c))}
              </div>
            </>
          )}
        </div>

        {/* Footer Status */}
        <div className="p-3 border-t border-[#E3E5DC] bg-[#FAFAF7] text-[11px] text-[#73796F] flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#54765C]" />
            <span>Genesis Ready</span>
          </span>
          <span className="font-mono text-[#73796F] text-[10px]">v2.5</span>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* COLUMN 2: CENTER CHAT WORKSPACE                      */}
      {/* ---------------------------------------------------- */}
      <main 
        className="flex-1 min-w-0 min-h-0 flex flex-col h-full bg-[#F7F7F2] overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-and-drop file overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#54765C]/10 border-2 border-dashed border-[#54765C] z-30 rounded-2xl flex flex-col items-center justify-center p-6 backdrop-blur-xs pointer-events-none">
            <UploadCloud className="w-10 h-10 text-[#54765C] mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-[#20251F]">Drop log file to analyze</p>
            <p className="text-xs text-[#73796F]">Supports OpenSSH, Syslog RFC 5424, Windows 4625, JSON, CSV</p>
          </div>
        )}

        {/* Workspace Top Header */}
        <header className="px-4 sm:px-6 py-2.5 border-b border-[#E3E5DC] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-1.5 rounded-lg text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors cursor-pointer flex items-center gap-1.5 text-xs shrink-0"
              title={isHistoryOpen ? "Hide chat history" : "Show chat history"}
              aria-label="Toggle chat history"
            >
              <PanelLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-sans">
                {isHistoryOpen ? "Hide History" : "Chats"}
              </span>
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#20251F] truncate">
                {activeConversation?.title && activeConversation.title !== 'New Security Investigation'
                  ? activeConversation.title 
                  : 'Copilot'}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[#73796F]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#54765C]" />
                <span>Ready</span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Error Banner if any */}
        {error && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="hover:text-rose-950">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.length === 0 && !isStreaming ? (
            /* Refined, Minimal Initial State with Genesis Logo */
            <div className="max-w-xl mx-auto py-12 sm:py-16 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black flex items-center justify-center p-1.5 shadow-origin-md border border-purple-950/40 ring-1 ring-purple-500/20">
                  <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-display font-medium text-[#20251F] tracking-tight">
                  Hi. What would you like to investigate?
                </h2>
                <p className="text-sm text-[#73796F]">
                  Ask a security question or upload a log file to get started.
                </p>
              </div>

              {/* 4 Understated Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-[#E3E5DC] bg-white hover:border-[#54765C] hover:bg-[#F0F1EB]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#20251F] group-hover:text-[#54765C]">
                    <span>Analyze a security log</span>
                    <FileUp className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#73796F] mt-1">Upload syslog, auth log, or CSV</p>
                </button>

                <button
                  onClick={() => handleSubmit("Investigate IP address 198.51.100.42")}
                  className="p-3.5 rounded-2xl border border-[#E3E5DC] bg-white hover:border-[#54765C] hover:bg-[#F0F1EB]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#20251F] group-hover:text-[#54765C]">
                    <span>Investigate an IP address</span>
                    <Search className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#73796F] mt-1">Check host telemetry & reputation</p>
                </button>

                <button
                  onClick={() => handleSubmit("Explain brute-force attack detection and thresholds")}
                  className="p-3.5 rounded-2xl border border-[#E3E5DC] bg-white hover:border-[#54765C] hover:bg-[#F0F1EB]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#20251F] group-hover:text-[#54765C]">
                    <span>Explain a detection</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#73796F] mt-1">Understand detection heuristics</p>
                </button>

                <button
                  onClick={() => handleSubmit("Review active response playbooks and defense status")}
                  className="p-3.5 rounded-2xl border border-[#E3E5DC] bg-white hover:border-[#54765C] hover:bg-[#F0F1EB]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#20251F] group-hover:text-[#54765C]">
                    <span>Review response playbooks</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#73796F] mt-1">Review active automated containment</p>
                </button>
              </div>
            </div>
          ) : (
            /* Render Thread Messages */
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3.5 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0 shadow-2xs mt-1 border border-purple-950/40 ring-1 ring-purple-500/20">
                      <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#20251F] text-white rounded-tr-xs shadow-2xs'
                          : 'bg-white border border-[#E3E5DC] rounded-tl-xs shadow-2xs text-[#20251F]'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          <MarkdownRenderer
                            content={msg.content}
                            onChipClick={handleChipClick}
                          />

                          {/* Suggested Action Proposals */}
                          {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.suggestedActions.map((action, aIdx) => (
                                <ActionProposalCard key={action.id || aIdx} action={action} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Action Footer */}
                    {!isUser && (
                      <div className="flex items-center gap-3 px-1 text-[11px] text-[#969B91]">
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-[#20251F] transition-colors cursor-pointer"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#54765C]" />
                              <span className="text-[#54765C]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <span>•</span>
                        <button
                          onClick={retryLastMessage}
                          className="flex items-center gap-1 hover:text-[#20251F] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                        {msg.tokenCount && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{msg.tokenCount} tokens</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] text-[#20251F] flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Streaming Pipeline Indicator & Streaming Chunks */}
          {isStreaming && (
            <div className="max-w-4xl mx-auto space-y-3">
              <InvestigationStepsIndicator currentStep={currentStep} />

              {streamingContent && (
                <div className="flex gap-3.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0 shadow-2xs mt-1 border border-purple-950/40 ring-1 ring-purple-500/30 animate-pulse">
                    <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-[#54765C]/30 text-xs sm:text-sm text-[#20251F] shadow-2xs flex-1">
                    <MarkdownRenderer
                      content={streamingContent}
                      onChipClick={handleChipClick}
                    />
                    <span className="inline-block w-2 h-4 ml-1 bg-[#54765C] animate-pulse align-middle" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Area */}
        <div className="p-4 border-t border-[#E3E5DC] bg-white shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Upload Error Alert */}
            {uploadError && (
              <div className="px-3 py-1.5 rounded-xl bg-[#F9ECEB] border border-[#F2D5D3] text-[#B94C43] text-xs flex items-center justify-between">
                <span>Upload error: {uploadError}</span>
              </div>
            )}

            {/* Attached Log Files Tray */}
            {uploadedFiles.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-[#73796F] uppercase tracking-wider shrink-0 flex items-center gap-1 font-mono">
                  <FileText className="w-3.5 h-3.5 text-[#54765C]" />
                  <span>Attached:</span>
                </span>
                {uploadedFiles.map((file) => {
                  const isActive = activeFileId === file.id;
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#EAF0E6] border-[#CFDCC9] text-[#20251F]'
                          : 'bg-[#FAFAF7] border-[#E3E5DC] text-[#73796F] hover:bg-white'
                      }`}
                    >
                      <button
                        onClick={() => setActiveFileId(isActive ? null : file.id)}
                        className="flex items-center gap-1.5 font-medium cursor-pointer"
                        title={isActive ? 'Active context' : 'Set active'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#54765C]' : 'bg-[#969B91]'}`} />
                        <span className="font-mono text-xs truncate max-w-[130px]">{file.filename}</span>
                      </button>
                      <span className="text-[10px] text-[#969B91]">
                        {file.parsedCount} evts
                      </span>
                      <button
                        onClick={() => handleSubmit(`Analyze uploaded log file ${file.filename} and perform investigation.`)}
                        disabled={isStreaming}
                        className="ml-1 px-2 py-0.5 rounded-full bg-[#54765C] hover:bg-[#436049] text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        Analyze
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative flex items-end rounded-2xl border border-[#E3E5DC] bg-[#F7F7F2] focus-within:border-[#54765C] focus-within:bg-white transition-all shadow-inner">
              {/* Paperclip attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isUploading}
                className="p-3 text-[#73796F] hover:text-[#54765C] transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                title="Attach log file (.log, .txt, .csv, .json, .jsonl)"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#54765C]" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".log,.txt,.csv,.json,.jsonl"
                className="hidden"
              />

              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Genesis anything about your security data..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none py-3 pl-1 pr-14 bg-transparent text-xs sm:text-sm text-[#20251F] placeholder-[#969B91] focus:outline-none max-h-36 overflow-y-auto"
                style={{ minHeight: '44px' }}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#B94C43] hover:bg-[#A33C34] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Stop generation"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!inputMessage.trim()}
                    className="p-2 rounded-full bg-[#54765C] hover:bg-[#436049] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                    title="Send message (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Prompts Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-[#73796F]">
              <span className="shrink-0 font-medium text-[#20251F]">Suggestions:</span>
              {uploadedFiles.length > 0 && (
                <button
                  onClick={() => handleSubmit(`Analyze uploaded log file ${uploadedFiles[0].filename} and investigate suspicious activities`)}
                  className="px-2.5 py-1 rounded-full bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] hover:bg-[#DCE7D6] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Analyze {uploadedFiles[0].filename}</span>
                </button>
              )}
              <button
                onClick={() => handleSubmit("Summarize current security status and threat posture")}
                className="px-2.5 py-1 rounded-full bg-[#FAFAF7] border border-[#E3E5DC] hover:border-[#54765C] hover:text-[#20251F] whitespace-nowrap transition-colors cursor-pointer"
              >
                Security Posture
              </button>
              <button
                onClick={() => handleSubmit("Check system operational health and forwarders")}
                className="px-2.5 py-1 rounded-full bg-[#FAFAF7] border border-[#E3E5DC] hover:border-[#54765C] hover:text-[#20251F] whitespace-nowrap transition-colors cursor-pointer"
              >
                System Status
              </button>
              <button
                onClick={() => handleSubmit("Explain brute force attack detection")}
                className="px-2.5 py-1 rounded-full bg-[#FAFAF7] border border-[#E3E5DC] hover:border-[#54765C] hover:text-[#20251F] whitespace-nowrap transition-colors cursor-pointer"
              >
                Brute Force Heuristics
              </button>
              <button
                onClick={() => handleSubmit("Explain brute force mitigation")}
                className="px-2.5 py-1 rounded-full bg-[#FAFAF7] border border-[#E3E5DC] hover:border-[#54765C] hover:text-[#20251F] whitespace-nowrap transition-colors cursor-pointer"
              >
                Defense Strategy
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-[#DFE5E2]">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-[#142C29]">Delete Investigation?</h4>
              <p className="text-xs text-[#5A6B66]">
                This will permanently delete the conversation history. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#FAF9F5] border border-[#DFE5E2] hover:bg-[#EAEFEA] text-[#192622] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderConversationItem(c: any) {
    const isActive = c.id === activeConversationId;
    const isEditing = editingTitleId === c.id;

    return (
      <div
        key={c.id}
        className={`group relative rounded-xl px-3 py-2 text-xs transition-all cursor-pointer flex items-center justify-between ${
          isActive
            ? 'bg-[#EAF0E6] text-[#20251F] font-semibold border border-[#CFDCC9] shadow-2xs'
            : 'text-[#73796F] hover:bg-[#F0F1EB] hover:text-[#20251F]'
        }`}
        onClick={() => {
          if (!isEditing) {
            selectConversation(c.id);
            if (window.innerWidth < 768) setIsHistoryOpen(false);
          }
        }}
      >
        <div className="flex-1 min-w-0 pr-2">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEditedTitle(c.id)}
                autoFocus
                className="w-full text-xs py-0.5 px-1 rounded border border-[#54765C] bg-white text-[#20251F]"
              />
              <button onClick={() => saveEditedTitle(c.id)} className="text-[#54765C]">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingTitleId(null)} className="text-[#969B91]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {c.isPinned && <Pin className="w-3 h-3 text-[#54765C] shrink-0" />}
                <span className="truncate font-medium">{c.title}</span>
              </div>
              {c.lastMessageSnippet && (
                <p className="text-[10px] text-[#969B91] truncate mt-0.5">
                  {c.lastMessageSnippet}
                </p>
              )}
            </>
          )}
        </div>

        {/* Hover Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateConversation(c.id, { isPinned: !c.isPinned });
              }}
              className={`p-1 rounded hover:bg-white text-[#969B91] hover:text-[#54765C] ${
                c.isPinned ? 'text-[#54765C]' : ''
              }`}
              title={c.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEditingTitle(c.id, c.title);
              }}
              className="p-1 rounded hover:bg-white text-[#969B91] hover:text-[#20251F]"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(c.id);
              }}
              className="p-1 rounded hover:bg-white text-[#969B91] hover:text-[#B94C43]"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
};

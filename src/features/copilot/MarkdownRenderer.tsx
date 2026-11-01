import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onChipClick?: (id: string, type?: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onChipClick }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Helper to format inline markdown (bold, code, chips)
  const formatInline = (text: string): React.ReactNode[] => {
    // Split by code blocks, bold, alerts
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Regex matching bold **text** or inline code `code` or IPs or Incident IDs
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\bINC-[A-Z0-9\-]+\b|\bEVT-[A-Z0-9\-]+\b|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index));
      }

      const raw = match[0];
      if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-[#142C29]">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if (raw.startsWith('`') && raw.endsWith('`')) {
        const val = raw.slice(1, -1);
        const isChip = val.startsWith('INC-') || val.startsWith('EVT-') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val);
        parts.push(
          <code
            key={keyIdx++}
            onClick={() => isChip && onChipClick && onChipClick(val)}
            className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
              isChip 
                ? 'bg-[#26796C]/10 text-[#26796C] border border-[#26796C]/20 hover:bg-[#26796C]/20 cursor-pointer' 
                : 'bg-[#F2F5F3] text-[#192622] border border-[#E5EBE8]'
            }`}
          >
            {val}
          </code>
        );
      } else if (raw.startsWith('INC-')) {
        parts.push(
          <button
            key={keyIdx++}
            onClick={() => onChipClick && onChipClick(raw, 'incident')}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            {raw}
          </button>
        );
      } else if (raw.startsWith('EVT-')) {
        parts.push(
          <button
            key={keyIdx++}
            onClick={() => onChipClick && onChipClick(raw, 'event')}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            {raw}
          </button>
        );
      } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(raw)) {
        parts.push(
          <button
            key={keyIdx++}
            onClick={() => onChipClick && onChipClick(raw, 'threat_intel')}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-semibold bg-teal-50 text-[#26796C] border border-[#26796C]/30 hover:bg-teal-100 transition-colors"
          >
            {raw}
          </button>
        );
      } else {
        parts.push(raw);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }

    return parts;
  };

  // Parse lines into blocks
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let i = 0;
  let codeBlockCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const fullCode = codeLines.join('\n');
      const blockId = codeBlockCounter++;

      renderedElements.push(
        <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-[#DFE5E2] bg-[#142C29] text-white">
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0D1F1D] text-xs font-mono text-[#A3B8B2] border-b border-[#1E3B37]">
            <span className="uppercase">{lang}</span>
            <button
              onClick={() => handleCopyCode(fullCode, blockId)}
              className="flex items-center gap-1 hover:text-white transition-colors"
              title="Copy code"
            >
              {copiedIndex === blockId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed text-[#E1EAE7]">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Alerts: > [!WARNING] or > [!NOTE] or > blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      const joined = quoteLines.join('\n');
      let isWarning = joined.includes('[!WARNING]') || joined.includes('[!CAUTION]');
      let isNote = joined.includes('[!NOTE]') || joined.includes('[!IMPORTANT]');
      const cleanContent = joined.replace(/\[!(WARNING|CAUTION|NOTE|IMPORTANT|TIP)\]\s*/g, '');

      renderedElements.push(
        <div
          key={`alert-${i}`}
          className={`my-3 p-3.5 rounded-lg border flex gap-3 text-sm leading-relaxed ${
            isWarning 
              ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
              : isNote 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-[#F7FAF8] border-[#DFE5E2] text-[#192622]'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <Info className="w-4 h-4 text-[#26796C]" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            {cleanContent.split('\n').map((cl, clIdx) => (
              <p key={clIdx}>{formatInline(cl)}</p>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-[#142C29] mt-4 mb-2 flex items-center gap-2">
          {formatInline(line.replace('### ', ''))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      renderedElements.push(
        <h4 key={`h4-${i}`} className="text-sm font-semibold text-[#26796C] uppercase tracking-wide mt-3 mb-1.5">
          {formatInline(line.replace('#### ', ''))}
        </h4>
      );
      i++;
      continue;
    }

    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      renderedElements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1 text-sm text-[#192622] pl-4 list-disc marker:text-[#26796C]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      renderedElements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1 text-sm text-[#192622] pl-5 list-decimal marker:font-semibold marker:text-[#26796C]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      renderedElements.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-sm text-[#192622] leading-relaxed my-1">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{renderedElements}</div>;
};

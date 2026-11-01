import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  Terminal, 
  Lock, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Cpu, 
  Sliders, 
  ExternalLink,
  ChevronRight,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useChatStore } from '@/stores/useChatStore';
import { useSecurityStore } from '@/stores/useSecurityStore';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSideDrawerOpen, setPendingDrawerPrompt } = useChatStore();
  const { playbooks, actions, auditRecords, autonomousResponseGlobalEnabled } = useSecurityStore();

  const handleLaunchCopilot = (prompt?: string) => {
    if (prompt) {
      setPendingDrawerPrompt(prompt);
    }
    setSideDrawerOpen(true);
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto font-sans pb-20">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-6 sm:pt-10 pb-8 border-b border-[#E2E4DC]">
        <div className="max-w-4xl space-y-5">
          {/* Status Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF4FF] border border-[#D0DEFF] text-xs font-mono font-semibold text-[#1E4BD8]">
            <span className="w-2 h-2 rounded-full bg-[#1E4BD8] animate-pulse" />
            <span>GENESIS AI • AUTONOMOUS SECURITY PLATFORM</span>
            <span className="text-[#A7C1FF]">•</span>
            <span className="text-[#1E4BD8]/80">OPERATIONAL</span>
          </div>

          {/* Monumental Display Headline */}
          <h1 className="font-display font-semibold text-3xl sm:text-5xl lg:text-6xl text-[#111417] tracking-tight leading-[1.08]">
            Autonomous Security Intelligence.
            <br />
            <span className="text-[#5C645B]">Engineered for Modern Cyber Defense.</span>
          </h1>

          {/* Value Proposition Description */}
          <p className="text-base sm:text-lg text-[#5C645B] max-w-2xl leading-relaxed">
            GENESIS ingests heterogeneous log streams, performs autonomous forensic reasoning without simulated data, and dispatches deterministic SOAR countermeasures under strict human governance.
          </p>

          {/* Main Action Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="action"
              size="lg"
              onClick={() => handleLaunchCopilot()}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Open Copilot
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/response')}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Response Operations
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/audit')}
              icon={<FileText className="w-4 h-4" />}
            >
              Audit Trail
            </Button>
          </div>
        </div>

        {/* Telemetry Proof Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 mt-8 border-t border-[#E2E4DC] text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] tracking-wider">Log Ingestion</div>
            <div className="font-bold text-[#111417]">RFC 5424 & OpenSSH</div>
            <div className="text-[11px] text-[#1E4BD8]">Normalized & Parsed</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] tracking-wider">SOAR Defense</div>
            <div className="font-bold text-[#111417]">{playbooks.length} Active Playbooks</div>
            <div className="text-[11px] text-[#1E4BD8]">
              {autonomousResponseGlobalEnabled ? 'Engine Armed' : 'Halted'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] tracking-wider">Audit Integrity</div>
            <div className="font-bold text-[#111417]">SHA-256 Merkle Chain</div>
            <div className="text-[11px] text-[#1E4BD8]">{auditRecords.length} Blocks Verified</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] tracking-wider">Execution History</div>
            <div className="font-bold text-[#111417]">{actions.length} Persisted Actions</div>
            <div className="text-[11px] text-[#1E4BD8]">Deterministic SOAR</div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. CORE ARCHITECTURE PILLARS (3-COLUMN GRID)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#889085]">
              CORE SUBSYSTEMS
            </span>
            <h2 className="font-display font-semibold text-2xl text-[#111417] tracking-tight">
              Three Pillars of Autonomous Resilience
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Autonomous Copilot */}
          <div className="bg-white border border-[#E2E4DC] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#1E4BD8]/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF4FF] text-[#1E4BD8] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#111417]">
                Autonomous Forensic Copilot
              </h3>
              <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
                Interact with an intelligent security analyst that investigates authentic log datasets, calculates attack velocity, and synthesizes MITRE ATT&CK techniques with zero fabricated data.
              </p>
            </div>

            <button
              onClick={() => handleLaunchCopilot()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E4BD8] hover:text-[#1638A0] transition-colors cursor-pointer pt-2 border-t border-[#E2E4DC]"
            >
              <span>Open in Side Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pillar 2: Governed SOAR */}
          <div className="bg-white border border-[#E2E4DC] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#1E4BD8]/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0F1EA] text-[#111417] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#111417]">
                Governed SOAR Response
              </h3>
              <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
                Execute automated stateful isolation, firewall IP drops, and session terminations. Governed by strict human-in-the-loop authorization gates and kernel rollback controls.
              </p>
            </div>

            <button
              onClick={() => navigate('/response')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111417] hover:text-[#1E4BD8] transition-colors cursor-pointer pt-2 border-t border-[#E2E4DC]"
            >
              <span>Inspect Playbooks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pillar 3: Cryptographic Audit */}
          <div className="bg-white border border-[#E2E4DC] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#1E4BD8]/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0F1EA] text-[#111417] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#111417]">
                SHA-256 Merkle Ledger
              </h3>
              <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
                Every investigative finding, policy update, and automated countermeasure is appended to an immutable, cryptographically chained audit log for regulatory defensibility.
              </p>
            </div>

            <button
              onClick={() => navigate('/audit')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111417] hover:text-[#1E4BD8] transition-colors cursor-pointer pt-2 border-t border-[#E2E4DC]"
            >
              <span>Verify Cryptographic Chain</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. INTERACTIVE INVESTIGATION LAUNCHPAD (CLICK-TO-SIDE-CHATBOT)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#889085]">
            INSTANT LAUNCHPAD
          </span>
          <h2 className="font-display font-semibold text-2xl text-[#111417] tracking-tight">
            Launch an Autonomous Investigation
          </h2>
          <p className="text-xs sm:text-sm text-[#5C645B]">
            Select a security prompt to open the Copilot in the side drawer with immediate contextual analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleLaunchCopilot("Investigate recent brute force attacks on port 22")}
            className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between text-[#889085] group-hover:text-[#1E4BD8] mb-2">
              <span className="text-[10px] font-mono uppercase font-bold">SSH Threat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="font-semibold text-xs sm:text-sm text-[#111417] group-hover:text-[#1E4BD8]">
              Brute Force Velocity
            </div>
            <p className="text-[11px] text-[#5C645B] mt-1">
              Correlate authentication failures against heuristic thresholds.
            </p>
          </button>

          <button
            onClick={() => handleLaunchCopilot("Investigate IP address 198.51.100.42 and check telemetry")}
            className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between text-[#889085] group-hover:text-[#1E4BD8] mb-2">
              <span className="text-[10px] font-mono uppercase font-bold">IP Forensics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="font-semibold text-xs sm:text-sm text-[#111417] group-hover:text-[#1E4BD8]">
              Host Telemetry Audit
            </div>
            <p className="text-[11px] text-[#5C645B] mt-1">
              Inspect origin IP reputation, probed users, and target services.
            </p>
          </button>

          <button
            onClick={() => handleLaunchCopilot("Summarize current threat posture and system operational status")}
            className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between text-[#889085] group-hover:text-[#1E4BD8] mb-2">
              <span className="text-[10px] font-mono uppercase font-bold">System Posture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="font-semibold text-xs sm:text-sm text-[#111417] group-hover:text-[#1E4BD8]">
              Overall Security Posture
            </div>
            <p className="text-[11px] text-[#5C645B] mt-1">
              Synthesize ingestion rates, active incidents, and defense status.
            </p>
          </button>

          <button
            onClick={() => handleLaunchCopilot("Review active response playbooks and defense status")}
            className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between text-[#889085] group-hover:text-[#1E4BD8] mb-2">
              <span className="text-[10px] font-mono uppercase font-bold">Countermeasures</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="font-semibold text-xs sm:text-sm text-[#111417] group-hover:text-[#1E4BD8]">
              Active SOAR Policies
            </div>
            <p className="text-[11px] text-[#5C645B] mt-1">
              Examine stateful containment and kernel iptables drops.
            </p>
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. TECHNICAL INTEGRITY CALLOUT
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E2E4DC] rounded-xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1E4BD8]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#1E4BD8]">
              ENGINEERING COMMITMENT
            </span>
          </div>
          <h3 className="font-display font-semibold text-xl text-[#111417] tracking-tight">
            Deterministic Precision. Zero Manufactured Metrics.
          </h3>
          <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
            GENESIS operates strictly on real database transactions, kernel logs, and cryptographic proofs. Empty states remain honest rather than populated with synthetic threats.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="action"
            size="md"
            onClick={() => handleLaunchCopilot()}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Open Copilot
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/settings')}
            icon={<Sliders className="w-4 h-4" />}
          >
            Configure Safeguards
          </Button>
        </div>
      </section>

    </div>
  );
};

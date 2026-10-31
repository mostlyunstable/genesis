import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ResponseAction } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

export const ActionHistoryPage: React.FC = () => {
  const { actions, rollbackAction } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredActions = actions.filter(act => {
    if (statusFilter !== 'all' && act.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        act.actionName.toLowerCase().includes(q) ||
        act.target.toLowerCase().includes(q) ||
        (act.incidentId && act.incidentId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Defensive Action History</h2>
            <Badge variant="accent">SIMULATED EXECUTION TRAIL</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Cryptographically logged countermeasure executions with recorded rollback options and verification results.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            icon={<Search className="w-3.5 h-3.5 text-[#8994A4]" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action or target..."
            className="w-48 sm:w-64"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-mono"
          >
            <option value="all">All Results</option>
            <option value="simulated_success">Success (Simulated)</option>
            <option value="rolled_back">Rolled Back</option>
            <option value="simulated_failed">Failed</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#121720] border border-[#252D38] rounded-md overflow-hidden font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0F141C] border-b border-[#252D38] text-[#8994A4] uppercase">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Incident ID</th>
                <th className="py-2.5 px-3">Action Executed</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Execution Result</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3 text-right">Rollback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2430]">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#586574]">
                    No recorded defensive actions match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredActions.map((act) => (
                  <tr key={act.id} className="hover:bg-[#151D28] transition-colors">
                    <td className="py-2.5 px-3 text-[#E8EDF4] whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString()}
                      <span className="text-[10px] text-[#586574] ml-1">UTC</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#E0A34A] font-semibold">
                      {act.incidentId || 'Manual Trigger'}
                    </td>
                    <td className="py-2.5 px-3 text-[#E8EDF4] font-semibold">
                      {act.actionName}
                    </td>
                    <td className="py-2.5 px-3 text-[#6DA9E8]">
                      {act.target}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        act.status === 'simulated_success' ? 'bg-[#42B883]/15 text-[#42B883] border border-[#42B883]/30' :
                        act.status === 'rolled_back' ? 'bg-[#8994A4]/15 text-[#8994A4] border border-[#8994A4]/30' :
                        'bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/30'
                      }`}>
                        {act.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#8994A4]">
                      {act.durationMs}ms
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {act.rollbackAvailable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<RotateCcw className="w-3 h-3" />}
                          onClick={() => rollbackAction(act.id)}
                        >
                          Rollback
                        </Button>
                      ) : (
                        <span className="text-[10px] text-[#586574]">Not Available</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

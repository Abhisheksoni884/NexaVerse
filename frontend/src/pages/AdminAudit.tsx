import { useState } from 'react';
import { Download, Search, Filter, ShieldAlert, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  status: 'Success' | 'Denied' | 'Warning';
  ip: string;
}

const logs: AuditLog[] = [
  { id: '1', timestamp: '2024-03-16 14:32:01', user: 'alice@corp.com', role: 'Admin', action: 'DOCUMENT_DELETE', resource: 'Legacy_Contracts.pdf', status: 'Success', ip: '192.168.1.10' },
  { id: '2', timestamp: '2024-03-16 14:18:45', user: 'bob@corp.com', role: 'Analyst', action: 'DOCUMENT_VIEW', resource: 'Q3_Financials.docx', status: 'Success', ip: '192.168.1.24' },
  { id: '3', timestamp: '2024-03-16 13:55:12', user: 'eve@corp.com', role: 'Viewer', action: 'DOCUMENT_UPLOAD', resource: 'Report_Draft.pdf', status: 'Denied', ip: '192.168.1.99' },
  { id: '4', timestamp: '2024-03-16 13:40:03', user: 'carol@corp.com', role: 'Analyst', action: 'CHAT_QUERY', resource: 'Chat Session', status: 'Success', ip: '192.168.1.31' },
  { id: '5', timestamp: '2024-03-16 12:28:17', user: 'dave@corp.com', role: 'Viewer', action: 'LOGIN', resource: 'Auth Service', status: 'Warning', ip: '10.0.0.15' },
  { id: '6', timestamp: '2024-03-16 11:59:44', user: 'alice@corp.com', role: 'Admin', action: 'USER_ROLE_CHANGE', resource: 'frank@corp.com', status: 'Success', ip: '192.168.1.10' },
  { id: '7', timestamp: '2024-03-16 11:01:22', user: 'frank@corp.com', role: 'Analyst', action: 'DOCUMENT_UPLOAD', resource: 'Client_Report.pdf', status: 'Success', ip: '192.168.1.42' },
  { id: '8', timestamp: '2024-03-15 16:30:00', user: 'henry@corp.com', role: 'Viewer', action: 'LOGIN', resource: 'Auth Service', status: 'Denied', ip: '203.0.113.0' },
];

const statusStyles: Record<string, string> = {
  Success: 'bg-brand-teal/10 text-brand-teal',
  Denied: 'bg-brand-coral/10 text-brand-coral',
  Warning: 'bg-brand-lime/30 text-brand-dark',
};

const roleStyles: Record<string, string> = {
  Admin: 'bg-brand-blue/10 text-brand-blue',
  Analyst: 'bg-brand-teal/10 text-brand-teal',
  Viewer: 'bg-slate-100 text-slate-500',
};

export function AdminAudit() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.user.includes(search) || l.action.includes(search) || l.resource.includes(search);
    const matchStatus = statusFilter === 'All' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">System events, access control, and security flags</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: logs.length, color: 'bg-brand-blue/10 text-brand-blue' },
          { label: 'Successful', value: logs.filter(l => l.status === 'Success').length, color: 'bg-brand-teal/10 text-brand-teal' },
          { label: 'Denied', value: logs.filter(l => l.status === 'Denied').length, color: 'bg-brand-coral/10 text-brand-coral' },
          { label: 'Warnings', value: logs.filter(l => l.status === 'Warning').length, color: 'bg-brand-lime/40 text-brand-dark' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl p-5 ${c.color.split(' ')[0]}`}>
            <p className={`text-xs font-semibold ${c.color.split(' ')[1]} opacity-70`}>{c.label}</p>
            <p className={`text-3xl font-extrabold ${c.color.split(' ')[1]} mt-1`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, resource…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-10 py-2"
            />
          </div>
          <div className="flex items-center gap-2">
            {['All', 'Success', 'Denied', 'Warning'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  statusFilter === s
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    No matching log entries
                  </td>
                </tr>
              ) : filtered.map(l => (
                <tr key={l.id}>
                  <td className="text-xs font-mono text-slate-400 whitespace-nowrap">{l.timestamp}</td>
                  <td className="font-medium text-brand-dark">{l.user}</td>
                  <td><span className={`badge ${roleStyles[l.role]}`}>{l.role}</span></td>
                  <td className="font-mono text-xs text-slate-600">{l.action}</td>
                  <td className="text-slate-500 max-w-[160px] truncate">{l.resource}</td>
                  <td><span className={`badge ${statusStyles[l.status]}`}>{l.status}</span></td>
                  <td className="font-mono text-xs text-slate-400">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

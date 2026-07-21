import { useState, useEffect, useCallback } from 'react';
import { Download, Search, ShieldAlert, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';
import { adminAPI, type AuditLog } from '../utils/api';

const STATUS_STYLES: Record<string, string> = {
  true:  'bg-brand-teal/10 text-brand-teal',
  false: 'bg-brand-coral/10 text-brand-coral',
};

const ROLE_STYLES: Record<string, string> = {
  admin:   'bg-brand-blue/10 text-brand-blue',
  analyst: 'bg-brand-teal/10 text-brand-teal',
  viewer:  'bg-slate-100 text-slate-500',
};

const ACTION_FILTERS = ['All', 'login', 'document_upload', 'document_delete', 'chat_query', 'rbac_access_denied', 'content_safety_violation'];

export function AdminAudit() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminAPI.getAuditLogs(
        search || undefined,
        actionFilter !== 'All' ? actionFilter : undefined,
        undefined,
        undefined,
        undefined,
        page,
        PAGE_SIZE
      );
      setLogs(result.items);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await adminAPI.exportAuditLogs(format);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `audit_logs.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Export failed');
    }
  };

  const formatTimestamp = (ts: string) => {
    try { return new Date(ts).toLocaleString(); }
    catch { return ts; }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Summary stats derived from current page
  const successCount = logs.filter(l => l.success).length;
  const deniedCount  = logs.filter(l => !l.success).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total > 0 ? `${total} total events` : 'System events, access control, and security flags'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <div className="relative group">
            <button className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-10 hidden group-hover:block">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2.5 text-sm text-brand-dark hover:bg-slate-50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2.5 text-sm text-brand-dark hover:bg-slate-50"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',  value: total,        color: 'bg-brand-blue/10 text-brand-blue' },
          { label: 'This Page',     value: logs.length,  color: 'bg-slate-100 text-slate-500' },
          { label: 'Successful',    value: successCount, color: 'bg-brand-teal/10 text-brand-teal' },
          { label: 'Denied/Failed', value: deniedCount,  color: 'bg-brand-coral/10 text-brand-coral' },
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
              placeholder="Search by username…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="form-input pl-10 py-2"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ACTION_FILTERS.map(a => (
              <button
                key={a}
                onClick={() => { setActionFilter(a); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  actionFilter === a
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                )}
              >
                {a === 'All' ? 'All' : a.replace(/_/g, ' ')}
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
                <th>Tokens</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 text-brand-blue animate-spin" />
                    <p className="text-slate-400 text-sm">Loading audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-slate-400 text-sm">No matching log entries</p>
                  </td>
                </tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td className="text-xs font-mono text-slate-400 whitespace-nowrap">
                    {formatTimestamp(l.timestamp)}
                  </td>
                  <td className="font-medium text-brand-dark">{l.username}</td>
                  <td>
                    <span className={`badge ${ROLE_STYLES[l.role] ?? 'bg-slate-100 text-slate-500'}`}>
                      {l.role}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-600">
                    {l.action.replace(/_/g, ' ')}
                  </td>
                  <td className="text-slate-500 max-w-[160px] truncate" title={l.resource}>
                    {l.resource ?? '—'}
                  </td>
                  <td className="font-mono text-xs text-slate-400">
                    {l.total_tokens ? l.total_tokens.toLocaleString() : '—'}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_STYLES[String(l.success)]}`}>
                      {l.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Users, Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { adminAPI, type UserUsageSummary } from '../utils/api';

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-brand-blue/10 text-brand-blue',
  analyst: 'bg-brand-teal/10 text-brand-teal',
  viewer:  'bg-slate-100 text-slate-500',
};

const formatTokens = (n: number) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

export function AdminUsage() {
  const [users, setUsers]     = useState<UserUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminAPI.getUsageStats();
      setUsers(result.users ?? []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsage(); }, []);

  const totalTokens  = users.reduce((s, u) => s + (u.total_tokens || 0), 0);
  const totalCost    = users.reduce((s, u) => s + (u.estimated_cost_usd || 0), 0);
  const totalQueries = users.reduce((s, u) => s + (u.total_queries || 0), 0);
  const maxTokens    = Math.max(...users.map(u => u.total_tokens || 0), 1);

  const statCards = [
    { label: 'Total Tokens',   value: formatTokens(totalTokens),     sub: `${users.length} users`,     bg: 'bg-brand-blue',  text: 'text-white' },
    { label: 'Total Queries',  value: totalQueries.toLocaleString(),  sub: 'all time',                  bg: 'bg-brand-coral', text: 'text-white' },
    { label: 'Estimated Cost', value: `$${totalCost.toFixed(2)}`,     sub: 'Azure OpenAI',              bg: 'bg-brand-teal',  text: 'text-white' },
    { label: 'Active Users',   value: users.filter(u => u.total_tokens > 0).length.toString(), sub: 'with activity', bg: 'bg-brand-lime', text: 'text-brand-dark' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organisation-wide AI usage and cost overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsage}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-2xl p-5 flex flex-col gap-1 ${s.bg}`}>
            <p className={`text-xs font-semibold ${s.text} opacity-75`}>{s.label}</p>
            <p className={`text-3xl font-extrabold ${s.text} tracking-tight`}>
              {loading ? '…' : s.value}
            </p>
            <p className={`text-xs ${s.text} opacity-60 mt-1`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Top users table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-brand-dark">User Consumption</h3>
            <p className="text-xs text-slate-400 mt-0.5">Sorted by token usage (descending)</p>
          </div>
          <Users className="w-5 h-5 text-slate-300" />
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-brand-blue animate-spin" />
            <p className="text-slate-400 text-sm">Loading usage data...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-200" />
            <p className="text-slate-400 text-sm">No usage data yet. Start chatting to see analytics.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Total Tokens</th>
                  <th>Queries</th>
                  <th>Est. Cost</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const pct = Math.round(((u.total_tokens || 0) / maxTokens) * 100);
                  return (
                    <tr key={u.username}>
                      <td className="text-slate-400 font-mono text-xs w-8">{i + 1}</td>
                      <td className="font-medium text-brand-dark">{u.username}</td>
                      <td>
                        <span className={`badge ${ROLE_COLORS[u.role ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                          {u.role ?? '—'}
                        </span>
                      </td>
                      <td className="font-semibold text-brand-dark">
                        {formatTokens(u.total_tokens || 0)}
                      </td>
                      <td className="text-slate-500">{(u.total_queries || 0).toLocaleString()}</td>
                      <td className="font-mono text-sm text-slate-500">
                        ${(u.estimated_cost_usd || 0).toFixed(4)}
                      </td>
                      <td className="w-32">
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

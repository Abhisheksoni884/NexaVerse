import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Cpu, Calendar, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';
import { usageAPI, type MyUsageResponse, type RecentQuery } from '../utils/api';

const formatTokens = (n: number) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const formatTimestamp = (ts: string) => {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts;
  }
};

export function MyUsage() {
  const { user } = useAuth();
  const [usage, setUsage]         = useState<MyUsageResponse | null>(null);
  const [queries, setQueries]     = useState<RecentQuery[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usageRes, queriesRes] = await Promise.all([
        usageAPI.getPersonalUsage(),
        usageAPI.getRecentQueries(10),
      ]);
      setUsage(usageRes);
      setQueries(queriesRes.queries ?? []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const currentPeriod = usage?.periods?.[activePeriod];

  const PERIOD_LABELS: Record<string, string> = {
    daily:    'Today',
    weekly:   'This Week',
    monthly:  'This Month',
    all_time: 'All Time',
  };

  const statCards = [
    {
      label: 'Total Tokens',
      value: formatTokens(currentPeriod?.total_tokens || 0),
      sub: PERIOD_LABELS[activePeriod],
      bg: 'bg-brand-blue',
      text: 'text-white',
      icon: Cpu,
    },
    {
      label: 'Queries Made',
      value: (currentPeriod?.total_queries || 0).toLocaleString(),
      sub: PERIOD_LABELS[activePeriod],
      bg: 'bg-brand-teal',
      text: 'text-white',
      icon: TrendingUp,
    },
    {
      label: 'Avg per Query',
      value: currentPeriod?.total_queries
        ? Math.round((currentPeriod.total_tokens || 0) / currentPeriod.total_queries).toLocaleString()
        : '0',
      sub: 'tokens / query',
      bg: 'bg-brand-lime',
      text: 'text-brand-dark',
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">My Usage</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Token consumption for{' '}
            <span className="font-semibold text-brand-blue">{user?.username}</span>
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-2">
        {(['daily', 'weekly', 'monthly', 'all_time'] as const).map(p => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activePeriod === p
                ? 'bg-brand-dark text-white border-brand-dark'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* All periods breakdown */}
      {!loading && usage && (
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Breakdown by Period</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['daily', 'weekly', 'monthly', 'all_time'] as const).map(p => {
              const period = usage.periods[p];
              return (
                <div key={p} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {PERIOD_LABELS[p]}
                  </p>
                  <p className="text-2xl font-bold text-brand-dark">
                    {formatTokens(period?.total_tokens || 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">tokens</p>
                  <p className="text-sm font-semibold text-brand-teal mt-2">
                    {(period?.total_queries || 0)} queries
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent queries */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-brand-dark">Recent Queries</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your last 10 chat interactions</p>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-brand-blue animate-spin" />
            <p className="text-slate-400 text-sm">Loading queries...</p>
          </div>
        ) : queries.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-200" />
            <p className="text-slate-400 text-sm">No queries yet. Start a chat to see your history.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Tokens</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => {
                  // details field contains "Query: <text>" from the audit log
                  const queryText = q.details?.replace(/^Query:\s*/i, '') ?? q.action;
                  return (
                    <tr key={i}>
                      <td
                        className="max-w-xs truncate font-medium text-brand-dark"
                        title={queryText}
                      >
                        {queryText}
                      </td>
                      <td className="font-mono text-sm text-slate-500">
                        {q.total_tokens ? q.total_tokens.toLocaleString() : '—'}
                      </td>
                      <td className="text-slate-400 text-xs whitespace-nowrap">
                        {formatTimestamp(q.timestamp)}
                      </td>
                      <td>
                        <span className={`badge ${
                          q.success
                            ? 'bg-brand-teal/10 text-brand-teal'
                            : 'bg-brand-coral/10 text-brand-coral'
                        }`}>
                          {q.success ? 'Success' : 'Failed'}
                        </span>
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

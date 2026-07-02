import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, Cpu, Calendar, Download } from 'lucide-react';

const weekData = [
  { day: 'Mon', tokens: 6200,  queries: 18 },
  { day: 'Tue', tokens: 8400,  queries: 24 },
  { day: 'Wed', tokens: 5100,  queries: 15 },
  { day: 'Thu', tokens: 9200,  queries: 27 },
  { day: 'Fri', tokens: 7600,  queries: 22 },
  { day: 'Sat', tokens: 4000,  queries: 12 },
  { day: 'Sun', tokens: 2800,  queries: 6  },
];

const recentQueries = [
  { query: 'What is our Q3 revenue forecast?',    tokens: 412,  date: 'Today, 2:14 PM',  status: 'Success' },
  { query: 'Summarise the HR policy update',       tokens: 318,  date: 'Today, 11:03 AM', status: 'Success' },
  { query: 'Find contract renewal dates for 2025', tokens: 527,  date: 'Yesterday',       status: 'Success' },
  { query: 'List top 5 clients by revenue',        tokens: 289,  date: 'Yesterday',       status: 'Success' },
  { query: 'Explain the new expense policy',       tokens: 0,    date: '2 days ago',      status: 'Error'   },
];

export function MyUsage() {
  const { user } = useAuth();

  const statCards = [
    { label: 'Total Tokens',    value: '45,231', sub: 'This month',     bg: 'bg-brand-blue',  text: 'text-white', icon: Cpu },
    { label: 'Queries Made',    value: '124',    sub: 'This month',     bg: 'bg-brand-teal',  text: 'text-white', icon: TrendingUp },
    { label: 'Avg Daily Usage', value: '1,508',  sub: 'tokens / day',   bg: 'bg-brand-lime',  text: 'text-brand-dark', icon: Calendar },
  ];

  const maxTokens = Math.max(...weekData.map(d => d.tokens));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">My Usage</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Token consumption for <span className="font-semibold text-brand-blue">{user?.username}</span>
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-2xl p-5 flex flex-col gap-1 ${s.bg}`}>
            <p className={`text-xs font-semibold ${s.text} opacity-75`}>{s.label}</p>
            <p className={`text-3xl font-extrabold ${s.text} tracking-tight`}>{s.value}</p>
            <p className={`text-xs ${s.text} opacity-60 mt-1`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-brand-dark">Weekly Token Usage</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tokens consumed per day</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex items-end gap-3 h-32">
            {weekData.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  {d.tokens >= 1000 ? `${(d.tokens / 1000).toFixed(1)}k` : d.tokens}
                </span>
                <div
                  className="w-full rounded-t-lg bg-brand-blue/70 hover:bg-brand-blue transition-all duration-200"
                  style={{ height: `${(d.tokens / maxTokens) * 100}%` }}
                />
                <span className="text-[10px] text-slate-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary card */}
        <div className="card p-6 flex flex-col justify-between">
          <h3 className="font-semibold text-brand-dark">This Week</h3>
          <div className="space-y-3 mt-4">
            {[
              { label: 'Total tokens',   val: '43,300', color: 'bg-brand-blue' },
              { label: 'Total queries',  val: '124',     color: 'bg-brand-teal' },
              { label: 'Avg per query',  val: '349',     color: 'bg-brand-coral' },
              { label: 'Peak day',       val: 'Thursday', color: 'bg-brand-lime' },
            ].map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.color}`} />
                  <span className="text-xs text-slate-500">{m.label}</span>
                </div>
                <span className="text-sm font-semibold text-brand-dark">{m.val}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">Budget used</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[45%] rounded-full bg-brand-blue" />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">45%</span>
              <span className="text-xs text-slate-400">50K limit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent queries table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-brand-dark">Recent Queries</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your last 5 interactions</p>
        </div>
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
              {recentQueries.map((q, i) => (
                <tr key={i}>
                  <td className="max-w-xs truncate font-medium text-brand-dark">{q.query}</td>
                  <td className="font-mono text-sm text-slate-500">{q.tokens || '—'}</td>
                  <td className="text-slate-400 text-xs">{q.date}</td>
                  <td>
                    <span className={`badge ${q.status === 'Success' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-coral/10 text-brand-coral'}`}>
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

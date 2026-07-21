import { Users, Download, TrendingUp, Activity, Clock } from 'lucide-react';

const statCards = [
  { label: 'Total Tokens', value: '1.2M', sub: '+8% this week', bg: 'bg-brand-blue', text: 'text-white' },
  { label: 'Active Users', value: '45', sub: '3 online now', bg: 'bg-brand-coral', text: 'text-white' },
  { label: 'Active Sessions', value: '128', sub: 'across 12 roles', bg: 'bg-brand-teal', text: 'text-white' },
  { label: 'Error Rate', value: '0.2%', sub: 'Well within SLA', bg: 'bg-brand-lime', text: 'text-brand-dark' },
];

const topUsers = [
  { name: 'alice@corp.com', role: 'Admin', tokens: '128K', queries: 340 },
  { name: 'bob@corp.com', role: 'Analyst', tokens: '94K', queries: 251 },
  { name: 'carol@corp.com', role: 'Analyst', tokens: '78K', queries: 204 },
  { name: 'dave@corp.com', role: 'Viewer', tokens: '52K', queries: 140 },
  { name: 'eve@corp.com', role: 'Viewer', tokens: '41K', queries: 112 },
  { name: 'frank@corp.com', role: 'Analyst', tokens: '39K', queries: 98 },
  { name: 'grace@corp.com', role: 'Admin', tokens: '37K', queries: 87 },
  { name: 'henry@corp.com', role: 'Viewer', tokens: '26K', queries: 71 },
];

const roleColors: Record<string, string> = {
  Admin: 'bg-brand-blue/10 text-brand-blue',
  Analyst: 'bg-brand-teal/10 text-brand-teal',
  Viewer: 'bg-slate-100 text-slate-500',
};

// Simple bar chart using divs
const weekData = [
  { day: 'Mon', val: 65 },
  { day: 'Tue', val: 80 },
  { day: 'Wed', val: 55 },
  { day: 'Thu', val: 90 },
  { day: 'Fri', val: 75 },
  { day: 'Sat', val: 40 },
  { day: 'Sun', val: 30 },
];

export function AdminUsage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organisation-wide AI usage and cost overview</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-2xl p-5 flex flex-col gap-1 ${s.bg}`}>
            <p className={`text-xs font-semibold ${s.text} opacity-75`}>{s.label}</p>
            <p className={`text-3xl font-extrabold ${s.text} tracking-tight`}>{s.value}</p>
            <p className={`text-xs ${s.text} opacity-60 mt-1`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Token trend bar chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-brand-dark">Token Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily usage this week</p>
            </div>
            <Activity className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex items-end gap-3 h-36">
            {weekData.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-brand-blue/80 hover:bg-brand-blue transition-all"
                  style={{ height: `${d.val}%` }}
                />
                <span className="text-[10px] text-slate-400 font-medium">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost overview */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-brand-dark mb-1">Estimated Cost</h3>
            <p className="text-xs text-slate-400">Current billing period</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-brand-dark mt-4">$34.50</p>
            <p className="text-xs text-slate-400 mt-1">of $100 budget</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-[34.5%] rounded-full bg-brand-teal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { icon: TrendingUp, label: 'Avg/day', val: '$1.20' },
              { icon: Clock, label: 'Days left', val: '22' },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-3">
                <m.icon className="w-4 h-4 text-slate-400 mb-1" />
                <p className="text-lg font-bold text-brand-dark">{m.val}</p>
                <p className="text-xs text-slate-400">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top users table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-brand-dark">Top Users</h3>
            <p className="text-xs text-slate-400 mt-0.5">By token consumption</p>
          </div>
          <Users className="w-5 h-5 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Role</th>
                <th>Tokens</th>
                <th>Queries</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => {
                const pct = Math.round((parseInt(u.tokens) / 128) * 100);
                return (
                  <tr key={u.name}>
                    <td className="text-slate-400 font-mono text-xs w-8">{i + 1}</td>
                    <td className="font-medium text-brand-dark">{u.name}</td>
                    <td>
                      <span className={`badge ${roleColors[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="font-semibold text-brand-dark">{u.tokens}</td>
                    <td className="text-slate-500">{u.queries}</td>
                    <td className="w-32">
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

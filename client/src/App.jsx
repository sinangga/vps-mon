import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Cpu, HardDrive, LayoutList, Server } from 'lucide-react';

const socket = io('http://' + window.location.hostname + ':3001');

function App() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [staticData, setStaticData] = useState({});

  useEffect(() => {
    socket.on('staticData', (data) => setStaticData(data));
    socket.on('metrics', (data) => {
      setMetrics(data);
      setHistory(prev => [...prev.slice(-20), { time: data.timestamp, cpu: parseFloat(data.cpu.load), mem: parseFloat(data.memory.percent) }]);
    });
    return () => socket.off('metrics');
  }, []);

  if (!metrics) return <div className="flex h-screen bg-slate-950 text-white items-center justify-center">Loading monitor...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Activity className="text-blue-500" /> VPS Monitor
          </h1>
          <p className="text-slate-500 text-sm mt-1">{staticData.hostname} • {staticData.distro} ({staticData.arch})</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Uptime</div>
          <div className="text-lg font-mono text-blue-400">{(metrics.uptime / 3600).toFixed(1)} Hours</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Cpu />} label="CPU Usage" value={`${metrics.cpu.load}%`} color="text-yellow-500" />
        <StatCard icon={<HardDrive />} label="Memory" value={`${metrics.memory.percent}%`} sub={`Used: ${metrics.memory.used}`} color="text-cyan-500" />
        <StatCard icon={<LayoutList />} label="Processes" value={metrics.processes.total} sub={`${metrics.processes.running} Running`} color="text-purple-500" />
        <StatCard icon={<Server />} label="Load Avg" value={metrics.cpu.avg[0].toFixed(2)} sub="Last 1 min" color="text-green-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-medium mb-4 text-slate-400">CPU LOAD HISTORY</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} hide />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                <Area type="monotone" dataKey="cpu" stroke="#eab308" fillOpacity={1} fill="url(#colorCpu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-sm font-medium mb-4 text-slate-400">MEMORY HISTORY</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} hide />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                <Area type="monotone" dataKey="mem" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMem)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80">
          <h3 className="text-sm font-medium text-slate-400">TOP PROCESSES</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="p-4 font-medium">PID</th>
                <th className="p-4 font-medium">COMMAND</th>
                <th className="p-4 font-medium">USER</th>
                <th className="p-4 font-medium text-right">CPU %</th>
                <th className="p-4 font-medium text-right">MEM %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {metrics.processes.list.map((proc, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-400 font-mono">{proc.pid}</td>
                  <td className="p-4 text-white font-medium">{proc.name}</td>
                  <td className="p-4 text-slate-500">{proc.user}</td>
                  <td className="p-4 text-right text-yellow-500 font-mono">{proc.cpu.toFixed(1)}%</td>
                  <td className="p-4 text-right text-cyan-500 font-mono">{proc.mem.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} opacity-80`}>{icon}</div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default App;
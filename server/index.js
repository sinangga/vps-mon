const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all connections for dev ease, restrict in prod if needed
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial static data (OS Info) once on connection
  si.osInfo().then(data => {
      socket.emit('staticData', {
          platform: data.platform,
          distro: data.distro,
          release: data.release,
          hostname: data.hostname,
          arch: data.arch
      });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Polling data every 2 seconds (Lightweight)
setInterval(async () => {
  try {
    const [cpu, mem, load, processes] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.currentLoad(), // getting load again for specific load numbers if needed, but currentLoad has it
      si.processes()
    ]);

    // Optimize process list: only top 10 by CPU usage to save bandwidth
    const topProcesses = processes.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10);

    const data = {
      timestamp: new Date().toLocaleTimeString(),
      cpu: {
        load: cpu.currentLoad.toFixed(1),
        cores: cpu.cpus.map(c => c.load.toFixed(1)),
        avg: cpu.avgLoad
      },
      memory: {
        total: formatBytes(mem.total),
        used: formatBytes(mem.active),
        free: formatBytes(mem.available),
        percent: ((mem.active / mem.total) * 100).toFixed(1)
      },
      processes: {
        total: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        list: topProcesses
      },
      uptime: si.time().uptime
    };

    io.emit('metrics', data);
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}, 2000);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

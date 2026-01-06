const blessed = require('blessed');
const contrib = require('blessed-contrib');
const io = require('socket.io-client');

const screen = blessed.screen();
const grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

const line = grid.set(0, 0, 6, 8, contrib.line, {
    style: { line: "yellow", text: "white", baseline: "black" },
    xLabelPadding: 3,
    xPadding: 5,
    showLegend: true,
    wholeNumbersOnly: false,
    label: 'CPU Usage (%)'
});

const donut = grid.set(0, 8, 6, 4, contrib.donut, {
    label: 'Memory Usage',
    radius: 8,
    arcWidth: 3,
    remainColor: 'black',
    yPadding: 2,
});

const table = grid.set(6, 0, 6, 12, contrib.table, {
    keys: true,
    fg: 'white',
    selectedFg: 'white',
    selectedBg: 'blue',
    interactive: true,
    label: 'Top Processes',
    width: '30%',
    height: '30%',
    border: {type: "line", fg: "cyan"},
    columnSpacing: 10,
    columnWidth: [10, 20, 10, 10]
});

const cpuData = [{
    title: 'CPU',
    x: Array(20).fill(0).map((_, i) => i.toString()),
    y: Array(20).fill(0),
    style: {line: 'yellow'}
}];

const socket = io('http://localhost:3100');

socket.on('metrics', (data) => {
    // Update CPU Graph
    cpuData[0].y.shift();
    cpuData[0].y.push(parseFloat(data.cpu.load));
    line.setData(cpuData);

    // Update Memory Donut
    donut.setData([
        {percent: data.memory.percent, label: 'Used', color: 'red'}
    ]);

    // Update Process Table
    const tableData = data.processes.list.map(p => [
        p.pid.toString(),
        p.name.substring(0, 15),
        p.cpu.toFixed(1) + '%',
        (p.mem).toFixed(1) + '%'
    ]);
    table.setData({
        headers: ['PID', 'Command', 'CPU%', 'MEM%'],
        data: tableData
    });

    screen.render();
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

screen.render();

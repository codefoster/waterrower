export default [
    { type: 'ping', pattern: /PING/ },
    { type: 'pulse', pattern: /P([0-9A-F]{2})/ },
    { type: 'error', pattern: /ERROR/ },
    { type: 'strokestart', pattern: /SS/ },
    { type: 'strokeend', pattern: /SE/ },
    { type: 'exit', pattern: /EXIT/ },
    { type: 'hardwaretype', pattern: /_WR_/ },
    { type: 'datapoint', pattern: /ID([SDT])([0-9A-F]{3})([0-9A-F]+)/ },
    { type: 'ok', pattern: /OK/ }
    
];
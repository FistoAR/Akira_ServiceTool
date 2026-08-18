const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let issues = [];

    // Find all const/let declarations
    const declarations = [];
    lines.forEach((line, i) => {
        const match = line.match(/(const|let)\s+([a-zA-Z0-9_]+)\s*=/);
        if (match) {
            declarations.push({ name: match[2], line: i });
        }
    });

    // Check useEffect dependencies
    lines.forEach((line, i) => {
        const depMatch = line.match(/},\s*\[(.*?)\]\)/);
        if (depMatch) {
            const deps = depMatch[1].split(',').map(s => s.trim());
            deps.forEach(dep => {
                const dec = declarations.find(d => d.name === dep);
                if (dec && dec.line > i) {
                    issues.push("Variable " + dep + " used in dependency array at line " + (i + 1) + " but defined at line " + (dec.line + 1));
                }
            });
        }
    });

    if (issues.length > 0) {
        console.log('File:', filePath);
        issues.forEach(iss => console.log('  ', iss));
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            if (f !== 'node_modules' && f !== '.git' && f !== 'dist') walk(p);
        } else if (p.endsWith('.jsx') || p.endsWith('.js')) {
            checkFile(p);
        }
    });
}

walk('f:/Sham_Files/Sham/Projects/2026/web/AKIRA_SERVICE_TOOL/full-stack/frontend/src');

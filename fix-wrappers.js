const fs = require('fs');
const path = require('path');

const repls = [
    // Global Card wrappers
    ['rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm', 'app-card p-5'],
    ['rounded-2xl border border-app-border/90 bg-app-surface/50 p-4', 'app-card p-4'],
    ['rounded-2xl border border-app-border/90 bg-app-surface p-4 shadow-sm', 'app-card p-4'],
    
    // Potentials page
    ['rounded-2xl border border-app-border/90 bg-app-surface/95 p-5 shadow-sm backdrop-blur-sm sm:p-6', 'app-card p-5 sm:p-6 backdrop-blur-sm'],
    ['rounded-2xl border border-app-border/90 bg-app-surface/95 p-4 shadow-sm backdrop-blur-sm', 'app-card p-4 backdrop-blur-sm'],
    
    // Quality control compact files with long lines
    ['<section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm overflow-x-auto">', '<section className="app-table-shell overflow-x-auto mt-4">'],
    ['<table className="w-full min-w-[1000px] text-sm">', '<table className="app-table min-w-[1000px]">'],
    ['<table className="w-full min-w-[1100px] text-sm">', '<table className="app-table min-w-[1100px]">'],
    ['<tr className="border-b border-app-border/80 text-left text-app-muted">', '<tr>'],
    
    // Quality control internal buttons
    ['<button className="rounded border border-app-border px-2 py-1"', '<button className="app-button-secondary px-2 py-1 text-xs"'],
    ['<button className="rounded border border-red-200 bg-red-50 text-red-600 px-2 py-1"', '<button className="app-button-secondary text-red-600 px-2 py-1 text-xs"'],
    
    // Dashboard / cashflow leftovers
    ['rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60', 'app-card p-5'],
    ['rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/40', 'app-card p-5'],
    ['max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-app-border bg-white shadow-[0_24px_60px_rgba(17,24,39,0.18)]', 'app-card w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-[0_24px_60px_rgba(17,24,39,0.18)]'],
    
    // Feature card
    ['rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm', 'app-card p-5']
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('node_modules')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let original = content;
            for (const [a, b] of repls) {
                content = content.split(a).join(b);
            }
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'components'));
processDir(path.join(__dirname, 'app'));

#!/usr/bin/env node
/*
 Custom coverage formatter: prints per-file coverage with colors
 Green: >= 80%
 Red: 70% - <80%
 Yellow: < 70%
*/
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\u001b[0m',
  green: '\u001b[32m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  bold: '\u001b[1m',
};

function colorize(pct) {
  if (pct >= 80) return COLORS.green;
  if (pct >= 70) return COLORS.red;
  return COLORS.yellow;
}

function pctOf(covered, total) {
  if (!total) return 100;
  return Math.round((covered / total) * 100);
}

function main() {
  const summaryPath = path.resolve(process.cwd(), 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error(`${COLORS.red}No coverage summary found at ${summaryPath}${COLORS.reset}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const files = Object.entries(data).filter(([k]) => k !== 'total');

  console.log(`${COLORS.bold}\nPer-file coverage (color coded)${COLORS.reset}`);
  for (const [file, metrics] of files) {
    const linesPct = metrics.lines.pct ?? pctOf(metrics.lines.covered, metrics.lines.total);
    const funcsPct = metrics.functions.pct ?? pctOf(metrics.functions.covered, metrics.functions.total);
    const branchesPct = metrics.branches.pct ?? pctOf(metrics.branches.covered, metrics.branches.total);
    const stmtsPct = metrics.statements.pct ?? pctOf(metrics.statements.covered, metrics.statements.total);

    const avg = Math.round((linesPct + funcsPct + branchesPct + stmtsPct) / 4);
    const color = colorize(avg);

    console.log(`${color}${file}${COLORS.reset}`);
    console.log(`  lines: ${linesPct}%  functions: ${funcsPct}%  branches: ${branchesPct}%  statements: ${stmtsPct}%  avg: ${avg}%`);
  }

  const total = data.total;
  if (total) {
    const avg = Math.round(((total.lines.pct ?? 0) + (total.functions.pct ?? 0) + (total.branches.pct ?? 0) + (total.statements.pct ?? 0)) / 4);
    const color = colorize(avg);
    console.log(`${COLORS.bold}\nOverall average: ${color}${avg}%${COLORS.reset}`);
  }
}

main();

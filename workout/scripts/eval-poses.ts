import { DEMOS } from '../src/rig/demos';
import { metrics, solve } from '../src/rig/solve';
let fails = 0;
for (const d of Object.values(DEMOS)) {
  if (d.procedural) {
    let maxErr = 0, minY = 99;
    for (let i = 0; i < 24; i++) { const p = d.procedural.at(i / 24); const m = metrics(solve(p), p); maxErr = Math.max(maxErr, m.maxError); minY = Math.min(minY, m.minY); }
    console.log(`${d.id}: procedural maxErr=${maxErr.toFixed(2)} minY=${minY.toFixed(1)}`);
    continue;
  }
  const lines: string[] = [];
  for (const [name, pose] of Object.entries(d.poses)) {
    const m = metrics(solve(pose), pose);
    const keys = ['trunk','kneeR','kneeL','hipR','hipL','elbowR','elbowL','shoulderR','thighR','shinR','handYR','flareR','minY','maxError'];
    lines.push(`  ${name.padEnd(7)} ` + keys.map(k => `${k}=${m[k].toFixed(0)}`).join(' '));
  }
  const bad = d.checks.filter(c => { const p = d.poses[c.pose]; const v = metrics(solve(p), p)[c.metric]; return v === undefined || (c.min !== undefined && v < c.min) || (c.max !== undefined && v > c.max); })
    .map(c => { const p = d.poses[c.pose]; return `${c.pose}.${c.metric}=${metrics(solve(p), p)[c.metric]?.toFixed(1)} want [${c.min},${c.max}] (${c.note})`; });
  fails += bad.length;
  console.log(`${d.id}${bad.length ? '  FAIL' : ''}\n${lines.join('\n')}${bad.length ? '\n  !! ' + bad.join('\n  !! ') : ''}`);
}
console.log('check failures:', fails);

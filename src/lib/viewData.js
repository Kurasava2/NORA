import { periodYear } from './domain.js'
export function groupPeriods(periods){const groups=new Map();for(const p of periods){const y=periodYear(p)||'Без года';if(!groups.has(y))groups.set(y,[]);groups.get(y).push(p)}return [...groups.entries()].sort((a,b)=>Number(b[0])-Number(a[0]))}

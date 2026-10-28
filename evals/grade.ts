// bun run evals:grade   serves the grading page on :3002. Grades save into the run's file in evals/runs/ as you
//                       click, so closing the tab loses nothing
import fs from 'node:fs';
import path from 'node:path';
import type { Grade, Run } from './types';

const PORT = 3002;
const DIR = path.join(process.cwd(), 'evals', 'runs');
const SAFE_ID = /^[\w.-]+$/;

const fileOf = (id: string) => path.join(DIR, `${id}.json`);
const read = (id: string) => JSON.parse(fs.readFileSync(fileOf(id), 'utf8')) as Run;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function summary(run: Run) {
  const grades = Object.values(run.grades);
  const scores = (pick: (g: Grade) => (number | undefined)[]) =>
    mean(grades.flatMap(pick).filter((x): x is number => typeof x === 'number'));
  const checks = run.cases.flatMap((c) => c.turns.flatMap((t) => t.checks));
  return {
    id: run.id,
    model: run.model,
    createdAt: run.createdAt,
    turns: run.cases.reduce((n, c) => n + c.turns.length, 0),
    graded: grades.filter((g) => g.accuracy || g.voice || g.focus).length,
    checks: { passed: checks.filter((c) => c.pass).length, total: checks.length },
    accuracy: scores((g) => [g.accuracy]),
    voice: scores((g) => [g.voice]),
    focus: scores((g) => [g.focus]),
    chips: scores((g) => [g.chips]),
    followUps: scores((g) => g.followUps ?? []),
  };
}

function listRuns() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => summary(read(f.slice(0, -'.json'.length))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

Bun.serve({
  port: PORT,
  routes: {
    '/': new Response(Bun.file(path.join(import.meta.dir, 'grade.html'))),
    '/api/runs': () => Response.json(listRuns()),
    '/api/runs/:id': (req) => {
      const { id } = req.params;
      if (!SAFE_ID.test(id) || !fs.existsSync(fileOf(id)))
        return new Response('no such run', { status: 404 });
      return Response.json(read(id));
    },
    '/api/runs/:id/grades/:key': {
      PUT: async (req) => {
        const { id, key } = req.params;
        if (!SAFE_ID.test(id) || !fs.existsSync(fileOf(id)))
          return new Response('no such run', { status: 404 });
        const run = read(id);
        const [caseId, index] = decodeURIComponent(key).split('/');
        if (!run.cases.find((c) => c.id === caseId)?.turns[Number(index)]) {
          return new Response('no such turn', { status: 404 });
        }
        run.grades[`${caseId}/${index}`] = (await req.json()) as Grade;
        fs.writeFileSync(fileOf(id), JSON.stringify(run, null, 2));
        return Response.json(summary(run));
      },
    },
  },
  fetch: () => new Response('not found', { status: 404 }),
});

console.log(`grading at http://localhost:${PORT}`);

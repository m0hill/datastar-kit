#!/usr/bin/env bash
set -euo pipefail

node --input-type=module <<'NODE'
import fs from 'node:fs'
import path from 'node:path'

const trackerPath = path.join('tasks', 'tasks.json')
const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'))
const allowed = new Set(tracker.status_values)
const byId = new Map(tracker.tasks.map((task) => [task.id, task]))
const counts = Object.fromEntries(tracker.status_values.map((status) => [status, 0]))
let statusMismatches = 0
let dependencyViolations = 0
let invalidStatuses = 0

for (const task of tracker.tasks) {
  if (!allowed.has(task.status)) invalidStatuses++
  counts[task.status] = (counts[task.status] ?? 0) + 1

  const markdownPath = path.join('tasks', task.markdown)
  const markdown = fs.readFileSync(markdownPath, 'utf8')
  const statusMatch = markdown.match(/## Status\s*\n\s*`([^`]+)`/m)
  if (!statusMatch || statusMatch[1] !== task.status) statusMismatches++

  if (task.status === 'done') {
    for (const dependencyId of task.depends_on) {
      const dependency = byId.get(dependencyId)
      if (!dependency || dependency.status !== 'done') dependencyViolations++
    }
  }
}

const currentTaskValid = tracker.current_task == null || byId.has(tracker.current_task) ? 1 : 0

console.log(`METRIC completed_tasks=${counts.done ?? 0}`)
console.log(`METRIC pending_tasks=${counts.pending ?? 0}`)
console.log(`METRIC running_tasks=${counts.running ?? 0}`)
console.log(`METRIC blocked_tasks=${counts.blocked ?? 0}`)
console.log(`METRIC deferred_tasks=${counts.deferred ?? 0}`)
console.log(`METRIC status_mismatches=${statusMismatches}`)
console.log(`METRIC dependency_violations=${dependencyViolations}`)
console.log(`METRIC invalid_statuses=${invalidStatuses}`)
console.log(`METRIC current_task_valid=${currentTaskValid}`)

if (statusMismatches > 0 || dependencyViolations > 0 || invalidStatuses > 0 || currentTaskValid !== 1) {
  process.exit(1)
}
NODE

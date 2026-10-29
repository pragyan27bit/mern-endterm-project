import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, scoreTask, shiftDay, remainingMinutes } from '../server/src/lib/planner.js';
const task = (id, overrides = {}) => ({ _id: id, title: 'Example', status: 'todo', priority: 'medium', estimateMinutes: 60, spentMinutes: 0, dueDate: '2026-11-03', dependsOn: null, ...overrides });
test('capacity is never exceeded on any day', () => {
  const plan = buildPlan([task('a',{estimateMinutes:300}), task('b',{estimateMinutes:240})], '2026-11-01', 120);
  for (const day of plan.days) assert.ok(plan.blocks.filter(b => b.day === day).reduce((n,b)=>n+b.minutes,0) <= 120);
});
test('does not allocate work after a deadline', () => {
  const plan = buildPlan([task('a',{estimateMinutes:360,dueDate:'2026-11-01'})], '2026-11-01', 60);
  assert.equal(plan.scheduledMinutes, 60);
  assert.equal(plan.unallocatedMinutes, 300);
});
test('blocked tasks stay out of schedule and become conflicts', () => {
  const plan = buildPlan([task('a'), task('b',{dependsOn:'a'})], '2026-11-01', 180);
  assert.equal(plan.blocks.some(b => b.task === 'b'), false);
  assert.equal(plan.conflicts.find(c => c.task === 'b')?.reason, 'Blocked by a prerequisite');
});
test('finished parent unlocks dependent work', () => {
  const plan = buildPlan([task('a',{status:'done'}), task('b',{dependsOn:'a'})], '2026-11-01', 180);
  assert.ok(plan.blocks.some(b => b.task === 'b'));
});
test('logged time reduces remaining workload', () => {
  assert.equal(remainingMinutes(task('x',{estimateMinutes:90,spentMinutes:70})),20);
});
test('urgent high priority outranks distant low priority', () => {
  assert.ok(scoreTask(task('a',{dueDate:'2026-11-01',priority:'high'}),'2026-11-01') > scoreTask(task('b',{dueDate:'2026-11-25',priority:'low'}),'2026-11-01'));
});
test('date shift crosses months and years', () => assert.equal(shiftDay('2026-12-31',1),'2027-01-01'));
test('invalid capacity is rejected', () => assert.throws(() => buildPlan([], '2026-11-01', 13), /Invalid capacity/));
test('small remaining minutes are allocated rather than discarded', () => {
  const plan = buildPlan([task('partial',{estimateMinutes:90,spentMinutes:83})], '2026-11-01', 60);
  assert.equal(plan.scheduledMinutes, 7);
  assert.equal(plan.unallocatedMinutes, 0);
});

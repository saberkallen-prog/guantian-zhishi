const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('../dist/model.js');

test('year navigation wraps and each of the 24 terms has a complete field scene', () => {
  assert.equal(model.getTerm(8)?.name, '芒种');
  assert.equal(model.getTerm(24)?.name, '立春');
  assert.equal(model.getTerm(-1)?.name, '大寒');
  const terms = Array.from({ length: 24 }, (_, index) => model.getTerm(index));
  assert.equal(new Set(terms.map(term => term.name)).size, 24);
  for (const term of terms) {
    assert.ok(term.description && term.field && term.action && term.scene);
    assert.ok(term.longitude >= 0 && term.longitude < 360);
  }
});

test('field experience records once per term, and preserves previously visited terms', () => {
  const first = model.recordObservation([], 8);
  assert.equal(first.length, 1);
  assert.equal(first[0].name, '芒种');
  assert.deepEqual(model.recordObservation(first, 8), first);
  const second = model.recordObservation(first, 16);
  assert.equal(second.length, 2);
  assert.equal(second[1].name, '寒露');
  assert.equal(first.length, 1);
});

test('spring, summer, harvest and winter show distinct field states', () => {
  assert.equal(model.getTerm(4).scene, 'spring');
  assert.equal(model.getTerm(8).scene, 'summer');
  assert.equal(model.getTerm(16).scene, 'autumn');
  assert.equal(model.getTerm(20).scene, 'winter');
  assert.notEqual(model.getTerm(8).action, model.getTerm(16).action);
});

test('each solar term drives a distinct crop state, including fallow and winter fields', () => {
  assert.equal(typeof model.getFieldState, 'function');
  const states = Array.from({ length:24 }, (_, index) => model.getFieldState(index));
  assert.equal(new Set(states.map(state => JSON.stringify(state))).size, 24);
  for (const state of states) {
    for (const key of ['height','density','grain','ripeness','water','stubble','frost','nursery']) {
      assert.ok(Number.isFinite(state[key]), key);
      assert.ok(state[key] >= 0 && state[key] <= 1, key);
    }
  }
});

test('dragging between terms interpolates actual crop height instead of snapping to a season', () => {
  const start = model.getFieldState(10);
  const middle = model.getFieldState(10.5);
  const end = model.getFieldState(11);
  assert.ok(start.height < middle.height && middle.height < end.height);
  assert.ok(Math.abs(middle.height - (start.height + end.height) / 2) < 0.00001);
  assert.deepEqual(model.getFieldState(-10),model.getFieldState(0));
  assert.deepEqual(model.getFieldState(30),model.getFieldState(23));
});

test('rice visibly grows, develops grain, ripens and leaves stubble after harvest', () => {
  assert.ok(model.getFieldState(8).height < model.getFieldState(12).height);
  assert.ok(model.getFieldState(12).grain < model.getFieldState(15).grain);
  assert.ok(model.getFieldState(14).ripeness < model.getFieldState(16).ripeness);
  assert.equal(model.getFieldState(18).height,0);
  assert.ok(model.getFieldState(18).stubble > 0);
  assert.ok(model.getFieldState(21).frost < model.getFieldState(23).frost);
});

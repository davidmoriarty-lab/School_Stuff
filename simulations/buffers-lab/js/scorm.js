/* scorm.js: tells the school's learning system (Canvas, Schoology, Moodle, Blackboard...) how the
 * student is doing. Speaks SCORM 1.2, the version almost every system accepts.
 *
 * How it works:
 *   - The learning system opens this page inside a frame and puts an object called "API" on one
 *     of the windows above it. find() climbs up through the parent windows looking for it.
 *   - While the student works we send a score from 0 to 100 (how many of the 8 procedure steps
 *     are done).
 *   - The lab counts as COMPLETED when all 8 procedure steps are done (both buffers made, stirred
 *     and measured with the pH meter). Then we send lesson_status = "completed".
 * If the page is opened on its own (no learning system), every function here quietly does nothing.
 */
(function (root) {
  'use strict';
  function find(win) { let n = 0; try { while (win && n++ < 12) { if (win.API) return win.API; if (win.parent && win.parent !== win) win = win.parent; else break; } } catch (e) { /* a parent on another site: stop looking */ } return null; }
  let api = null; try { api = find(root) || (root.opener ? find(root.opener) : null); } catch (e) { api = null; }
  const call = (fn, a, b) => { try { return b === undefined ? api[fn](a) : api[fn](a, b); } catch (e) { return ''; } };
  const st = { on: false, done: false, score: 0, steps: 0, t0: Date.now(), lastCommit: 0, finished: false };

  if (api && String(call('LMSInitialize', '')) === 'true') {
    st.on = true;
    const status = call('LMSGetValue', 'cmi.core.lesson_status');
    st.done = status === 'completed' || status === 'passed';
    st.score = parseFloat(call('LMSGetValue', 'cmi.core.score.raw')) || 0;
    if (!st.done) call('LMSSetValue', 'cmi.core.lesson_status', 'incomplete');
    call('LMSSetValue', 'cmi.core.score.min', '0'); call('LMSSetValue', 'cmi.core.score.max', '100'); call('LMSCommit', '');
  }
  function commit(force) { if (!st.on) return; const now = Date.now(); if (!force && now - st.lastCommit < 8000) return; st.lastCommit = now; call('LMSCommit', ''); }
  function badge() { const el = root.document && root.document.getElementById('status'); if (!el) return; el.textContent = st.done ? '✔ Lab complete' + (st.on ? ' · reported to your class' : '') : 'Lab in progress · ' + st.score + ' %'; el.classList.toggle('done', st.done); }
  /* called by the notebook with the number of procedure steps done (0-8) */
  function report(steps) {
    st.steps = Math.max(st.steps, steps);
    const score = Math.round(st.steps / 8 * 100), was = st.done;
    if (score > st.score) { st.score = score; if (st.on) call('LMSSetValue', 'cmi.core.score.raw', String(score)); }
    if (st.steps >= 8) st.done = true;
    if (st.done && !was) { st.score = 100; if (st.on) { call('LMSSetValue', 'cmi.core.score.raw', '100'); call('LMSSetValue', 'cmi.core.lesson_status', 'completed'); commit(true); } }
    else commit(false);
    badge(); return st.done;
  }
  function finish() {
    if (!st.on || st.finished) return; st.finished = true;
    const sec = Math.round((Date.now() - st.t0) / 1000), p = (n) => (n < 10 ? '0' : '') + n;
    call('LMSSetValue', 'cmi.core.session_time', p(Math.floor(sec / 3600)) + ':' + p(Math.floor(sec / 60) % 60) + ':' + p(sec % 60));
    call('LMSSetValue', 'cmi.core.exit', st.done ? '' : 'suspend'); call('LMSCommit', ''); call('LMSFinish', '');
  }
  if (root.addEventListener) { root.addEventListener('pagehide', finish); root.addEventListener('beforeunload', finish); root.addEventListener('DOMContentLoaded', badge); }
  root.BufScorm = { report, finish, get connected() { return st.on; }, get done() { return st.done; }, get score() { return st.score; } };
})(typeof self !== 'undefined' ? self : this);

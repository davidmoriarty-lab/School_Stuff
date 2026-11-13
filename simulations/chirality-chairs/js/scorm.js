/* scorm.js: tells the school's learning system (Schoology, Canvas, Moodle, Blackboard...) how the
 * student is doing, and lets the student come back where they left off. SCORM 1.2.
 *
 * How it works:
 *   - The learning system opens this page in a frame and puts an object called "API" on one of the
 *     windows above it. find() climbs up through the parent windows looking for it.
 *   - Score (the grade): every time an answer is checked we send the percent of the 12 problems completed
 *     (cmi.core.score.raw, 0-100). A problem only counts when it is answered correctly. If the student
 *     uses the worked solution, the page gives that spot a similar problem instead. The score reaches 100
 *     when the set is complete.
 *   - Completion: when all 12 problems have been answered correctly we send lesson_status = "completed".
 *     Once completed it is never set back to "incomplete".
 *   - Saving: the student's place and answers are packed into cmi.suspend_data (limit 4096 characters)
 *     and the current problem is stored in cmi.core.lesson_location, so the student can close the page
 *     and continue later, even on another computer.
 * Opened on its own (no learning system), every function here quietly does nothing and the page falls
 * back to saving in the browser.
 */
(function (root) {
  'use strict';
  function find(win) { let n = 0; try { while (win && n++ < 12) { if (win.API) return win.API; if (win.parent && win.parent !== win) win = win.parent; else break; } } catch (e) { /* a parent on another site: stop looking */ } return null; }
  let api = null; try { api = find(root) || (root.opener ? find(root.opener) : null); } catch (e) { api = null; }
  const call = (fn, a, b) => { try { return b === undefined ? api[fn](a) : api[fn](a, b); } catch (e) { return ''; } };
  const st = { on: false, done: false, score: 0, saved: null, loc: '', t0: Date.now(), lastCommit: 0, finished: false };

  if (api && String(call('LMSInitialize', '')) === 'true') {
    st.on = true;
    const status = call('LMSGetValue', 'cmi.core.lesson_status');
    st.done = status === 'completed' || status === 'passed';
    st.score = parseFloat(call('LMSGetValue', 'cmi.core.score.raw')) || 0;
    st.loc = call('LMSGetValue', 'cmi.core.lesson_location') || '';
    try { const sd = call('LMSGetValue', 'cmi.suspend_data'); if (sd) st.saved = JSON.parse(sd); } catch (e) { st.saved = null; }
    if (!st.done) call('LMSSetValue', 'cmi.core.lesson_status', 'incomplete');
    call('LMSSetValue', 'cmi.core.score.min', '0'); call('LMSSetValue', 'cmi.core.score.max', '100'); call('LMSCommit', '');
  }
  function commit(force) { if (!st.on) return false; const now = Date.now(); if (!force && now - st.lastCommit < 4000) return true; st.lastCommit = now; call('LMSCommit', ''); return true; }

  /* correct = problems answered correctly, finished = problems that count toward completion (the same thing), total = 13 */
  function report(correct, finished, total) {
    if (!st.on) return false;
    const score = Math.round(correct / total * 100), complete = finished >= total;
    if (!st.done || score >= st.score) { st.score = Math.max(score, st.done ? st.score : 0); call('LMSSetValue', 'cmi.core.score.raw', String(st.score)); }
    if (complete && !st.done) { st.done = true; call('LMSSetValue', 'cmi.core.lesson_status', 'completed'); commit(true); } else commit(false);
    return st.done;
  }
  /* pack the student's work into suspend_data. text must be a JSON string of at most 4000 characters. */
  function suspend(text, location, force) {
    if (!st.on) return false;
    if (text.length > 4000) return false;
    call('LMSSetValue', 'cmi.suspend_data', text); call('LMSSetValue', 'cmi.core.lesson_location', String(location)); commit(!!force);
    return true;
  }
  function finish() {
    if (!st.on || st.finished) return; st.finished = true;
    const sec = Math.round((Date.now() - st.t0) / 1000), p = (n) => (n < 10 ? '0' : '') + n;
    call('LMSSetValue', 'cmi.core.session_time', p(Math.floor(sec / 3600)) + ':' + p(Math.floor(sec / 60) % 60) + ':' + p(sec % 60));
    call('LMSSetValue', 'cmi.core.exit', st.done ? '' : 'suspend'); call('LMSCommit', ''); call('LMSFinish', '');
  }
  if (root.addEventListener) { root.addEventListener('pagehide', finish); root.addEventListener('beforeunload', finish); }
  root.ChiralScorm = { report, suspend, commit, finish, get connected() { return st.on; }, get done() { return st.done; }, get saved() { return st.saved; }, get score() { return st.score; } };
})(typeof self !== 'undefined' ? self : this);

const core = require('@actions/core');
const process = require('node:process');
const child_process = require('child_process');
const { Tail } = require('tail');
const moment = require('moment');

let on_exit = '';

function log_msg(msg) {
  return moment().format('yyyy-MM-DD HH:mm:ss ') + msg;
}

function notice(msg) {
  core.notice(log_msg(msg));
}
function error(msg) {
  core.error(log_msg(msg));
}

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function tail(file) {
  if (file.length === 0) {
    return;
  }

  if (!core.isDebug()) {
    notice(`Rerun with debug logging to tail ${file}`);
    return;
  }

  try {
    const t = new Tail(file, { fromBeginning: true });
    t.on('line', (data) => core.debug(data));
    t.on('error', (err) => core.error(err));

    // Give the output that follows an imperfect chance
    // to avoid getting lost in tail output
    await sleep(1000);
  } catch (e) {
    error(`Failed to tail log ${file}`);
    core.error(e);
  }
}

function exec(cmd, args, options) {
  try {
    child_process.execFileSync(cmd, args, options);
    return true;
  } catch (e) {
    if ('error' in e) {
      // Something went wrong - executable not found etc
      throw e;
    }
    return false;
  }
}

function check(session_exe, status) {
  // At the time of writing, there weren't any good nodejs libraries to
  // inspect running processes.  For example, process-list requires a
  // later default C++ than is currently available on GitHub runners and
  // isn't GitHub runner friendly.
  if (status) {
    const args = ['-o', 'pid=,stime=,cmd=', '-C', session_exe];
    return exec('/usr/bin/ps', args, { stdio: 'inherit' });
  }
  return exec('/usr/bin/pgrep', ['-x', session_exe]);
}

async function wait_sessions(
  tail_log,
  session_exe,
  wait_minutes,
  check_period,
  status_period,
) {
  await tail(tail_log);

  notice(`Waiting ${wait_minutes} minutes for sessions to start`);
  await sleep(wait_minutes * 60 * 1000);

  const check_period_ms = check_period * 1000;
  const status_period_ms = status_period * 1000;
  let next_status = null;

  for (;;) {
    const now = Date.now();
    let result;

    if (now >= next_status) {
      notice(`Waiting for open sessions to close (${session_exe})`);
      result = check(session_exe, true);
      next_status = now + status_period_ms;
    } else {
      result = check(session_exe, false);
    }

    if (!result) break;
    await sleep(check_period_ms); // eslint-disable-line no-await-in-loop
  }

  notice('All sessions closed');
}

function parse_on_exit(on_exit_json) {
  on_exit = null;
  if (on_exit_json === null || on_exit_json.length === 0) return;

  let obj = null;
  let valid = true;

  try {
    obj = JSON.parse(on_exit_json);
  } catch (e) {
    valid = false;
  }

  if (!valid || !Array.isArray(obj) || !obj.every((x) => typeof x === 'string')) {
    throw new Error(`Invalid JSON string array on-exit: ${on_exit_json}`);
  }

  if (obj.length === 0) return;

  on_exit = obj;
}

function exec_on_exit() {
  if (on_exit === null) return;

  const my_on_exit = on_exit;
  on_exit = null;
  notice(`Executing on-exit: ${JSON.stringify(my_on_exit)}`);
  exec(my_on_exit[0], my_on_exit.slice(1));
}

function do_exit(rc) {
  const msg = `exit(${rc})`;
  if (rc === 0) notice(msg);
  else error(msg);
  process.exit(rc);
}

function on_signal(signal, code) {
  error(`Recieved ${signal}`);
  exec_on_exit();
  do_exit(code + 128);
}

async function run() {
  // Setting defaults here makes it easier for nested defaults from callers, as
  // missing inputs get propagated as empty strings or zeros.  This avoids
  // having to set defaults all the way up the action/workflow stack.
  const tail_log = core.getInput('tail-log');
  const session_exe = core.getInput('session-exe') || 'login';
  const wait_minutes = parseInt(core.getInput('wait-minutes'), 10) || 10;
  const check_period = parseInt(core.getInput('check-period'), 10) || 10;
  const status_period = parseInt(core.getInput('status-period'), 10) || 5 * 60;
  const on_exit_json = core.getInput('on-exit');

  parse_on_exit(on_exit_json);
  process.on('SIGINT', on_signal);
  process.on('SIGTERM', on_signal);

  await wait_sessions(
    tail_log,
    session_exe,
    wait_minutes,
    check_period,
    status_period,
  );

  exec_on_exit();
  do_exit(0);
}

run();

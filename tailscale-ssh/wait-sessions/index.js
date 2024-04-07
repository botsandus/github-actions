const core = require('@actions/core');

const child_process = require('child_process');
const Tail = require("tail").Tail;
const moment = require('moment');

function log(msg) {
	console.log(moment().format('yyyy-MM-DD HH:mm:ss'), msg)
}

function tail(file) {
	tail = new Tail(file, {fromBeginning: true})
	tail.on("line", function(data) {  console.log(data); });
	tail.on("error", function(error) { console.error(error); });
}

function exec(cmd, args, options) {
	try {
		child_process.execFileSync(cmd, args, options);
		return true;
	} catch (e) {
		if( 'error' in e ) {
			// Something went wrong - executable not found etc
			throw(e);
		}
		return false;
	}
}

function check(session_exe, status) {
	// At the time of writing, there weren't any good nodejs libraries to
	// inspect running processes.  For example, process-list requires a
	// later default C++ than is currently available on GitHub runners and
	// isn't GitHub runner friendly.
	if(status) {
		args = ['-o', 'pid=,stime=,cmd=', '-C', session_exe];
		return exec('/usr/bin/ps', args, {stdio: 'inherit'} );
	}
	else
	{
		return exec('/usr/bin/pgrep', ['-x', session_exe]);
	}
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function wait_sessions(tail_log, session_exe, wait_minutes, check_period, status_period) {
	if(tail_log.length > 0) {
		tail('test.log');
	}

	// Give the output that follows an imperfect chance
	// to avoid getting lost in tail output
	await sleep(1000);

	log(`Waiting ${wait_minutes} minutes for sessions to start`);
	await sleep(wait_minutes * 60 * 1000);

	check_period *= 1000;
	status_period *= 1000;
	next_status = null;

	while(true) {
		now = Date.now();

		if(now >= next_status) {
			log("Waiting for open sessions to close");
			result = check(session_exe, true);
			next_status = now + status_period;
		} else {
			result = check(session_exe, false);
		}

		if(!result) break;
		await sleep(check_period);
	}

	log("All sessions closed - exiting")
	process.exit(0)
}

async function run() {
	const tail_log = core.getInput('tail-log');
	const session_exe = core.getInput('session-exe');
	wait_minutes = core.getInput('wait-minutes');
	check_period = core.getInput('check-period');
	status_period = core.getInput('status-period');

	if(wait_minutes == 0) wait_minutes = 10;
	if(check_period == 0) check_period = 10;
	if(status_period == 0) status_period = 5*60;

	//wait_sessions('', 'sleep', 1/60, 1, 5);
	wait_sessions(tail_log, session_exe, wait_mins, check_period, status_period);
}

run();

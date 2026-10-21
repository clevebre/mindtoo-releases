// MindToo for Cowork and Code sessions in the Claude app. Two moments, one script:
//   prompt  (UserPromptSubmit: the person pressed Enter) - reminds Claude to save this turn to MindToo.
//   stop    (Stop: the reply is finished) - if this turn was not saved and MindToo's tools exist in this session,
//           Claude may not finish yet: it is told to call mindtoo_log first. And if the turn was saved but the reply
//           it saved never reached the person, it is told to send that reply now. Once per turn at most.
// WHY THE SECOND CHECK (0.1.1, 8 Oct 2026): in Cowork and Code sessions only the text Claude writes AFTER its last
// tool call is shown to the person; anything before a tool call is summarised away. A reply written first and then
// logged reaches MindToo and not the person, who sees only what came after the log ("Logged."). So the log must come
// first and the reply last, and the Stop hook checks that the reply given to mindtoo_log is the reply the person got.
// It never gets in the way: any error, and it exits quietly. Where MindToo's own hooks already capture this session
// directly (Claude Code on the person's computer, with MindToo installed), it does nothing, so nothing is kept twice.
// 0.2.0 (11 Oct 2026, for Brooke: "make it impossible for it not to be recorded in hsmg and mindtoo"): A TURN THE SESSION
// SAVED BY ITSELF. Claude Code can run a hook that calls mindtoo_log itself (type mcp_tool), with no choice by Claude:
// the person's words when they press Enter, the reply when it ends. Such a hook leaves MindToo's own receipt in the
// transcript. A turn with that receipt is saved, and its reply is saved as the text the person saw, so the Stop check
// asks nothing of Claude; and once a session shows it saves itself, the Enter reminder says there is nothing to do,
// so Claude does not keep a second copy by hand. Where no such hook runs, everything below works as before.
// 0.2.1 (11 Oct 2026, measured live): Claude Code writes an mcp_tool hook's reply to stdout, leaving content empty, and
// writes nothing at all for a hook that succeeds when the person presses Enter. So the receipt is read from stdout, and
// a session whose Stop hooks keep turns in MindToo counts this turn saved, unless a hook reported an error at Enter.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const mode = process.argv[2];
const done = () => process.exit(0);

function readStdin() {
  return new Promise((resolve) => {
    let s = ''; const t = setTimeout(() => resolve(s), 3000);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (d) => { s += d; });
    process.stdin.on('end', () => { clearTimeout(t); resolve(s); });
    process.stdin.on('error', () => { clearTimeout(t); resolve(s); });
  });
}

/** MindToo installed on this machine, with its hooks in Claude Code: this session is already captured directly. */
export function capturedDirectly(home = homedir()) {
  try {
    const launcher = ['mindtoo-hook.cmd', 'mindtoo-hook'].some((f) => existsSync(join(process.env.MINDTOO_HOME || join(home, '.mindtoo'), 'bin', f)));
    const settings = join(home, '.claude', 'settings.json');
    return launcher && existsSync(settings) && readFileSync(settings, 'utf8').includes('mindtoo-hook');
  } catch { return false; }
}

/** 0.2.0: MindToo's own receipt from a hook that saved the turn when the person pressed Enter. "already held" is saved too
 * (kept false, with MindToo's note); remembering turned off, a hook that failed, or another tool's receipt is not. */
export function autoSaved(a, event = 'UserPromptSubmit') {
  if (!a || (a.hookEvent || a.hookName) !== event || /error/i.test(String(a.type || ''))) return false;
  const s = typeof a.content === 'string' && a.content ? a.content : typeof a.stdout === 'string' ? a.stdout : JSON.stringify(a.content ?? '');
  return /"kept"\s*:\s*true/.test(s) || (/"kept"\s*:\s*false/.test(s) && /"note"\s*:\s*"Kept\./.test(s));
}
/** 0.2.1: a hook that failed when the person pressed Enter. */
const enterFailed = (a) => Boolean(a) && (a.hookEvent || a.hookName) === 'UserPromptSubmit' && /error/i.test(String(a.type || ''));
/** 0.2.0: does this session already save its turns by itself? True once any turn carries that receipt. */
export function autoRunning(transcriptText) {
  for (const line of String(transcriptText || '').split(/\r?\n/)) {
    if (!line.includes('"attachment"')) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e && e.type === 'attachment' && (autoSaved(e.attachment) || autoSaved(e.attachment, 'Stop'))) return true;
  }
  return false;
}

const TOOL = /mcp__[\w-]*mindtoo__mindtoo_log/;
const isLogCall = (name) => /(^|__)mindtoo_log$/.test(String(name || ''));
const isSendCall = (name) => /(^|__)SendUserMessage$/.test(String(name || ''));
const plain = (s) => String(s == null ? '' : s).replace(/\r\n/g, '\n').trim();

/** Did this turn save itself, did the saved reply reach the person, and does this session have MindToo at all? Read
 * from Claude's own transcript. The reply the person sees is the text after the turn's LAST tool call (or what a
 * SendUserMessage call carried); the reply saved is the `assistant` text of the turn's last mindtoo_log call. */
export function turnState(transcriptText) {
  const lines = String(transcriptText || '').split(/\r?\n/).filter(Boolean);
  const available = TOOL.test(transcriptText);
  let lastUser = -1; const entries = [];
  for (const line of lines) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    entries.push(e);
    if (e.type === 'user' && !e.isMeta && !e.isSidechain) {
      const c = e.message?.content;
      const human = typeof c === 'string' ? c.trim() !== '' : Array.isArray(c) && c.some((b) => b?.type === 'text') && !c.some((b) => b?.type === 'tool_result');
      if (human) lastUser = entries.length - 1;
    }
  }
  let saved = false, logged = '', auto = false, failedAtEnter = false;
  const running = entries.some((e) => e.type === 'attachment' && autoSaved(e.attachment, 'Stop'));
  const blocks = []; const sent = [];
  for (let i = lastUser + 1; i < entries.length; i++) {
    const e = entries[i];
    if (e.type === 'attachment') { if (autoSaved(e.attachment)) auto = true; else if (enterFailed(e.attachment)) failedAtEnter = true; continue; }
    if (e.type !== 'assistant' || e.isSidechain) continue;
    const c = e.message?.content;
    if (typeof c === 'string') { blocks.push({ text: c }); continue; }
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b?.type === 'tool_use') {
        blocks.push({ tool: true });
        if (isLogCall(b.name)) { saved = true; logged = String(b.input?.assistant ?? ''); }
        if (isSendCall(b.name)) sent.push(String(b.input?.message ?? ''));
      } else if (b?.type === 'text') blocks.push({ text: String(b.text ?? '') });
    }
  }
  let lastTool = -1; blocks.forEach((b, i) => { if (b.tool) lastTool = i; });
  const final = plain(blocks.slice(lastTool + 1).map((b) => b.text).join('\n'));
  const want = plain(logged);
  const delivered = !saved || !want || final.includes(want) || sent.some((m) => plain(m).includes(want));
  const kept = auto || (running && !failedAtEnter);
  return { available: available || saved || kept, saved: saved || kept, delivered, hasTurn: lastUser >= 0 };
}

const REMIND = 'MindToo keeps this conversation. Before you write your reply, call mindtoo_log (named like mcp__mindtoo__mindtoo_log; load it through tool search if it is not loaded) with user = the person\'s message above, word for word, assistant = the reply you are about to send, word for word (code blocks, tables and markdown included), and a short conversation name that stays the same all conversation. Then send that reply as your final message. Only the text you write after your last tool call reaches the person; text before a tool call does not. If MindToo\'s tools are not in this session, ignore this.';
const BLOCK = 'MindToo: this turn has not been saved. Call mindtoo_log now (load it through tool search if needed) with user = the person\'s last message, word for word, and assistant = your reply, word for word, and the same conversation name as before. Then write your reply again, in full, as your final message: text written before a tool call is not shown to the person.';
const AUTO = 'MindToo keeps this conversation. This session saves every turn to MindToo by itself, the moment the person presses Enter and the moment your reply ends, so there is nothing for you to do: do not call mindtoo_log for this turn.';
const DELIVER = 'MindToo: the reply you saved did not reach the person. Only the text you write after your last tool call is shown; text before a tool call is not. Write the reply you gave to mindtoo_log now, in full, word for word, as your final message.';

async function main() {
  if (capturedDirectly()) return done();
  let input = {}; try { input = JSON.parse(await readStdin() || '{}'); } catch { return done(); }
  if (mode === 'prompt') {
    let text = ''; try { text = input.transcript_path ? readFileSync(input.transcript_path, 'utf8') : ''; } catch { text = ''; }
    process.stdout.write(autoRunning(text) ? AUTO : REMIND); return done();
  }
  if (mode === 'stop') {
    if (input.stop_hook_active) return done();
    let text = ''; try { text = input.transcript_path ? readFileSync(input.transcript_path, 'utf8') : ''; } catch { return done(); }
    const st = turnState(text);
    if (st.hasTurn && st.available && !st.saved) process.stdout.write(JSON.stringify({ decision: 'block', reason: BLOCK }));
    else if (st.hasTurn && st.available && !st.delivered) process.stdout.write(JSON.stringify({ decision: 'block', reason: DELIVER }));
    return done();
  }
  return done();
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('mindtoo-turn.mjs')) main().catch(done);

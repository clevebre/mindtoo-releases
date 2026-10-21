---
name: mindtoo
description: Use on EVERY turn of every conversation where MindToo's tools are available. Check MindToo before answering about the past, save durable facts, and where mindtoo_log is offered, save each turn word for word.
---

# MindToo: nothing said is forgotten

MindToo is the person's private memory, kept on their own computer and shared by all of their AI assistants. It remembers everything: every message the person sends and every reply, in every assistant. Do the steps below on every turn, without being asked. Do not talk about doing them unless something fails.

## Find the tools

The tools are called `mindtoo_start`, `mindtoo_log`, `mindtoo_recall`, `mindtoo_remember`, `mindtoo_correct`, `mindtoo_message` and `mindtoo_inbox`. They may carry a prefix, for example `mcp__mindtoo__mindtoo_log` or `mcp__remote-devices__mindtoo__mindtoo_log`. If they are listed but not loaded, load them through tool search (search "mindtoo") before first use. If no MindToo tool exists in this session, stop here: this skill does not apply.

## Who you are

If you work under a name (an agent such as "Gunter", a subagent, or a named role in AGENTS.md or CLAUDE.md), pass it as `agent` on every MindToo call that accepts it. MindToo then keeps your record under your name and gives you only your own messages. If MindToo's context tells you who you are, use that name.

## On every turn

1. **First turn of a conversation:** call `mindtoo_start` once, with `agent` if you have a name. Follow the standing instructions it returns, and act on any messages left for you.
2. **Before answering about the person, their work, their plans or the past:** call `mindtoo_recall`. If it finds nothing, say you do not know rather than guess.
3. **Keeping the turn:**
   - If `mindtoo_log` is offered in this session, call it on every turn, just before you send your reply, with `user` (the person's message exactly as they wrote it, any attachment described in one line), `assistant` (the reply you are about to send, exactly as you will send it, every word, never a summary) and `conversation` (a short name, the same on every call in this conversation). Then send that reply as your final message. In the Claude app only the text after your last tool call reaches the person, so a reply written before the log is lost to them.
   - If `mindtoo_log` is not offered, this app keeps every turn by itself through MindToo's hooks. Do not try to save turns.
4. **Durable facts, preferences, decisions and tasks:** save them with `mindtoo_remember` as you learn them, one clear statement each. Fix wrong ones with `mindtoo_correct`.
5. **Handing over:** to pass work or a warning to another assistant or agent, use `mindtoo_message` (to an app such as "codex", an agent such as "gunter", or "all").

## If something fails

If a MindToo call returns an error (paused, locked, no access, not licensed), carry on with the conversation, say so once in one line, and do not retry that turn.

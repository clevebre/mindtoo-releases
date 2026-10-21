# MindToo for the Claude app

MindToo remembers everything: every message you send and every reply. The Claude app has no hooks of its own, so this plugin brings three pieces together:

- **The MindToo skill.** It tells Claude, on every turn, to save your message and its reply word for word in MindToo, and to check MindToo before answering about the past.
- **A reminder when you press Enter.** In Cowork and Code sessions, each message you send reminds Claude to save the turn.
- **No reply finishes unsaved.** In Cowork and Code sessions, if Claude finishes a reply without saving the turn, it is sent back once to save it.
- **The reply you see is the reply that was saved.** In those sessions only the text Claude writes after its last tool call is shown to you. So the plugin has Claude save the turn first and send the reply last, and if the reply it saved is not the one you were shown, Claude is sent back once to send it.

It needs MindToo connected to the Claude app (MindToo's Assistants screen, Claude Desktop, Connect). Where MindToo's own hooks already capture a session directly, such as Claude Code on a computer with MindToo installed, the plugin stays quiet so nothing is kept twice.

In ordinary Claude chats, where plugins do not run, add the MindToo skill to your Claude account instead: it does the same on every turn, without the enforcement.

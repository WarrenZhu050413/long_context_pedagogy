1. Make setup_workspace.py more modular by moving a lot of the hard-coded strings into their separate files.
2. Make study::init part of the SessionStart hook when starting a new workspace.
3. Have the stdin and stdout actually being captured and the responses being displayed in some kind of view.
4. Update the / endpoint to be able to point to the /events endpoint and the /teacher.html. Make teacher.html part of index.html.
5. Play around and test how the knowledge graph works. Interate on the prompt and how claude can use the knowledge graph. Start from Alan Turing's paper and then go deeper into some textbook (e.g. Computer Systems: A Programmer's Perspective, since we are all familiar with it)
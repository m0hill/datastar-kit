# Datastar philosophy in Datastar Kit

Datastar Kit follows Datastar's server-driven model: the server renders HTML, Datastar sends user intent and sparse signals, and the browser applies DOM/signal patches.

Keep the mental model simple:

- backend state is authoritative;
- browser signals are request input and UI affordance;
- server-rendered HTML is the patch payload;
- SSE is the primary realtime transport;
- client-side complexity should stay minimal.

"""The HTTP layer.

Route handlers here do three things and nothing else: read validated input, call
one service method, return a schema. There is no SQL, no scoring arithmetic and no
subprocess call anywhere in this package — if a handler grows past about fifteen
lines, the logic belongs in `app/services/`.

That rule is what makes the Signal Copilot possible without duplication: it calls
the same services these routes call, so the chat answer and the map marker can
never disagree.
"""

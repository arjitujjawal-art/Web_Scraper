"""Adapters to the outside world: the Bright Data CLI and the database.

Nothing in here makes a product decision. If a rule needs to be applied, it lives
in `app/domain/`; if a sequence of steps needs orchestrating, it lives in
`app/services/`. This layer only translates between our types and someone else's.
"""

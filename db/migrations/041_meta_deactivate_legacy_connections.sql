-- Deactivate Facebook page rows that are not in current env configuration.
-- Prevents retries against deleted Meta apps or legacy META_PAGE_ACCESS_TOKEN connections.

UPDATE meta_facebook_page
SET is_active = false, updated_at = now()
WHERE access_token_env_key = 'META_PAGE_ACCESS_TOKEN';

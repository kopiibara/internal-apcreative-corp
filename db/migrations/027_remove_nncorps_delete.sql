BEGIN;

DO $$
DECLARE
  target_brand_id INTEGER;
  fallback_brand_id INTEGER;
  ref_record RECORD;
BEGIN
  SELECT id
  INTO target_brand_id
  FROM brand
  WHERE slug = 'neon-nights-corp'
     OR lower(name) = lower('Neon Nights Corp')
  LIMIT 1;

  SELECT id
  INTO fallback_brand_id
  FROM brand
  WHERE slug = 'neon-nights'
     OR lower(name) = lower('Neon Nights')
  LIMIT 1;

  IF target_brand_id IS NULL THEN
    RAISE NOTICE 'Neon Nights Corp brand does not exist. Nothing to delete.';
    RETURN;
  END IF;

  IF fallback_brand_id IS NULL THEN
    RAISE EXCEPTION 'Cannot remove Neon Nights Corp because fallback brand Neon Nights does not exist.';
  END IF;

  IF target_brand_id = fallback_brand_id THEN
    RAISE NOTICE 'Target brand and fallback brand are the same. Nothing to delete.';
    RETURN;
  END IF;

  -- Handle possible duplicate brand access before reassigning.
  IF to_regclass('public.user_brand_access') IS NOT NULL THEN
    DELETE FROM user_brand_access uba
    WHERE uba.brand_id = target_brand_id
      AND EXISTS (
        SELECT 1
        FROM user_brand_access existing
        WHERE existing.profile_id = uba.profile_id
          AND existing.brand_id = fallback_brand_id
      );

    UPDATE user_brand_access
    SET brand_id = fallback_brand_id
    WHERE brand_id = target_brand_id;
  END IF;

  -- Handle possible duplicate invite brand access before reassigning.
  IF to_regclass('public.account_invite_brand_access') IS NOT NULL THEN
    DELETE FROM account_invite_brand_access aiba
    WHERE aiba.brand_id = target_brand_id
      AND EXISTS (
        SELECT 1
        FROM account_invite_brand_access existing
        WHERE existing.account_invite_id = aiba.account_invite_id
          AND existing.brand_id = fallback_brand_id
      );

    UPDATE account_invite_brand_access
    SET brand_id = fallback_brand_id
    WHERE brand_id = target_brand_id;
  END IF;

  -- Reassign remaining foreign key references from Neon Nights Corp to Neon Nights.
  FOR ref_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint fk
    JOIN pg_class c ON c.oid = fk.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN unnest(fk.conkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = cols.attnum
    WHERE fk.contype = 'f'
      AND fk.confrelid = 'public.brand'::regclass
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
      ref_record.schema_name,
      ref_record.table_name,
      ref_record.column_name,
      ref_record.column_name
    )
    USING fallback_brand_id, target_brand_id;
  END LOOP;

  -- Now hard delete the brand row.
  DELETE FROM brand
  WHERE id = target_brand_id;

  RAISE NOTICE 'Neon Nights Corp brand was reassigned to Neon Nights and removed from brand table.';
END $$;

COMMIT;
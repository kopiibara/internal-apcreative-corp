/**
 * Register a Facebook Page for monitoring.
 *
 * Usage:
 *   npx tsx scripts/meta-register-page.ts <facebook_page_id> "<page name>" [brand_id] [access_token_env_key]
 */
import "dotenv/config"

import { pool } from "@/lib/db"

async function main() {
  const facebookPageId = process.argv[2]
  const pageName = process.argv[3]
  const brandId = process.argv[4] ? Number(process.argv[4]) : null
  const accessTokenEnvKey = process.argv[5] ?? null

  if (!facebookPageId || !pageName) {
    console.error(
      "Usage: npx tsx scripts/meta-register-page.ts <facebook_page_id> \"<page name>\" [brand_id] [access_token_env_key]"
    )
    process.exit(1)
  }

  await pool.query(
    `
    INSERT INTO meta_facebook_page (
      facebook_page_id,
      page_name,
      brand_id,
      access_token_env_key,
      webhook_subscribed_fields
    )
    VALUES ($1, $2, $3, $4, ARRAY['feed']::TEXT[])
    ON CONFLICT (facebook_page_id)
    DO UPDATE SET
      page_name = EXCLUDED.page_name,
      brand_id = EXCLUDED.brand_id,
      access_token_env_key = EXCLUDED.access_token_env_key,
      is_active = true,
      updated_at = now()
    `,
    [facebookPageId, pageName, brandId, accessTokenEnvKey]
  )

  console.log(`Registered Facebook Page ${facebookPageId} (${pageName}).`)
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})

/**
 * Test Meta webhook GET verification and signed POST locally or on production.
 *
 * Usage:
 *   npx tsx scripts/meta-test-webhook.ts
 *   npx tsx scripts/meta-test-webhook.ts --url https://internal.apcreativecorp.com
 *   npx tsx scripts/meta-test-webhook.ts --url http://localhost:3000 --post-only
 *   npx tsx scripts/meta-test-webhook.ts --verify-only
 */
import "dotenv/config"

import { createHmac } from "node:crypto"

const args = process.argv.slice(2)
const urlFlagIndex = args.indexOf("--url")
const baseUrl =
  urlFlagIndex >= 0 ? args[urlFlagIndex + 1] : process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
const postOnly = args.includes("--post-only")
const verifyOnly = args.includes("--verify-only")

const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN
const appSecret = process.env.META_APP_SECRET

const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/meta/webhook`

async function testGetVerification() {
  if (!verifyToken) {
    console.error("Missing META_WEBHOOK_VERIFY_TOKEN in .env")
    return false
  }

  const params = new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": verifyToken,
    "hub.challenge": "meta_test_challenge_12345",
  })

  const response = await fetch(`${webhookUrl}?${params.toString()}`)
  const body = await response.text()

  console.log("\n--- GET verification ---")
  console.log("URL:", `${webhookUrl}?${params.toString()}`)
  console.log("Status:", response.status)
  console.log("Body:", body)

  if (response.status === 200 && body === "meta_test_challenge_12345") {
    console.log("PASS: Meta-style verification challenge echoed correctly.")
    return true
  }

  console.log("FAIL: Expected status 200 and challenge echoed as plain text.")
  return false
}

async function testSignedPost() {
  if (!appSecret) {
    console.log("\n--- POST signed payload ---")
    console.log("SKIP: META_APP_SECRET is not set in .env.")
    console.log(
      "Add META_APP_SECRET from Meta App → Settings → Basic → App secret to test POST locally."
    )
    console.log(
      "Production POST still works if Vercel has META_APP_SECRET configured."
    )
    return null
  }

  const payload = {
    object: "page",
    entry: [
      {
        id: "000000000000000",
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "feed",
            value: {
              item: "comment",
              verb: "add",
              post_id: "000000000000000_111",
              comment_id: "999999999999999",
              from: { id: "123", name: "Test User" },
              message: "Webhook test comment from meta-test-webhook.ts",
            },
          },
        ],
      },
    ],
  }

  const rawBody = JSON.stringify(payload)
  const signature =
    "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex")

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": signature,
    },
    body: rawBody,
  })

  const body = await response.text()

  console.log("\n--- POST signed payload ---")
  console.log("URL:", webhookUrl)
  console.log("Status:", response.status)
  console.log("Body:", body)

  if (response.status === 200) {
    console.log("PASS: Webhook accepted signed payload.")
    console.log(
      "Next: open Admin → Platform Analytics → Activity Logs, or run npm run meta:verify-schema"
    )
    return true
  }

  if (response.status === 403) {
    console.log("FAIL: Invalid signature — check META_APP_SECRET matches Meta App Secret.")
  } else if (response.status === 404) {
    console.log("FAIL: Route not found — deploy latest code or start dev server (npm run dev).")
  }

  return false
}

async function main() {
  console.log("Meta webhook test")
  console.log("Base URL:", baseUrl)

  let verifyOk = true
  let postOk: boolean | null = null

  if (!postOnly) {
    verifyOk = await testGetVerification()
  }

  if (!verifyOnly) {
    postOk = await testSignedPost()
  }

  const failed =
    !verifyOk || (postOk !== null && postOk === false)

  if (failed) {
    process.exitCode = 1
    return
  }

  process.exitCode = 0
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

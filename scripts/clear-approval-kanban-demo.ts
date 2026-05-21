import "dotenv/config";

import { pool, transaction } from "@/lib/db";
import { APPROVAL_KANBAN_DEMO_MARKER } from "@/lib/approval-kanban";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to clear Kanban demo approvals in production.");
  }

  const deletedCount = await transaction(async (client) => {
    const result = await client.query<{ id: number }>(
      `
      DELETE FROM content_report
      WHERE employee_comments LIKE $1::text
         OR caption LIKE $1::text
         OR content_inspo LIKE $1::text
      RETURNING id
      `,
      [`%${APPROVAL_KANBAN_DEMO_MARKER}%`],
    );

    return result.rowCount ?? 0;
  });

  console.log(`Removed ${deletedCount} Approval Kanban demo record(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to clear Approval Kanban demo records:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

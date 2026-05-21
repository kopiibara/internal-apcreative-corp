import { TaskBoard } from "@/components/to-do/task-board"
import { loadAdminTaskBoardPage } from "@/lib/task-board-page"

export default async function AdminToDoTasksPage() {
  const pageData = await loadAdminTaskBoardPage()

  return <TaskBoard {...pageData} />
}

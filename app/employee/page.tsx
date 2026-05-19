import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const stats = [
    {
        title: "Assigned Brand",
        value: "Neon Nights",
        description: "Primary assigned workspace",
    },
    {
        title: "Approvals",
        value: "4",
        description: "Reports this week",
    },
    {
        title: "Pending Approvals",
        value: "2",
        description: "Waiting for manager review",
    },
    {
        title: "Ad Performance",
        value: "Live",
        description: "Mock analytics enabled",
    },
]

export default function EmployeeDashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">
                    My Brand Dashboard
                </h2>
                <p className="text-slate-500">
                    View your assigned brand reports, approvals, and analytics.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">
                                {stat.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-slate-500">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Today’s Workspace</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-500">
                    This area will show assigned tasks, recent reports, and approval status.
                </CardContent>
            </Card>
        </div>
    )
}
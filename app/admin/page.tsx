import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const stats = [
    {
        title: "Total Brands",
        value: "8",
        description: "Active brands monitored",
    },
    {
        title: "Pending Approvals",
        value: "7",
        description: "Waiting for manager review",
    },
    {
        title: "Monthly Ad Spend",
        value: "₱248,500",
        description: "Across all platforms",
    },
    {
        title: "Total Leads",
        value: "1,284",
        description: "This month",
    },
]

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">
                    Executive Dashboard
                </h2>
                <p className="text-muted-foreground">
                    Overview of all brands, employees, reports, and platform performance.
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

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Brand Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-500">
                        This section will show performance across all brands.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Approval Queue</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-500">
                        This section will show reports waiting for approval.
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
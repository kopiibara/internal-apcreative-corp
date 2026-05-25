"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/auth/auth-client"
import { getSignInErrorMessage } from "@/lib/auth/auth-sign-in-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function LoginForm() {
    const router = useRouter()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isLoading) {
            return
        }

        setIsLoading(true)

        try {
            const { error } = await authClient.signIn.email({
                email,
                password,
            })

            if (error) {
                toast.error(getSignInErrorMessage(error))
                return
            }

            toast.success("Signed in successfully.")
            router.push("/")
            router.refresh()
        } catch {
            toast.error("Unable to sign in. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="relative z-10 w-full max-w-md border-2 border-border shadow-[var(--shadow-hard)]">
            <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-xl tracking-tight">
                    AP Creative Dashboard
                </CardTitle>
                <CardDescription>
                    Sign in to access your internal dashboard.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
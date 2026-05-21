import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(242,20,36,0.07),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(32,156,187,0.1),transparent_28%)]"
      />
      <LoginForm />
    </main>
  )
}
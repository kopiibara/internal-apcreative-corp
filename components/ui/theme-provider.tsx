"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeProviderValue = {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeProviderValue | null>(null)

export function ThemeProvider({
    children,
}: {
    children: React.ReactNode
}) {
    React.useEffect(() => {
        document.documentElement.classList.remove("dark")
    }, [])

    const setTheme = React.useCallback((nextTheme: Theme) => {
        void nextTheme
        document.documentElement.classList.remove("dark")
    }, [])

    const value = React.useMemo<ThemeProviderValue>(
        () => ({
            theme: "light",
            resolvedTheme: "light",
            setTheme,
        }),
        [setTheme]
    )

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = React.useContext(ThemeContext)

    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider.")
    }

    return context
}

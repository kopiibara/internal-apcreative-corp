"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeProviderValue = {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = "apcreative-theme"
const THEME_CHANGE_EVENT = "apcreative-theme-change"
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)"
const SERVER_THEME_SNAPSHOT = "system:light"

const ThemeContext = React.createContext<ThemeProviderValue | null>(null)

function isTheme(value: string | null): value is Theme {
    return value === "light" || value === "dark" || value === "system"
}

function getStoredTheme() {
    try {
        const theme = window.localStorage.getItem(THEME_STORAGE_KEY)

        return isTheme(theme) ? theme : "system"
    } catch {
        return "system"
    }
}

function getSystemTheme(): ResolvedTheme {
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light"
}

function getThemeSnapshot() {
    const theme = getStoredTheme()
    const systemTheme = getSystemTheme()

    return `${theme}:${systemTheme}`
}

function getServerThemeSnapshot() {
    return SERVER_THEME_SNAPSHOT
}

function subscribeToTheme(callback: () => void) {
    const mediaQueryList = window.matchMedia(SYSTEM_THEME_QUERY)

    window.addEventListener("storage", callback)
    window.addEventListener(THEME_CHANGE_EVENT, callback)
    mediaQueryList.addEventListener("change", callback)

    return () => {
        window.removeEventListener("storage", callback)
        window.removeEventListener(THEME_CHANGE_EVENT, callback)
        mediaQueryList.removeEventListener("change", callback)
    }
}

export function ThemeProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const snapshot = React.useSyncExternalStore(
        subscribeToTheme,
        getThemeSnapshot,
        getServerThemeSnapshot
    )
    const [themeSnapshot, systemThemeSnapshot] = snapshot.split(":") as [
        Theme,
        ResolvedTheme,
    ]
    const resolvedTheme =
        themeSnapshot === "system" ? systemThemeSnapshot : themeSnapshot

    React.useEffect(() => {
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    }, [resolvedTheme])

    const setTheme = React.useCallback((nextTheme: Theme) => {
        try {
            if (nextTheme === "system") {
                window.localStorage.removeItem(THEME_STORAGE_KEY)
            } else {
                window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
            }
        } finally {
            window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
        }
    }, [])

    const value = React.useMemo<ThemeProviderValue>(
        () => ({
            theme: themeSnapshot,
            resolvedTheme,
            setTheme,
        }),
        [resolvedTheme, setTheme, themeSnapshot]
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

# Neobrutalism Design System

## Overview

This design system implements a bold, high-contrast neobrutalism aesthetic using Tailwind CSS, shadcn/ui components, and custom global CSS.

## Tech Stack

- **Framework**: Tailwind CSS 3.4.1
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Styling Approach**: Hybrid (Tailwind utilities + global CSS + component library)
- **Animation**: Framer Motion, GSAP, custom CSS animations

---

## Color Palette

### Brand Colors (CSS Variables)

```css
--blue: #1d2d89 --blue-2: #26408b --cyan: #209cbb --red: #f21424
  --magenta: #a72a6f --cream: #f8f3e8 --paper: #f5f4f1 --white: #ffffff
  --ink: #111111 --muted: #5f6470;
```

### HSL Color System (Light Mode)

```css
--background: 30 8% 95% --foreground: 20 14.3% 4.1% --card: 0 0% 98%
  --card-foreground: 20 14.3% 4.1% --primary: 24 9.8% 10%
  --primary-foreground: 60 9.1% 97.8% --secondary: 60 4.8% 95.9%
  --secondary-foreground: 24 9.8% 10% --accent: 60 4.8% 95.9%
  --accent-foreground: 24 9.8% 10% --border: 20 5.9% 90% --input: 20 5.9% 90%
  --ring: 20 14.3% 4.1%;
```

### Background System

```css
--bg-base: 30 8% 95% --bg-surface: 0 0% 98% --bg-subtle: 30 8% 96%
  --bg-footer: 226 63% 32% --bg-brand-teal: 189 53% 49% --bg-brand-navy: 226 63%
  32%;
```

### Line & Shadow Colors

```css
--line: rgba(17, 17, 17, 0.13) --soft-line: rgba(29, 45, 137, 0.13)
  --shadow-hard: 7px 7px 0 #111111 --shadow-soft: 0 24px 70px
  rgba(29, 45, 137, 0.12);
```

---

## Typography

### Font Families

```css
--font-cinzel: Display font (headings) --font-tenorsans: Display font
  alternative --font-display: Primary display font --font-body: Arial
  (body text);
```

### Tailwind Font Classes

```css
font-cinzel      // Cinzel font family
font-tenorsans   // Tenor Sans font family
font-display     // Primary display font
font-body        // Arial for body text
```

### Heading Hierarchy

```css
h1,
h2,
h3,
h4,
h5,
h6 {
  @apply font-display;
}
```

---

## Neobrutalism Styling

### Hard Shadows (Signature Element)

```css
/* Tailwind config */
boxShadow: {
  hard: "7px 7px 0 #111111",
  "hard-sm": "4px 4px 0 #111111",
  soft: "0 24px 70px rgba(29, 45, 137, 0.12)"
}

/* Usage */
shadow-hard      // 7px 7px 0 #111111
shadow-hard-sm   // 4px 4px 0 #111111
shadow-soft      // Soft blue shadow
```

### Border Radius

```css
/* Tailwind config */
borderRadius: {
  lg: "var(--radius)",           // 0.5rem
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
  xl: "30px",                    // Large rounded corners
  pill: "999px"                 // Fully rounded
}

/* CSS variables */
--radius: 0.5rem
--radius-xl: 30px
--radius-lg: 20px
```

### Borders

```css
/* Global border style */
* {
  @apply border-border;
}

/* Border color from HSL system */
--border: 20 5.9% 90%;
```

---

## Background Patterns

### Dot Pattern Overlay

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  opacity: 0.035;
  background-image: radial-gradient(#000 1px, transparent 1px);
  background-size: 6px 6px;
  mix-blend-mode: multiply;
}
```

### Gradient Background

```css
body {
  background:
    radial-gradient(circle at 8% 10%, rgba(242, 20, 36, 0.08), transparent 26%),
    radial-gradient(
      circle at 92% 6%,
      rgba(32, 156, 187, 0.12),
      transparent 26%
    ),
    linear-gradient(180deg, #ffffff 0%, #f8f3e8 38%, #ffffff 100%);
}
```

### Hero Gradient Text

```css
.hero-gradient-word {
  display: inline-block;
  background: linear-gradient(
    110deg,
    #1d2d89 0%,
    #14327d 28%,
    #209cbb 48%,
    #a72a6f 70%,
    #f21424 100%
  );
  background-size: 220% 220%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-stroke: 2px rgba(17, 17, 17, 0.18);
  paint-order: stroke fill;
  animation: ap-neo-gradient 6s ease-in-out infinite;
}
```

---

## Animations

### Marquee Animations

```css
/* Fluid band scroll */
@keyframes ap-fluid-band-scroll {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-50%, 0, 0);
  }
}

.ap-fluid-band-track {
  animation: ap-fluid-band-scroll 18s linear infinite;
}

/* Partner marquee */
@keyframes ap-partner-marquee-left {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-100%, 0, 0);
  }
}

.ap-partner-marquee-track {
  animation: ap-partner-marquee-left 28s linear infinite;
}
```

### Logo Animations

```css
/* Orbit spin */
@keyframes ap-logo-orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

.ap-logo-orbit-text {
  animation: ap-logo-orbit-spin 16s linear infinite;
  transform-origin: center;
}

/* Orbit float */
@keyframes ap-logo-orbit-float {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }
  50% {
    transform: translateY(-16px) rotate(1deg);
  }
}

.ap-logo-orbit {
  animation: ap-logo-orbit-float 5s ease-in-out infinite;
}
```

### Hero Reveal

```css
.ap-hero-reveal {
  opacity: 0;
  transform: translate3d(0, 1.25rem, 0);
  transition:
    opacity 0.42s ease-out,
    transform 0.42s ease-out;
}

[data-visible="true"] > .ap-hero-reveal {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
```

### Loader Animations

```css
/* Half letters animation */
@keyframes ap-loader-half-a {
  0% {
    opacity: 1;
    transform: translate3d(-3rem, 0, 0);
  }
  42% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  72% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(-3rem, 0, 0);
  }
}

.ap-loader-half-a {
  animation: ap-loader-half-a 1.35s cubic-bezier(0.16, 1, 0.3, 1) infinite both;
}
```

---

## Component Patterns

### Button Style (Neobrutalism)

```jsx
<button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg border-2 border-border shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
  Button Text
</button>
```

### Card Style

```jsx
<div className="bg-card border-2 border-border rounded-xl shadow-hard p-6">
  <h3 className="font-display text-xl mb-2">Card Title</h3>
  <p className="font-body text-muted-foreground">Card content</p>
</div>
```

### Section Backgrounds

```jsx
// Light brand background
<section className="bg-brand-light">

// Surface background
<section className="bg-brand-surface">

// Subtle background
<section className="bg-[hsl(var(--bg-subtle))]">

// Footer background
<section className="bg-brand-footer">
```

---

## Tailwind Configuration

### Custom Colors

```typescript
colors: {
  darktext: "#191919",
  lighttext: "#fcfcfc",
  blue: "#1d2d89",
  "blue-2": "#26408b",
  cyan: "#209cbb",
  red: "#f21424",
  magenta: "#a72a6f",
  cream: "#f8f3e8",
  paper: "#f5f4f1",
  ink: "#111111",
  // ... HSL color system
}
```

### Custom Animations

```typescript
animation: {
  scroll: "scroll var(--animation-duration) linear infinite",
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
}
```

### Plugins

```typescript
plugins: [require("tailwindcss-animate")];
```

---

## Accessibility

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .ap-hero-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  /* Slower animations */
  .ap-partner-marquee-track {
    animation-duration: 56s;
  }
}
```

---

## File Structure

```
src/
├── app/
│   └── globals.css          # Global styles, CSS variables, animations
├── components/
│   └── ui/                  # shadcn/ui components
├── lib/
│   └── utils.ts             # cn() utility for class merging
tailwind.config.ts           # Tailwind configuration
components.json              # shadcn/ui configuration
```

---

## Usage Guidelines

### 1. Always use hard shadows for primary elements

```jsx
className = "shadow-hard";
```

### 2. Use brand colors for accents and highlights

```jsx
className = "text-blue bg-cream";
```

### 3. Apply dot pattern overlay globally (already in globals.css)

### 4. Use display fonts for headings, body font for text

```jsx
<h1 className="font-display">Heading</h1>
<p className="font-body">Body text</p>
```

### 5. Use border-2 for strong neobrutalism borders

```jsx
className = "border-2 border-border";
```

### 6. Apply hover effects with shadow offset

```jsx
className =
  "hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all";
```

---

## Design Tokens Summary

| Category      | Token      | Value                               |
| ------------- | ---------- | ----------------------------------- |
| Shadow        | Hard       | 7px 7px 0 #111111                   |
| Shadow        | Hard Small | 4px 4px 0 #111111                   |
| Shadow        | Soft       | 0 24px 70px rgba(29, 45, 137, 0.12) |
| Border Radius | XL         | 30px                                |
| Border Radius | LG         | 20px                                |
| Border Radius | Base       | 0.5rem                              |
| Dot Pattern   | Size       | 6px 6px                             |
| Dot Pattern   | Opacity    | 0.035                               |

---

## Dependencies

```json
{
  "tailwindcss": "^3.4.1",
  "tailwindcss-animate": "^1.0.7",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.5",
  "@radix-ui/react-*": "various"
}
```

---

## Implementation Notes

1. **CSS Variables**: All colors are defined as CSS variables for easy theming
2. **Dark Mode**: Configured but not extensively used in current design
3. **Component Library**: shadcn/ui provides accessible base components styled with Tailwind
4. **Custom Styles**: Neobrutalism-specific styles are in globals.css
5. **Performance**: Uses `will-change` and `transform` for smooth animations
6. **Responsive**: Mobile breakpoints defined in Tailwind config

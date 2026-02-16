# OpenClaw Chat — Design System

> A comprehensive reference for developers building on top of the OpenClaw chat UI.  
> Stack: **React 18 · TypeScript · Tailwind CSS · shadcn/ui · Lucide Icons · react-markdown**

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Color Tokens](#color-tokens)
3. [Typography](#typography)
4. [Layout & Spacing](#layout--spacing)
5. [Components](#components)
6. [Animations & Keyframes](#animations--keyframes)
7. [Utility Classes](#utility-classes)
8. [Theming](#theming)
9. [Accessibility](#accessibility)
10. [File Map](#file-map)

---

## Philosophy

- **Warm noir** aesthetic — near-black canvas with warm off-white text and blue (`hsl(215 90% 60%)`) as the sole accent color.
- Minimal chrome, maximum content density.
- Right-aligned user bubbles (iMessage-style), left-aligned assistant messages.
- Subtle color accents (`primary/10`, `primary/15`) over backgrounds — never heavy fills.
- Font pairing: **Inter** (UI) + **IBM Plex Mono** (code, timestamps, model pills).

---

## Color Tokens

All colors are defined as HSL channel values in `src/index.css` under `:root` (dark) and `.light-theme`.

### Core Palette

| Token                  | Dark Value           | Light Value          | Usage                          |
|------------------------|----------------------|----------------------|--------------------------------|
| `--background`         | `0 0% 4%`           | `0 0% 98%`          | Page canvas                    |
| `--foreground`         | `40 20% 88%`        | `0 0% 12%`          | Primary text                   |
| `--card`               | `0 0% 7%`           | `0 0% 100%`         | Elevated surfaces, cards       |
| `--primary`            | `215 90% 60%`       | `215 90% 50%`       | Accent color, CTAs, links      |
| `--primary-foreground` | `0 0% 4%`           | `0 0% 100%`         | Text on primary backgrounds    |
| `--secondary`          | `0 0% 10%`          | `0 0% 94%`          | Subtle backgrounds, hover      |
| `--muted`              | `0 0% 10%`          | `0 0% 94%`          | Disabled / muted surfaces      |
| `--muted-foreground`   | `0 0% 40%`          | `0 0% 50%`          | Secondary text, icons          |
| `--destructive`        | `0 72% 51%`         | `0 72% 51%`         | Errors, failed states          |
| `--border`             | `0 0% 12%`          | `0 0% 88%`          | Dividers, input borders        |
| `--input`              | `0 0% 8%`           | `0 0% 94%`          | Input field backgrounds        |
| `--ring`               | `215 90% 60%`       | `215 90% 50%`       | Focus rings                    |

### Chat-Specific Tokens

| Token                | Dark Value           | Light Value          | Usage                          |
|----------------------|----------------------|----------------------|--------------------------------|
| `--surface`          | `0 0% 7%`           | `0 0% 96%`          | Composer background            |
| `--surface-elevated` | `0 0% 10%`          | `0 0% 92%`          | Skeleton shimmer highlight     |
| `--chat-divider`     | `0 0% 14%`          | `0 0% 88%`          | Horizontal rules between days  |
| `--timestamp`        | `0 0% 32%`          | `0 0% 55%`          | Timestamp text color           |
| `--code-bg`          | `215 20% 14%`       | `215 30% 94%`       | Inline/block code background   |
| `--code-fg`          | `215 70% 72%`       | `215 70% 40%`       | Code text color                |
| `--status-online`    | `142 60% 50%`       | `142 60% 40%`       | Online indicator glow          |

### Sidebar Tokens

| Token                          | Usage                  |
|--------------------------------|------------------------|
| `--sidebar-background`         | Sidebar canvas         |
| `--sidebar-foreground`         | Sidebar text           |
| `--sidebar-primary`            | Active item accent     |
| `--sidebar-primary-foreground` | Active item text       |
| `--sidebar-accent`             | Hover/focus background |
| `--sidebar-accent-foreground`  | Hover/focus text       |
| `--sidebar-border`             | Sidebar dividers       |
| `--sidebar-ring`               | Focus ring             |

### Using Tokens in Code

```tsx
// ✅ Correct — use Tailwind semantic classes
<div className="bg-background text-foreground border-border" />
<div className="bg-primary text-primary-foreground" />
<div className="text-muted-foreground" />

// ✅ Correct — opacity modifiers via Tailwind
<div className="bg-primary/10 text-primary/70" />

// ✅ Correct — raw HSL in inline styles or CSS utilities
<span style={{ color: "hsl(var(--timestamp))" }} />

// ❌ Wrong — hardcoded colors
<div className="bg-gray-900 text-white" />
<div style={{ color: "#3b82f6" }} />
```

---

## Typography

### Font Stack

| Role      | Font Family                               | Tailwind Class |
|-----------|-------------------------------------------|----------------|
| UI / Body | `Inter, -apple-system, system-ui, sans`   | `font-sans`    |
| Code      | `IBM Plex Mono, ui-monospace, monospace`   | `font-mono`    |

Loaded via Google Fonts import in `index.css`.

### Type Scale (used in components)

| Element              | Size     | Weight     | Extra                             |
|----------------------|----------|------------|-----------------------------------|
| Header title         | `14px`   | `bold`     | `tracking-tight`                  |
| Sender label         | `13px`   | `semibold` | `tracking-tight`                  |
| Body text (prose)    | `14px`   | `400`      | `line-height: 1.75`              |
| Timestamp            | `10-11px`| `400`      | `font-mono`, `--timestamp` color  |
| Code inline          | `12px`   | `400`      | `font-mono`, `--code-bg/fg`       |
| Model pill           | `11px`   | `500`      | `font-mono`                       |
| Kbd hint             | `9px`    | `400`      | `font-mono`, bordered             |
| Metadata key/value   | `11px`   | `400`      | `font-mono`                       |

### Global Settings

```css
body {
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}
```

---

## Layout & Spacing

### App Shell

```
┌─────────────────────────────────────┐
│  Header (glass-header, sticky)      │  h: ~52px, border-b
├─────────────────────────────────────┤
│                                     │
│  Messages (scrollable)              │  px-5, py-6
│  max-w-xl, centered                 │  gap-4 between messages
│                                     │
├─────────────────────────────────────┤
│  Composer (composer-surface)        │  border-t, px-5, pb-safe-area
└─────────────────────────────────────┘
```

- **Max width**: `max-w-xl` (576px) — the entire chat is constrained.
- **Message gap**: `gap-4` (16px) between bubbles.
- **Horizontal padding**: `px-5` (20px) throughout.
- **Assistant indent**: `pl-7` (28px) for body text below the avatar row.

### Message Anatomy

**Assistant message:**
```
[Avatar 20px] [Name 13px] [Timestamp 11px]
    └─ pl-7 ─ Markdown body (14px, 1.75lh)
              [Metadata chip]
              [Action bar: copy | retry | reactions]
```

**User message (right-aligned):**
```
                        [Timestamp 10px] [Delivery ticks]
                        ┌─────────────────────┐
                        │  user-msg-bubble     │  max-w-[85%]
                        │  Markdown body       │  bg: primary/12
                        └─────────────────────┘  radius: 12 12 4 12
                        [Action bar: copy | reactions]
```

---

## Components

### `ChatBubble` — `src/components/chat/ChatBubble.tsx`

The core message renderer.

**Props:**

| Prop             | Type                                  | Description                              |
|------------------|---------------------------------------|------------------------------------------|
| `message`        | `ChatMessage`                         | The message object                       |
| `index`          | `number`                              | Position in list (for stagger animation) |
| `onRetry`        | `(id: string) => void`               | Retry failed/assistant messages          |
| `onQuote`        | `(message: ChatMessage) => void`     | Swipe-to-quote callback                  |
| `onReact`        | `(id: string, emoji: string) => void`| Reaction callback                        |
| `isLast`         | `boolean`                             | Whether last in list                     |
| `isContinuation` | `boolean`                             | Same sender as previous (hide header)    |
| `showTimestamp`   | `boolean`                            | Show/hide timestamp (5-min threshold)    |

**`ChatMessage` interface:**

```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: string;              // e.g. "10:08 PM"
  metadata?: Record<string, string>;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  reactions?: Record<string, number>;  // { "👍": 2, "🔥": 1 }
}
```

**Key behaviors:**
- Auto-linkifies bare URLs into markdown links.
- Renders markdown via `react-markdown` with custom link target.
- Swipe-right-to-quote on touch devices (50px threshold).
- Staggered entry animation: `animationDelay: index * 40ms`.

---

### `ChatComposer` — `src/components/chat/ChatComposer.tsx`

Multi-line input with model selector, attachments, and quote preview.

**Props:**

| Prop             | Type                              | Description                 |
|------------------|-----------------------------------|-----------------------------|
| `onSend`         | `(message: string) => void`      | Send callback               |
| `quotedMessage`  | `ChatMessage \| null`            | Quoted message preview      |
| `onClearQuote`   | `() => void`                     | Clear quote                 |
| `activeModel`    | `string`                         | Current model ID            |
| `onModelChange`  | `(model: string) => void`        | Model selector callback     |

**Key behaviors:**
- Auto-resizing textarea (max 120px collapsed, 240px expanded).
- `Enter` sends, `Shift+Enter` for newline.
- Model pills: `pill-active` / `pill-inactive` utility classes.
- Send button: `bg-primary`, `disabled:opacity-15`.
- Haptic feedback on send (`navigator.vibrate(10)`).

---

### `ChatScreen` — `src/components/chat/ChatScreen.tsx`

Top-level layout orchestrator.

**Features:**
- Glass header with `backdrop-filter: blur(20px) saturate(1.2)`.
- Scroll-to-bottom FAB with unread count badge.
- Theme toggle (dark ↔ light via `.light-theme` class on `<html>`).
- `⌘K` search overlay.
- Typing indicator with rotating phrases.
- Timestamp grouping: show only when ≥5 minutes apart.
- Continuation detection: hide header when same sender.

---

### `ChatSkeleton` — `src/components/chat/ChatSkeleton.tsx`

Loading state with shimmer animation.

```tsx
<ChatSkeleton />  // 4 skeleton messages with shimmer
```

Uses `skeleton-line` utility class (gradient background with `shimmer` animation).

---

### `MessageSearch` — `src/components/chat/MessageSearch.tsx`

Full-screen search overlay.

- Triggered by `⌘K` or search button.
- Filters messages client-side, highlights matches with `<mark>`.
- Jump-to-message scrolls and flashes the target (`msg-highlight` animation).

---

### `MetadataChip` — `src/components/chat/MetadataChip.tsx`

Expandable key-value metadata display.

```tsx
<MetadataChip label="metadata" data={{ conversation_label: "iPhone" }} />
```

- Collapsed: monospace label with chevron.
- Expanded: bordered card with key=value pairs in primary color.

---

### `EmojiReactions` — `src/components/chat/EmojiReactions.tsx`

Inline emoji reaction bar.

- Preset reactions: 👍 ❤️ 😂 🔥 👀
- Existing reactions shown as bordered pills with counts.
- Picker appears with `animate-scale-in` animation.

---

## Animations & Keyframes

### Tailwind Animations (in `tailwind.config.ts`)

| Class               | Keyframe       | Duration | Easing   |
|----------------------|----------------|----------|----------|
| `animate-message-in` | `message-in`  | 0.2s     | ease-out |
| `animate-fade-in`    | `fade-in`     | 0.3s     | ease-out |
| `animate-slide-up`   | `slide-up`    | 0.2s     | ease-out |
| `animate-accordion-*`| `accordion-*` | 0.2s     | ease-out |

### CSS Animations (in `index.css`)

| Class / Keyframe      | Description                                      |
|-----------------------|--------------------------------------------------|
| `typing-pulse`        | Dots fade 0.2→1→0.2 opacity, 1.4s, staggered    |
| `send-pulse`          | Scale 1→0.96→1, 0.2s (composer bounce)           |
| `shimmer`             | Gradient slide -200%→200%, 1.5s infinite          |
| `msg-flash`           | Background flash `primary/12`, 1.5s (search jump) |
| `scale-in-anim`       | Scale 0.9→1 + opacity 0→1, 0.15s (emoji picker)  |

### Stagger Pattern

Messages use `animationDelay: index * 40ms` for cascading entry.

---

## Utility Classes

Defined in `src/index.css` under `@layer utilities`.

### Surfaces

| Class              | Description                                        |
|--------------------|----------------------------------------------------|
| `glass-header`     | Translucent header: `bg/92%` + blur(20px)          |
| `composer-surface` | Composer tray: `var(--surface)`                    |
| `composer-field`   | Input area: `var(--background)` + border           |

### Chat Elements

| Class              | Description                                        |
|--------------------|----------------------------------------------------|
| `chat-rule`        | 1px horizontal divider: `var(--chat-divider)`      |
| `user-msg-bubble`  | User bubble: `primary/12`, asymmetric radius       |
| `chat-prose`       | Markdown body: 14px, 1.75lh, styled lists/code/links |
| `chat-prose-user`  | User variant: full foreground brightness           |
| `quote-bar`        | 2px blue vertical bar for quoted messages          |
| `skeleton-line`    | Shimmer loading bar                                |
| `msg-highlight`    | Flash animation for search-jump target             |

### Interactive

| Class              | Description                                        |
|--------------------|----------------------------------------------------|
| `pill-active`      | Selected model pill: `bg-primary text-primary-fg`  |
| `pill-inactive`    | Unselected pill: bordered, muted text              |
| `glow-dot`         | Online indicator: green with box-shadow glow       |
| `kbd-hint`         | Keyboard shortcut badge: mono, bordered            |
| `action-bar`       | Message actions: hidden by default, visible on hover |
| `send-pulse`       | Composer bounce on send                            |
| `animate-scale-in` | Scale-in for emoji picker                          |

### Status Indicators

| Class       | Description                            |
|-------------|----------------------------------------|
| `tick`       | Delivery tick: muted foreground, 10px  |
| `tick-read`  | Read tick: primary color               |
| `msg-failed` | Failed state: destructive color        |

### Scrollbar

`message-scroll` — 3px thin scrollbar, transparent track, 8% foreground thumb.

### Mobile Overrides

```css
@media (hover: none) {
  .action-bar { opacity: 1 !important; }  /* Always show on touch */
}
```

---

## Theming

### Toggle Mechanism

The app toggles between dark and light by adding/removing the `.light-theme` class on `document.documentElement`:

```tsx
document.documentElement.classList.toggle("light-theme", !isDark);
```

### Adding a New Theme

1. Add a new class block in `index.css` (e.g., `.solarized-theme`).
2. Override all `--` custom properties.
3. Toggle the class from the theme switcher in `ChatScreen`.

### Extending the Palette

1. Add the CSS variable to `:root` and `.light-theme` in `index.css`.
2. Register it in `tailwind.config.ts` under `theme.extend.colors`:

```ts
colors: {
  "my-token": "hsl(var(--my-token))",
}
```

3. Use via `className="bg-my-token text-my-token"`.

---

## Accessibility

### Current Implementation

- Focus-visible outlines via Tailwind defaults.
- `title` attributes on icon buttons (Copy, Retry, Mute).
- `target="_blank" rel="noopener noreferrer"` on all external links.
- Semantic HTML: `<header>`, `<main>` (implicit), `<button>`.
- Touch-friendly: action bars always visible on `hover: none` devices.

### Recommendations for Extension

- Add `aria-label` to icon-only buttons.
- Add `role="log"` and `aria-live="polite"` to the message list.
- Trap focus inside the search overlay when open.
- Ensure color contrast meets WCAG 2.1 AA (current dark theme passes for body text).

---

## File Map

```
src/
├── index.css                          # Design tokens + utility classes
├── App.tsx                            # Router setup
├── pages/
│   └── Index.tsx                      # Renders ChatScreen
├── components/
│   ├── chat/
│   │   ├── ChatScreen.tsx             # Layout orchestrator, state, theme toggle
│   │   ├── ChatBubble.tsx             # Message renderer (user/assistant)
│   │   ├── ChatComposer.tsx           # Input, model pills, quote preview
│   │   ├── ChatSkeleton.tsx           # Loading shimmer state
│   │   ├── MessageSearch.tsx          # ⌘K search overlay
│   │   ├── MetadataChip.tsx           # Expandable key-value display
│   │   └── EmojiReactions.tsx         # Reaction bar + picker
│   └── ui/                           # shadcn/ui primitives (button, dialog, etc.)
├── hooks/
│   ├── use-mobile.tsx                 # Mobile detection hook
│   └── use-toast.ts                   # Toast hook
└── lib/
    └── utils.ts                       # cn() utility (clsx + tailwind-merge)

tailwind.config.ts                     # Extended theme: fonts, colors, animations
```

---

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Preview at http://localhost:5173
```

### Adding a New Message Type

1. Extend the `ChatMessage` interface in `ChatBubble.tsx`.
2. Add rendering logic inside the `ChatBubble` component.
3. Use existing utility classes (`chat-prose`, `user-msg-bubble`, etc.).
4. Register any new tokens in `index.css` → `tailwind.config.ts`.

### Creating a New Screen

1. Create `src/pages/MyPage.tsx`.
2. Add route in `src/App.tsx`.
3. Wrap content in `max-w-xl mx-auto` for consistent width.
4. Use `glass-header` for any sticky headers.
5. Follow the token system — never hardcode colors.

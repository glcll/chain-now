# Chain Now Design System

Enterprise onchain API marketing site. Editorial white canvas, deep product bands, restrained typography, and flat surfaces with thin rules.

Derived from observable patterns at [getdesign.md](https://getdesign.md/cohere/design-md). Customize as the product evolves.

## Colors

| Token | Value | Usage |
|-------|-------|--------|
| `--cn-primary` | `#17171c` | Primary CTAs, dark footer, console panels |
| `--cn-ink` | `#212121` | Body text on light surfaces |
| `--cn-deep-green` | `#003c33` | Dark feature bands |
| `--cn-dark-navy` | `#071829` | Alternate dark bands |
| `--cn-canvas` | `#ffffff` | Page background |
| `--cn-soft-stone` | `#eeece7` | Product cards, warm sections |
| `--cn-pale-green` | `#edfce9` | Accent wash |
| `--cn-pale-blue` | `#f1f5ff` | Code / API sections |
| `--cn-hairline` | `#d9d9dd` | Dividers |
| `--cn-muted` | `#93939f` | Metadata, footer links |
| `--cn-action-blue` | `#1863dc` | Links |
| `--cn-coral` | `#ff7759` | Labels, live chips |
| `--cn-on-dark` | `#ffffff` | Text on dark bands |

## Typography

- **Display:** Space Grotesk — hero and section headlines (tight line-height, negative tracking)
- **Body:** Inter — UI copy, descriptions, nav
- **Mono:** IBM Plex Mono — labels, code, endpoints

Weights stay at 400 (display/body) and 500 (buttons). Hierarchy comes from size and spacing, not bold.

## Radius

| Token | Value |
|-------|-------|
| `--cn-radius-xs` | 4px |
| `--cn-radius-sm` | 8px |
| `--cn-radius-md` | 16px |
| `--cn-radius-lg` | 22px |
| `--cn-radius-pill` | 32px |

## Components

- **button-primary** — Near-black pill, white label, 12px 24px padding
- **button-secondary** — Transparent, ink text, underline on hover
- **section-label** — Mono uppercase, letter-spacing, coral or muted
- **product-card** — Soft stone surface, 8px radius, thin top rule optional
- **dark-feature-band** — Deep green full-width section, white type
- **agent-console-card** — Near-black code panel, 8px radius
- **chain-chip** — Bordered pill; live state uses coral border
- **api-endpoint** — White card, hairline border, rule-separated list feel

## Principles

- White canvas default; dark green/navy for proof and architecture sections
- No decorative drop shadows; depth from surface contrast and borders
- Coral for taxonomy and “live” accents, not primary CTAs
- Large headlines used sparingly; body stays 16–18px measured copy

# Brand Color Schemes Reference

Official color schemes and design system tokens for **Natomas Sport Association** (parent organization) and **Bad Hops 11U Travel Baseball** (flagship competitive team).

---

## 1. Natomas Sport Association (Parent Organization)

The parent organization palette reflects leadership, athletic modernity, community trust, and safety.

| Role | Color Name | Hex Code | RGB | Tailwind / CSS Token | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Background** | Brand Charcoal | `#111317` | `rgb(17, 19, 23)` | `bg-[#111317]` / `charcoal-900` | Main page background, primary cards, sticky navbar |
| **Secondary Foundation** | Midnight Navy | `#17243B` | `rgb(23, 36, 59)` | `bg-[#17243B]` / `navy-800` | Top alert banners, secondary cards, button backgrounds |
| **Deep Dark Accent** | Shadow Navy | `#0B111C` | `rgb(11, 17, 28)` | `bg-[#0B111C]` / `navy-950` | Modals, table headers, deep contrast |
| **Primary Accent** | Ice Blue | `#67DDF2` | `rgb(103, 221, 242)` | `text-[#67DDF2]` / `ice.DEFAULT` | Brand highlights, focus rings, link hovers, badge borders |
| **Ice Blue Hover** | Ice Hover | `#52D0E7` | `rgb(82, 208, 231)` | `hover:bg-[#52D0E7]` | Interactive button hover state |
| **Secondary Accent** | Neon Lime | `#B7F52A` | `rgb(183, 245, 42)` | `text-[#B7F52A]` / `lime.DEFAULT` | CTA buttons, active navigation indicators, success badges |
| **Lime Hover** | Lime Hover | `#A6E81E` | `rgb(166, 232, 30)` | `hover:bg-[#A6E81E]` | Primary button hover state |
| **Neutral White** | Pure White | `#FFFFFF` | `rgb(255, 255, 255)` | `text-white` | Primary headings, logo brand typography |
| **Body Text** | Slate 100 / 300 | `#F1F5F9` / `#CBD5E1` | — | `text-slate-100`, `text-slate-300` | Paragraph text, secondary labels |
| **Muted Text** | Slate 400 | `#94A3B8` | — | `text-slate-400` | Timestamps, subtitles, helper text |
| **Borders & Dividers**| Slate 800 / Navy Border | `#1E293B` | `rgba(103, 221, 242, 0.3)` | `border-slate-800`, `border-[#67DDF2]/30` | Section dividers, container outlines |

### Association Tailwind Extension
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#17243B',
          800: '#17243B',
          900: '#111b2c',
          950: '#0b111c',
        },
        charcoal: {
          DEFAULT: '#111317',
          800: '#1a1d24',
          900: '#111317',
          950: '#0b0c0e',
        },
        ice: {
          DEFAULT: '#67DDF2',
          light: '#bbf2fc',
          hover: '#52d0e7',
          dark: '#23a8c2',
        },
        lime: {
          DEFAULT: '#B7F52A',
          light: '#d2f96e',
          hover: '#a6e81e',
          dark: '#85be0b',
        }
      }
    }
  }
}
```

---

## 2. Bad Hops 11U Travel Baseball (Flagship Team)

The Bad Hops palette represents competitive intensity, streetwear energy, high-rep discipline, and youth confidence. Slogan: *"Tough On The Field. Grounded Off The Field. Better Together."*

| Role | Color Name | Hex Code | RGB | Tailwind / CSS Token | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Team Accent** | Bad Hops Pink | `#F02AA8` | `rgb(240, 42, 168)` | `text-[#F02AA8]` / `brand-pink` | Bad Hops badges, active baseball nav, primary team CTAs |
| **Pink Hover** | Hot Pink Dark | `#D81A94` | `rgb(216, 26, 148)` | `hover:bg-[#D81A94]` | Button hover state for Bad Hops actions |
| **Secondary Accent** | Neon Lime | `#B7F52A` | `rgb(183, 245, 42)` | `text-[#B7F52A]` / `brand-lime` | Secondary accents, metric pills, focus rings |
| **Highlight Accent** | Ice Blue | `#67DDF2` | `rgb(103, 221, 242)` | `text-[#67DDF2]` / `brand-ice` | Tertiary highlights, facility indicators |
| **Pitch Black Card** | Brand Pitch Black | `#151515` | `rgb(21, 21, 21)` | `bg-[#151515]` / `brand-black` | Alternating section backgrounds, card containers |
| **Deep Charcoal** | Base Charcoal | `#111317` | `rgb(17, 19, 23)` | `bg-[#111317]` | Main canvas backdrop |
| **Glow Effects** | Pink Glow | `rgba(240, 42, 168, 0.25)` | — | `shadow-[0_0_25px_rgba(240,42,168,0.25)]` | Badge drop-shadow, card hover borders |
| **Glow Effects** | Lime Glow | `rgba(183, 245, 42, 0.25)` | — | `shadow-[0_0_20px_rgba(183,245,42,0.25)]` | Monogram glow, checkmarks |

### Bad Hops Tailwind Extension
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'brand-pink': '#F02AA8',
        'brand-lime': '#B7F52A',
        'brand-ice': '#67DDF2',
        'brand-black': '#151515',
        navy: {
          DEFAULT: '#17243B',
          800: '#1f304f',
          900: '#17243B',
        },
        charcoal: {
          DEFAULT: '#111317',
          900: '#111317',
          950: '#0b0c0e',
        }
      }
    }
  }
}
```

---

## 3. Brand Identity Rules

1. **Organization Name**: Always **Natomas Sport Association** (singular *"Sport"*). Never use *"NSA"* or *"Natomas Sports Association"*.
2. **Team Name**: **Bad Hops 11U Travel Baseball** (single-age 11U intermediate 50/70 division).
3. **Buttons**:
   - `btn-brand-lime`: `#B7F52A` background with `#111317` dark text.
   - `btn-brand-pink`: `#F02AA8` background with `#FFFFFF` text.
   - `btn-brand-ice`: `#67DDF2` background with `#111317` dark text.
   - `btn-brand-navy`: `#17243B` background with `#67DDF2` text and `#67DDF2`/30 border.
4. **Metatag & Social Preview Image**:
   - `assets/images/nsa-logo-light.png`
   - Full URL: `https://natomassportsassociation.org/assets/images/nsa-logo-light.png`

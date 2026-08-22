---
name: Arachnid Pulse
colors:
  surface: '#1e0f0f'
  surface-dim: '#1e0f0f'
  surface-bright: '#473534'
  surface-container-lowest: '#180a0a'
  surface-container-low: '#271717'
  surface-container: '#2c1b1b'
  surface-container-high: '#372625'
  surface-container-highest: '#433030'
  on-surface: '#f9dcda'
  on-surface-variant: '#e4bebc'
  inverse-surface: '#f9dcda'
  inverse-on-surface: '#3e2c2b'
  outline: '#ab8987'
  outline-variant: '#5b403f'
  surface-tint: '#ffb3b1'
  primary: '#ffb3b1'
  on-primary: '#680011'
  primary-container: '#ff535b'
  on-primary-container: '#5b000e'
  inverse-primary: '#bb152c'
  secondary: '#98cdf2'
  on-secondary: '#00344c'
  secondary-container: '#0b4e6e'
  on-secondary-container: '#8abfe4'
  tertiary: '#d6bee4'
  on-tertiary: '#3b2947'
  tertiary-container: '#9f89ac'
  on-tertiary-container: '#342340'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001c'
  secondary-fixed: '#c7e7ff'
  secondary-fixed-dim: '#98cdf2'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#064c6b'
  tertiary-fixed: '#f3daff'
  tertiary-fixed-dim: '#d6bee4'
  on-tertiary-fixed: '#251431'
  on-tertiary-fixed-variant: '#523f5f'
  background: '#1e0f0f'
  on-background: '#f9dcda'
  surface-variant: '#433030'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.04em
  display-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 42px
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system embodies an urban, high-intelligence atmosphere tailored for rapid data visualization and tracking. The aesthetic is a hybrid of **Cyber-Minimalism** and **Glassmorphism**, leaning heavily into high-contrast focal points against deep, atmospheric voids. 

The goal is to evoke the feeling of a futuristic tactical HUD (Heads-Up Display)—fast, precise, and sophisticated. It targets users who value technical performance and a cinematic aesthetic. The UI relies on deep depth of field, vibrant neon accents, and sharp geometric precision to create a premium, "always-on" intelligence environment.

## Colors

The palette is anchored by **Midnight Navy**, providing a near-infinite backdrop that allows foreground elements to "pop" with cinematic intensity. 

- **Deep Red:** Reserved for high-priority actions, critical tracking data, and aggressive branding elements.
- **Electric Blue:** Used for secondary data points, navigational cues, and interactive states to provide a cool, technical balance.
- **Subtle Violet:** Employed for tertiary backgrounds, tooltips, and soft gradients to add depth and a "night-city" chromatic aberration effect.
- **Surface Strategy:** Use semi-transparent layers of the tertiary color over the background to create "glass" containers.

## Typography

The design system utilizes **Inter** for its systematic, utilitarian, and modern geometric properties. 

To achieve the "intelligence" look, use `label-caps` for all metadata and category tags. Headlines should use tight letter-spacing to appear dense and impactful. Body text should maintain generous line heights to ensure legibility against the dark, high-contrast background. In display roles, use the ExtraBold weight to mimic heavy cinematic titling.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict adherence to an 8px rhythmic scale (4px for micro-adjustments). 

- **Mobile:** Single column with 24px side margins. Elements should feel "stacked" and vertically driven.
- **Desktop:** A 12-column grid. Utilize "Command Center" layouts where data widgets are docked to the edges, leaving the central viewport for primary tracking visuals.
- **Negative Space:** Use aggressive padding within cards (min 24px) to prevent the high-contrast elements from feeling cluttered.

## Elevation & Depth

Depth is conveyed through **Backdrop Blurs** and **Glows** rather than traditional shadows.

1.  **Level 0 (Base):** Midnight Navy (#070B14).
2.  **Level 1 (Cards):** Surface color at 60% opacity with a 12px Backdrop Blur and a 1px inner border (Stroke: #FFFFFF at 10% opacity).
3.  **Level 2 (Popovers/Modals):** Surface color at 80% opacity with a faint Electric Blue outer glow (Blur: 20px, Opacity: 15%).
4.  **Level 3 (Active Elements):** Deep Red or Electric Blue items should feature a "Bloom" effect—a soft, color-matched outer shadow that mimics a neon light source.

## Shapes

The shape language is **Soft (0.25rem - 0.75rem)**. This maintains a technical, sharp edge while feeling premium and modern. 

Avoid fully circular buttons unless they are icon-only. Standard buttons and containers should use the `rounded-lg` (0.5rem) setting to feel like machined components. Mobile mockup containers should use `rounded-xl` (0.75rem) to reflect high-end smartphone hardware.

## Components

- **High-Contrast Buttons:** Use linear gradients (e.g., Deep Red to a slightly darker shade). Apply a 5px color-matched drop shadow to create a "glow" effect. On hover, the glow intensity increases.
- **Minimalist Category Chips:** Outlined style only. Use a 1px border of Electric Blue or Violet with a 5% background fill. Text must be `label-caps`.
- **Input Fields:** Bottom-border only or very subtle ghost-borders. Focus states trigger an Electric Blue underline and a faint glow.
- **Lists:** Use "Zebra" striping with 2% opacity shifts or 1px dividers with 10% opacity. Icons within lists should always use accent colors (Red/Blue).
- **Premium Mobile Mockup:** A container with a thick, midnight-black bezel, a subtle 1px metallic rim highlight, and high-intensity screen content that uses the full gamut of the design system's glows.
- **Tracking Widgets:** Small cards containing sparkline charts in Electric Blue, featuring a "pulse" dot at the most recent data point.
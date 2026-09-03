# Brief: Ricochet Landing Page

## Product

**Ricochet** by Podlesny Twins — transient-triggered autopan audio plugin.

### Core mechanics
- Every detected transient sends the source to the opposite side.
- The pan move finishes before the attack is audible.
- No tempo sync, no pattern editor, no LFO, no MIDI trigger. Only audio triggers.
- Deterministic: same input + same START SIDE = same output.

### Controls
- TRIGGER: THRESHOLD, FILTER, HOLD.
- MOTION: START (LEFT/RIGHT/CENTRE), WIDTH, POINTS, VARY, SETTLE. MIX убран в v1.7.0 — плагин всегда 100 % wet.

### Displays
- MOVEMENT — position trace + side-chain meter.
- LAST EVENT — last hit waveform with the move window shaded.

### Tech
- VST3 и AU. Standalone собирается CMake, но в установщик не кладётся.
- macOS.
- 8 UI themes.
- Version 1.0.1.

### Price
- $29 launch / $39 regular.

## The problem we solve

Regular autopans and LFO panners have a persistent flaw: they pan part of the sound left and part right because they don't reliably detect the transient as a single event. The move starts or ends inside the attack, smearing the hit across the stereo field. We couldn't find a plugin that handled this without compromise, so we built Ricochet to control stereo placement of a signal precisely — every transient triggers one clean move, fully finished before the attack.

## Use cases

- Free the center of the mix by bouncing hi-hats and percussion.
- Ad-libs that jump left/right in sync with the performance.
- Snares and percussive elements that need stereo motion without widening artifacts.
- Any situation where you want the pan to follow the player, not a clock.

## Copy tone

No AI slop. Avoid:
- "revolutionary", "game-changing", "unlock your creativity", "seamless workflow"
- "empower", "elevate", "transform", "immerse"
- Generic claims about "depth", "width", "clarity" without specifics.
- Empty superlatives.

Write like a mix engineer talking to another mix engineer. Concrete, specific, occasionally dry. Headlines are actions or facts, not adjectives.

## Design reference

Premium plugin landing page in the spirit of Cradle's The God Particle:
- Very dark background (near black).
- Single accent color pulled from Ricochet UI: teal (#5ee7b3 approx) against dark gray.
- Large product UI screenshots, full-width sections.
- Generous whitespace.
- Big, bold typography for headlines.
- Minimal decorative elements. No gradients overload.
- Cinematic but technical feel.
- Responsive, mobile-first considerations.

## Sections

1. **Hero** — headline about the effect, subheadline about the problem, main UI screenshot, buy/demo CTAs.
2. **The problem** — explain why regular autopans fail, with diagram or screenshot.
3. **How it works** — transient detection + опережение + pan move.
4. **Use cases** — hi-hats, ad-libs, snares.
5. **Controls** — short description of each knob with UI crops.
6. **Themes / UI** — mention 8 themes, show screenshot.
7. **Pricing / Buy** — $29 launch, $39 regular, formats.
8. **FAQ** — real questions.
9. **Footer** — support, license.

## Deliverables

A static site in `~/podlesnytwins-plugins/ricochet/`:
- `index.html`
- `styles.css`
- `script.js` (minimal)
- `assets/` for images (use existing screenshot at `/tmp/ricochet_ui.png`)

It should be deployable to GitHub Pages alongside the root placeholder.

## Anti-slop QA

Before finishing, a separate reviewer must read every headline and paragraph and flag anything that sounds like AI-generated marketing fluff. Remove or rewrite it.

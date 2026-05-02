# 12 — Landing Page Design (Modern · 3D · Premium)

**Goal:** a landing page that signals enterprise-grade compliance software, builds trust on first scroll, and converts compliance professionals to free-trial signups. The 3D hero is the centerpiece — but every section earns its place.

---

## 12.1 Tech stack for the landing page

| | |
|---|---|
| Renderer | **Three.js** via `@react-three/fiber` v9 |
| Helpers | `@react-three/drei` (OrbitControls, useTexture, MeshTransmissionMaterial, Float, Center) |
| Post-processing | `@react-three/postprocessing` (Bloom, ChromaticAberration, Vignette) |
| Animation | **GSAP** v3 + ScrollTrigger plugin |
| Smooth scroll | **Lenis** (`@studio-freight/lenis`) — shared scroll progress driving GSAP timelines |
| Reveal | `framer-motion` for non-3D micro-interactions |
| Icons | `lucide-react` (matches StrategyNavigator) |
| Type | Variable Inter (body) + Editorial New (display, optional) |
| Lazy load | Whole landing route is code-split; the `<Canvas>` itself is lazy-loaded inside a `<Suspense>` with a static SVG poster fallback so the initial bundle stays slim |
| Reduced motion | Honor `prefers-reduced-motion` — replaces 3D scene with a static hero image |

---

## 12.2 Brand tokens

```
Primary deep navy:        #0B1A33
Surface navy:             #0F2447
Brand accent emerald:     #10B981  (trust, "approved")
Risk amber:               #F59E0B  (caution)
Critical red:             #EF4444  (decline, escalated)
Cool slate:               #64748B  (body text on light)
Off-white surface:        #F8FAFC
Soft gold accent:         #F4C430  (premium / trust marks)
```

Gradient signature (Hero glow):
```
linear-gradient(135deg, #0B1A33 0%, #1E40AF 35%, #10B981 100%)
```

Typography scale (display → body):
- H1 hero: clamp(48px, 7vw, 96px), -0.04em letter-spacing, weight 600
- H2 section: clamp(36px, 5vw, 64px), -0.03em
- H3 card: 24px, -0.01em, weight 500
- Body: 17px / 1.65 line-height
- Eyebrow / kicker: 12px UPPERCASE 0.18em letter-spacing

---

## 12.3 The 3D hero scene

**Concept:** a slowly rotating crystalline shield made of layered translucent geometry, surrounded by orbiting "evidence cards" representing real platform artefacts (a CDD form, a passport, an audit log row, a checkmark). Particles drift through the scene. As the user scrolls, the shield disassembles into the platform's modules.

### Scene composition

```tsx
// client/src/components/landing/HeroScene.tsx
<Canvas
  dpr={[1, 2]}
  gl={{ antialias: true, alpha: true }}
  camera={{ position: [0, 0, 8], fov: 35 }}
>
  <color attach="background" args={['#0B1A33']} />
  <fog attach="fog" args={['#0B1A33', 8, 20]} />

  <ambientLight intensity={0.3} />
  <directionalLight position={[5, 5, 5]} intensity={1.2} color="#10B981" />
  <pointLight position={[-5, -3, 2]} intensity={0.8} color="#1E40AF" />

  <Suspense fallback={null}>
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <CrystallineShield />            {/* central icosahedron with MeshTransmissionMaterial */}
    </Float>

    <OrbitingArtefacts />              {/* 4 floating cards in slow orbit */}
    <ParticleField count={400} />
    <Environment preset="night" />
  </Suspense>

  <EffectComposer>
    <Bloom intensity={0.7} luminanceThreshold={0.85} />
    <ChromaticAberration offset={[0.0008, 0.0006]} />
    <Vignette eskil={false} offset={0.2} darkness={0.6} />
  </EffectComposer>
</Canvas>
```

### `<CrystallineShield>` details

- Base: `<icosahedronGeometry args={[1.4, 1]}>` wrapped in `<MeshTransmissionMaterial>` (thickness 0.6, roughness 0.05, transmission 1, ior 1.5, anisotropy 0.3)
- Wireframe overlay: same geometry, `<meshBasicMaterial wireframe color="#10B981" opacity={0.25} transparent>`
- Inner core: smaller `<sphereGeometry>` with emissive teal — feels alive
- ScrollTrigger #1: as user scrolls 0–25% past hero, shield rotates 90° on Y and the layers fan out into a vertical stack
- ScrollTrigger #2: 25–50% scroll, shield re-condenses into a single solid emerald checkmark — the brand mark

### `<OrbitingArtefacts>`
4 `<Float>`-wrapped `<Plane>` cards each with a baked GLSL shader showing:
1. A redacted-passport scan with a green "Verified" stamp animating in
2. A risk-rating gauge sweeping from grey to green
3. A scrolling audit-log row
4. A pulsing escalation badge

Cards orbit at radius 3.5 with offset phases. Slow rotation matches the shield (0.06 rad/s). On hover, the card zooms in slightly and casts a soft shadow.

### Performance budget
- Initial bundle (gzip) for the landing route: < 220KB JS, < 40KB CSS
- 3D scene loaded after first paint
- Total animations capped at 60fps via `useFrame` time delta
- `pixelRatio` capped at `[1, 2]` to avoid 4K monitor melting

---

## 12.4 Sections (scroll order)

### S1 — Hero (100vh)
- Eyebrow: "AML/CTF compliance, operationalised"
- H1: "Compliance that runs itself."
- Sub: "Integrity Solve replaces your risk-assessment Word docs, your CDD spreadsheets, and your screening reminders with a single audit-grade operating system."
- CTAs: `Start free trial` (primary, emerald) + `Watch 90-second demo` (ghost, opens modal with embedded loop)
- Trust micro-bar: 6 logos of imagined clients in greyscale + "AUSTRAC-aware · SOC 2 ready · ISO 27001 mapped"

### S2 — "The compliance gap" (problem statement)
Three columns with animated counter numbers:
- "73% of compliance officers spend ≥15h/week on manual file admin"
- "1 in 5 SMRs are filed late due to fragmented evidence"
- "Average regulator audit prep: 22 days" → "With Integrity Solve: 11 minutes"

Each column has a small motion-graphic illustrating the pain (file folders falling, calendar pages tearing off, a clock spinning).

### S3 — "How it works" (3-step diagram)
- Step 1 — **Build your program** (6-step wizard screenshot, MacBook frame, slight 3D tilt via CSS transform)
- Step 2 — **Onboard customers** (CDD state diagram animating left-to-right)
- Step 3 — **Stay audit-ready** (evidence pack ZIP icon assembling itself from documents)

GSAP ScrollTrigger pins each step for 100vh while a timeline plays. Lenis keeps everything smooth.

### S4 — Feature constellation
A 4×3 grid of cards. Each card:
- Lucide icon in brand emerald inside an emerald-glow circle
- Feature name (H3)
- One-line description
- "Learn more" link → expands inline accordion

Cards: 6-Step Program Wizard · Document Generation · Customer File State Machine · ECDD & Escalation · Provider Adapter Layer · Stripe Billing · AI Risk Narratives (💎) · Smart Monitoring (💎) · Evidence Pack Generator (💎) · Group Structure (💎) · Customer Portal (💎) · Regulatory Feed (💎)

### S5 — Live state diagram
An interactive customer-file state machine diagram (SVG) the user can click through. Each click animates a state transition, shows the sample audit log entry that would be written, and explains what role can do it. This is the "wow" feature for compliance officers.

### S6 — Trust & security
- A row of security pills: SOC 2 ready · GDPR · ISO 27001 mapped · OAIC compliant · TLS 1.3 · AES-256 at rest
- Description of multi-tenant isolation in plain English
- Audit-log immutability explanation with a small illustration
- Link to `/security` page with full architecture detail

### S7 — Customer testimonials
- 3 cards, each with photo (use stock initially), name, title, firm, 1-paragraph quote
- Carousel on mobile; static row on desktop
- Add a small play icon on each that opens a 30s video (placeholder for now)

### S8 — Pricing preview
- 3 tier cards (Starter / Professional / Enterprise) — Lifetime visible only on dedicated `/pricing` page
- Toggle: monthly / annual (annual = 2 months free)
- Hover: card lifts and glows emerald
- Feature comparison link: "See full comparison"

### S9 — FAQ
- 8 accordion items addressing the most common compliance officer questions ("How is this different from [competitor]?", "What happens if a regulator audits me?", "Can I migrate from spreadsheets?", "Is this AUSTRAC-aware?", "How is data isolated between firms?", "What if my provider changes?", "What does pricing scale like?", "How long until I'm live?")

### S10 — Final CTA
- Big H2: "Spend less time on compliance admin. More time on your clients."
- Primary CTA repeats. Secondary CTA: "Book a 20-minute walkthrough"
- Background: subtle 3D scene continuation (the emerald checkmark from earlier slowly rotating in the corner)

### S11 — Footer
- 4 columns: Product / Company / Resources / Legal
- Social icons (LinkedIn, X, YouTube)
- Newsletter signup with one input + button
- Copyright + Privacy + Terms + DPA links

---

## 12.5 Microcopy guidelines

- Speak like a compliance peer, not like a startup. "Audit-grade" not "amazing".
- Avoid jargon-stuffing. One acronym per sentence max. Always expand on first use ("Customer Due Diligence (CDD)").
- Numbers > adjectives. "11 minutes" beats "fast".
- Every CTA verb is action-oriented and specific. "Start free trial" not "Get started".

---

## 12.6 Conversion mechanics

- **Sticky top CTA** appears on scroll > 600px ("Start free trial" only).
- **Exit-intent modal** (desktop only): "Wait — see a 90-second walkthrough first?" Single-click opens demo video.
- **Free trial form** is one field (email) on first step → password + workspace name on second step. No credit card.
- **Social proof:** small toast bottom-left every ~30s on landing: "Acme Accounting just started a trial" (real or convincingly seeded).
- **Live chat widget** (optional, behind env flag — Crisp matches StrategyNavigator's pattern).

---

## 12.7 Accessibility

- All 3D scenes have `aria-hidden="true"` and a visible static fallback when reduced motion is preferred.
- Color contrast meets WCAG AA in both dark and light variations.
- Keyboard navigable: tab order matches visual order; focus rings visible.
- Heading hierarchy strict (one H1 only).
- Section landmarks (`<section aria-labelledby="...">`) for screen readers.

---

## 12.8 SEO + Open Graph

- `<title>`: "Integrity Solve — AML/CTF Compliance Operating System"
- Meta description: 155 chars, action-oriented
- Open Graph image: 1200×630 PNG with shield + tagline (generate from a React component using `@vercel/og` or pre-render once)
- JSON-LD `SoftwareApplication` schema with screenshots, pricing, ratings (when available)
- `sitemap.xml` and `robots.txt` served from server

---

## 12.9 Files to create

```
client/src/components/landing/
  Hero3D.tsx              # The whole hero block, includes <Canvas>
  HeroScene.tsx           # The R3F scene
  CrystallineShield.tsx
  OrbitingArtefacts.tsx
  ParticleField.tsx
  ProblemStats.tsx        # S2
  HowItWorks.tsx          # S3, GSAP-pinned
  FeatureGrid.tsx         # S4
  StateDiagramInteractive.tsx  # S5
  TrustBadges.tsx         # S6
  TestimonialCarousel.tsx # S7
  PricingPreview.tsx      # S8
  FaqAccordion.tsx        # S9
  FinalCta.tsx            # S10
  LandingFooter.tsx       # S11
  StickyTopCta.tsx
  ExitIntentModal.tsx
  SocialProofToast.tsx
  ScrollProgress.tsx      # Lenis-driven progress bar at top

client/src/pages/public/
  Landing.tsx             # Composes all S1-S11
  Pricing.tsx
  Features.tsx
  Compliance.tsx          # Trust / security deep-dive
  About.tsx
  Contact.tsx
```

---

## 12.10 Done = polished

The landing page is "done" when:
- Lighthouse mobile score: Performance ≥ 80, Accessibility 100, Best Practices ≥ 95, SEO 100
- 3D scene plays at 60fps on a mid-range laptop and degrades gracefully on mobile (drops to 30fps target there)
- Reduced-motion fallback verified
- All copy reviewed by an actual compliance officer (or seeded with quotes from public AML guidance docs)
- A clean static screenshot of S1 is saved as `client/public/og-image.png` for Open Graph

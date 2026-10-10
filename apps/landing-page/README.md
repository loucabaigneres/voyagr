# @voyagr/landing-page

Teaser / "coming soon" landing page for **Seego**, the mobile travel app. Presents the
product and captures e-mail sign-ups for the launch waitlist.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`), brand tokens aligned with `apps/web`
- **lucide-react** for icons
- Single-page static site — no router, no runtime backend dependency

## Development

```bash
pnpm --filter @voyagr/landing-page dev
```

Served on **http://localhost:5174** (the `web` app owns `5173`).

```bash
pnpm --filter @voyagr/landing-page build      # type-check + production build to dist/
pnpm --filter @voyagr/landing-page preview     # preview the production build
pnpm --filter @voyagr/landing-page lint
```

## Waitlist CTA

The e-mail form lives in [`src/components/WaitlistForm.tsx`](src/components/WaitlistForm.tsx)
and its logic in [`src/lib/waitlist.ts`](src/lib/waitlist.ts).

- Set `VITE_WAITLIST_ENDPOINT` (see [`.env.example`](.env.example)) to `POST`
  `{ email, source }` sign-ups to your backend / ESP (the `POST /waitlist` API route, etc.).
- When the variable is **not** set, sign-ups are only persisted to the visitor's
  `localStorage`, so the page stays fully functional during local dev and preview.

Returning visitors who already joined see a confirmation state instead of the form.

## Structure

```text
src/
├── App.tsx                 # Layout + shared waitlist state
├── main.tsx                # Entry point
├── index.css               # Tailwind import + Seego brand tokens & animations
├── lib/waitlist.ts         # Validation, submission, local persistence hook
└── components/
    ├── Header.tsx
    ├── Hero.tsx            # Headline + e-mail CTA + social proof + phone mockup
    ├── WaitlistForm.tsx    # The e-mail capture form (light / dark tone)
    ├── SocialProof.tsx     # "Déjà N membres inscrits"
    ├── PhoneMockup.tsx     # Decorative app preview (swipe deck)
    ├── Features.tsx
    ├── Faq.tsx             # Accordion FAQ
    ├── CtaBand.tsx         # Secondary CTA with the waitlist form
    ├── ScrollToTop.tsx     # Floating back-to-top button
    └── Footer.tsx
```

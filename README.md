<div align="center">
  <img src="public/logo.jpeg" alt="Olvia" width="120" />

  # Olvia

  **Tap an object. Your phone shows what to do next.**

  An NFC-based assistive companion for people who find standard pillboxes,
  phone alarms and app menus hard to use, and for the caregivers who support them.

  <sub>Built for STRIDE Makeathon 2025 · IEEE Kerala Section · K-DISC</sub>
</div>

---

## The idea

```
Physical object → NFC tap → Smartphone → Olvia web app → The right screen
```

Small NFC stickers go on everyday objects: the medicine bottle, each
compartment, later the water bottle. A sticker stores **only a link**, such as
`https://<your-domain>/nfc/MED_MORNING`. Tapping it opens the matching Olvia
screen, with instructions shown in large text and read aloud.

Every interaction follows one pattern: **TAP → IDENTIFY → GUIDE → CONFIRM → RECORD**.

### Medicine flow

1. At the scheduled time an alarm rings in the app.
2. The user taps the **bottle** sticker to stop it, which shows they are at the bottle.
3. Olvia speaks the caregiver's instruction: *"Morning medicine. It is in the
   compartment with the blue sticker. Tap the blue sticker."*
4. The user taps a compartment sticker. The wrong one: "Wrong compartment", and
   the instruction repeats. The right one: a large **I've taken it** button appears.
5. Pressing it records the dose. The caregiver's overview updates.

## Why nothing private goes on a sticker

Anyone with a phone can read or copy an NFC sticker. So a sticker only says
*which object* it is (`MED_MORNING`). Medicine names, doses and contacts live in
Firestore, and security rules release them only to the signed-in user and their
linked caregiver. A lost sticker reveals nothing.

## Tech stack

| Part | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Atkinson Hyperlegible font |
| Auth + database | Firebase Authentication, Cloud Firestore |
| Voice | Browser text-to-speech (`speechSynthesis`) |
| NFC | Tag URLs (all phones) + Web NFC (Chrome on Android) |
| Hosting | Vercel |

## Project structure

```
src/
├── app/                    Pages (each folder is a URL)
│   ├── page.tsx            Landing page, or redirect to your home when signed in
│   ├── today/              User home: today's routine
│   ├── caregiver/          Caregiver overview
│   ├── schedule/           Caregiver: routine setup (medicine, compartment, time, sticker colour)
│   ├── medications/        Medicine list and form
│   ├── help/  settings/  login/  register/  reports/  voice/
├── components/             Layout and reusable UI (status badges, tag colour)
├── context/                Auth, app data, display preferences
├── lib/nfcTags.ts          The list of NFC tag ids and what each one means
├── services/               Firebase setup and Firestore reads/writes
└── types/                  Shared TypeScript types
```

## Run it locally

See [SETUP.md](SETUP.md) for the Firebase steps, then:

```bash
npm install
cp .env.example .env      # paste your Firebase web config
npm run dev
```

Open http://localhost:3000.

## Status

- [x] Phase 1: foundation, landing page, role-based navigation, accessible design
- [ ] Phase 2: caregiver ↔ user linking, routine setup for the linked user
- [ ] Phase 3: today dashboard
- [ ] Phase 4: NFC routing (`/nfc/<TAG_ID>`)
- [ ] Phase 5: medicine alarm, guidance and confirmation
- [ ] Phase 6: caregiver overview
- [ ] Phase 7–8: deployment and physical NFC testing
- [ ] Phase 9: hydration
- [ ] Phase 10: emergency profile

## Limitations

Olvia is an assistive companion. It shows what a caregiver has entered. It does
not diagnose, decide doses, or replace a doctor or caregiver.

A web page cannot ring an alarm while the browser is closed or the phone is
locked. For now the app must stay open on the phone during the day.

## License

MIT

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Nfc,
  Smartphone,
  CircleCheck,
  ShieldCheck,
  HeartHandshake,
  Volume2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { homePathFor } from '@/lib/roles';

/**
 * The front door. Signed-out visitors see what Olvia is; signed-in people are
 * sent straight to their own home screen, so the landing page never gets in
 * the way of someone who just wants to use the app.
 */
export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.replace(homePathFor(user.role));
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <span className="sr-only">Loading</span>
        <span
          aria-hidden="true"
          className="w-10 h-10 border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="container-app flex items-center justify-between h-20">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="" className="w-10 h-10 object-contain" />
          <span className="font-bold text-2xl">Olvia</span>
        </div>
        <Link href="/login" className="btn btn-outline btn-sm">
          Sign in
        </Link>
      </header>

      <main id="main" className="container-app pb-16 space-y-16">
        {/* What it is */}
        <section aria-labelledby="hero-title" className="pt-6 space-y-6">
          <h1 id="hero-title" className="text-4xl font-bold leading-tight">
            Tap an object.
            <br />
            Olvia shows what to do next.
          </h1>
          <p className="text-xl text-gray-700 max-w-prose">
            Olvia puts small NFC stickers on everyday things, like a medicine
            compartment. Hold your phone near one and the right instructions
            appear, and are read out loud. No menus to search through.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/register" className="btn btn-primary btn-lg">
              Get started
            </Link>
            <Link href="/login" className="btn btn-outline btn-lg">
              I already have an account
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-title" className="space-y-6">
          <h2 id="how-title" className="text-3xl font-bold">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            <Step
              number={1}
              icon={Nfc}
              title="Tap"
              text="Hold the top of your phone against the Olvia sticker on the object."
            />
            <Step
              number={2}
              icon={Volume2}
              title="Follow"
              text="Olvia shows and says what to do, using your caregiver's own instructions."
            />
            <Step
              number={3}
              icon={CircleCheck}
              title="Confirm"
              text="Press one big button when you're done. Your caregiver can see it happened."
            />
          </ol>
        </section>

        {/* NFC in plain words */}
        <section aria-labelledby="nfc-title" className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-primary-700" aria-hidden="true" />
            <h2 id="nfc-title" className="text-2xl font-bold">
              What is NFC?
            </h2>
          </div>
          <p className="text-lg text-gray-700">
            NFC is the same short-range wireless used for tap-to-pay. An NFC sticker
            has no battery. When your phone touches it, the phone powers the sticker
            for a moment and reads a short web link stored on it. Most Android phones
            and iPhones from 2018 onwards can do this.
          </p>
        </section>

        {/* Privacy */}
        <section aria-labelledby="privacy-title" className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary-700" aria-hidden="true" />
            <h2 id="privacy-title" className="text-2xl font-bold">
              Nothing private is stored on a sticker
            </h2>
          </div>
          <p className="text-lg text-gray-700">
            A sticker only holds a link that names the object, such as
            &ldquo;morning medicine&rdquo;. Your medicine names, doses and contacts stay
            in your Olvia account and only appear after you sign in. A lost or copied
            sticker reveals nothing about you.
          </p>
        </section>

        {/* Who it's for */}
        <section aria-labelledby="who-title" className="space-y-4">
          <h2 id="who-title" className="text-3xl font-bold">
            Made for two people
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <h3 className="text-xl font-bold mb-2">The person using Olvia</h3>
              <p className="text-gray-700">
                Sees today&rsquo;s routine, taps objects for guidance, and confirms
                with one button. Large text and spoken instructions throughout.
              </p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-2">
                <HeartHandshake className="w-6 h-6 text-secondary-600" aria-hidden="true" />
                <h3 className="text-xl font-bold">The caregiver</h3>
              </div>
              <p className="text-gray-700">
                Sets up the routine and instructions, and can see at a glance what
                was done today and what was missed.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200">
        <p className="container-app py-8 text-gray-700">
          Olvia is an assistive companion. It shows the information your caregiver
          enters. It does not diagnose, decide doses, or replace a doctor or caregiver.
        </p>
      </footer>
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: number;
  icon: typeof Nfc;
  title: string;
  text: string;
}) {
  return (
    <li className="card p-6 space-y-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-primary-700 text-white font-bold flex items-center justify-center"
        >
          {number}
        </span>
        <Icon className="w-7 h-7 text-primary-700" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold">
        <span className="sr-only">Step {number}: </span>
        {title}
      </h3>
      <p className="text-gray-700">{text}</p>
    </li>
  );
}

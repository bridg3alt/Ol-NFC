'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { TriangleAlert } from 'lucide-react';

// Native <details>/<summary> gives an accessible expand/collapse for free:
// keyboard, screen reader state and focus all work without extra code.
const FAQS = [
  {
    question: 'How do I use an Olvia tag?',
    answer:
      'Hold the top back of your phone flat against the sticker for a second. Your phone reads the link on the sticker and opens the right Olvia screen.',
  },
  {
    question: 'Nothing happens when I tap. What should I check?',
    answer:
      'Make sure NFC is switched on in your phone settings and the screen is unlocked. On many phones the reader is near the camera, so try moving the phone slightly.',
  },
  {
    question: 'What happens when the medicine alarm rings?',
    answer:
      'Tap the sticker on the bottle to stop it. Olvia then tells you which compartment to use and its sticker colour. Tap that sticker, take the medicine, and press "I\'ve taken it".',
  },
  {
    question: 'What if I tap the wrong compartment?',
    answer:
      'Olvia says "wrong compartment", repeats the instructions, and waits for you to tap the right one. Nothing is recorded until you tap the correct sticker.',
  },
  {
    question: 'What does my caregiver see?',
    answer:
      'Whether each medicine was taken, when, and whether the alarm was stopped at the bottle. They do not see anything you did not do in Olvia.',
  },
  {
    question: 'Is my medical information on the sticker?',
    answer:
      'No. A sticker only holds a link naming the object, like "morning medicine". Your details stay in your account and only show after you sign in.',
  },
];

export default function HelpPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Help</h1>
          <p className="text-lg text-gray-700 mt-1">Answers to common questions.</p>
        </header>

        <section className="card divide-y divide-stone-200">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="cursor-pointer list-none p-5 font-bold text-lg flex justify-between gap-4 min-h-[48px]">
                {faq.question}
                <span aria-hidden="true" className="group-open:rotate-45 text-2xl leading-none">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-gray-700">{faq.answer}</p>
            </details>
          ))}
        </section>

        <aside className="card p-5 border-warning-300 bg-warning-50 flex gap-3">
          <TriangleAlert className="w-6 h-6 text-warning-800 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Olvia supports your routine. It does not replace medical advice.</p>
            <p className="mt-1">
              Always follow your doctor or pharmacist. Ask them about any missed or
              doubled dose.
            </p>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}

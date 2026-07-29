'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ChevronDown, HelpCircle, Bluetooth, Pill, AlertTriangle } from 'lucide-react';

const FAQS = [
  {
    question: 'How do I connect my Ol bottle?',
    answer:
      'Go to the Bottle page and tap Connect. Your browser will show a list of nearby devices — pick the one named "Ol Bottle". Web Bluetooth only works in Chrome, Edge, and Opera on desktop or Android; Safari and iOS are not supported.',
  },
  {
    question: 'Do reminders still work if my phone is off?',
    answer:
      'Yes. The bottle stores its own copy of your schedule, so LED, buzzer, and vibration reminders fire on time even with no phone nearby. Push your latest schedule from the Bottle page after making changes.',
  },
  {
    question: 'What happens if the bottle is out of range when I take a dose?',
    answer:
      'The bottle records the intake in its own memory and replays it the next time it connects. Nothing is lost — your adherence history fills in once you reconnect.',
  },
  {
    question: 'How is a dose marked as taken?',
    answer:
      'A sensor inside each compartment detects the pill leaving. That reading is what marks the dose taken, not the clock. You can also mark a dose manually from the dashboard.',
  },
  {
    question: 'What does each compartment label mean?',
    answer:
      'BB is before breakfast, AB after breakfast, BL before lunch, AL after lunch, BD before dinner, AD after dinner. You can also set a custom label per schedule.',
  },
  {
    question: 'What if a compartment jams or runs empty?',
    answer:
      'The bottle stops, reports the failure, and does not retry on its own. You will see a notification naming the compartment. Refill or clear it, then dispense again from the Bottle page.',
  },
  {
    question: 'Can a caregiver see my adherence?',
    answer:
      'A caregiver account can be linked to your account. Once linked, they see your schedule and adherence reports and receive alerts for missed doses.',
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <header>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Help</h1>
          <p className="text-gray-500 mt-1">Guides and answers for using Olvia</p>
        </header>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            href="/bottle"
            icon={<Bluetooth className="w-5 h-5" />}
            title="Connect bottle"
            description="Pair and sync your Ol bottle"
          />
          <QuickLink
            href="/medications"
            icon={<Pill className="w-5 h-5" />}
            title="Add medication"
            description="Set up what you take"
          />
          <QuickLink
            href="/schedule"
            icon={<HelpCircle className="w-5 h-5" />}
            title="Build a schedule"
            description="Times, days, and reminders"
          />
        </div>

        {/* Safety */}
        <div className="card p-5 bg-warning-50 border-warning-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-warning-800">
              <p className="font-medium">Olvia supports your routine — it does not replace medical advice</p>
              <p className="mt-1">
                Always follow the dosing instructions from your doctor or pharmacist.
                If a reminder conflicts with their guidance, follow their guidance and
                update your schedule. Contact your healthcare provider about any missed
                or doubled dose.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <section className="card divide-y divide-gray-100">
          {FAQS.map((faq, index) => (
            <div key={faq.question}>
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5 text-gray-600">{faq.answer}</div>
              )}
            </div>
          ))}
        </section>
      </div>
    </DashboardLayout>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="card p-5 hover:border-primary-300 hover:bg-primary-50 transition-all"
    >
      <div className="p-2 rounded-lg bg-primary-100 text-primary-600 w-fit mb-3">
        {icon}
      </div>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
}

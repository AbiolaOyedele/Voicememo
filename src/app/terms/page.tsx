import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that cover using Dumpty.',
}

export default function TermsOfServicePage() {
  return (
    <main className="bg-canvas text-ink mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="text-muted text-sm underline underline-offset-4">
        ← Dumpty
      </Link>

      <h1 className="mt-6 text-3xl tracking-tight">Terms of Service</h1>
      <p className="text-muted mt-2 text-sm">Last updated: July 13, 2026</p>

      <div className="mt-8 flex flex-col gap-8 text-[15px] leading-relaxed">
        <p>By using Dumpty, you agree to these terms.</p>

        <Section title="What Dumpty is">
          <p>
            Dumpty lets you record voice notes, which we transcribe and clean up into organized,
            readable text using third-party speech-to-text and AI services. It&apos;s a personal
            note-taking tool — not a substitute for professional, legal, medical, or financial
            advice, and you&apos;re responsible for how you use anything it produces.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            You need an account (via Google or an email link) to save notes across devices.
            You&apos;re responsible for keeping access to your email/Google account secure —
            anyone with access to it can access your Dumpty account.
          </p>
          <p>
            You can also use Dumpty as a guest, without an account; guest recordings stay only on
            your device and are capped at 5 minutes.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>Don&apos;t use Dumpty to record or process:</p>
          <ul className="list-disc pl-5">
            <li>Content that&apos;s illegal, abusive, or violates someone else&apos;s rights.</li>
            <li>Anyone else&apos;s voice or personal information without their knowledge and consent.</li>
            <li>Attempts to abuse, overload, or reverse-engineer the service.</li>
          </ul>
          <p className="mt-4">We may suspend or remove accounts that violate this.</p>
        </Section>

        <Section title="Your content">
          <p>
            You own what you record and what Dumpty generates from it. You give us the limited
            right to store, process, and transmit it to our service providers (transcription, AI
            processing, storage) solely to provide the app to you.
          </p>
          <p>
            We&apos;re not able to review the content of your recordings before they&apos;re
            processed, and we aren&apos;t responsible for the accuracy of transcripts or
            AI-generated summaries — always check anything important before relying on it.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Deleting your account permanently removes your data as described in our{' '}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            . This can&apos;t be undone.
          </p>
        </Section>

        <Section title="Service availability">
          <p>
            Dumpty is provided &quot;as is.&quot; We rely on third-party services (Supabase,
            Deepgram, Anthropic, Cloudflare, Vercel) to run the app, and an outage on their end may
            affect Dumpty. We don&apos;t guarantee uninterrupted availability.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the extent permitted by law, Dumpty is provided without warranties of any kind, and
            we aren&apos;t liable for indirect, incidental, or consequential damages arising from
            your use of the app.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms as the app evolves. Continued use after a change means you
            accept the update.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms:{' '}
            <a href="mailto:hello@theruff.agency" className="underline underline-offset-4">
              hello@theruff.agency
            </a>
          </p>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg tracking-tight">{title}</h2>
      <div className="text-muted flex flex-col gap-2">{children}</div>
    </section>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Dumpty collects, why, and how to remove it.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-canvas text-ink mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="text-muted text-sm underline underline-offset-4">
        ← Dumpty
      </Link>

      <h1 className="mt-6 text-3xl tracking-tight">Privacy Policy</h1>
      <p className="text-muted mt-2 text-sm">Last updated: July 13, 2026</p>

      <div className="mt-8 flex flex-col gap-8 text-[15px] leading-relaxed">
        <p>
          Dumpty (&quot;we,&quot; &quot;us&quot;) is a voice-note app that turns your spoken ideas
          into a clean, organized, readable version. This page explains what we collect, why, and
          how to remove it.
        </p>

        <Section title="What we collect">
          <p className="font-medium">If you sign in (with Google or an email link):</p>
          <ul className="list-disc pl-5">
            <li>Your email address, and your name/avatar if you sign in with Google.</li>
            <li>The audio you record, while it&apos;s being processed.</li>
            <li>
              The transcript and AI-cleaned version of what you said — the segmented notes, tags,
              summary, and any action-plan checklist you generate.
            </li>
            <li>Basic technical info like when a recording was made and how long it is.</li>
          </ul>
          <p className="font-medium mt-4">If you use Dumpty as a guest (no account):</p>
          <p>
            Nothing leaves your device. Guest recordings are capped at 5 minutes, stored only in
            your browser&apos;s local storage, and never uploaded, transcribed, or processed by
            us.
          </p>
          <p className="mt-4">
            If you send us feedback, we keep the message, the page you sent it from, and your app
            version, so we can act on it. If you enable notifications, we store the browser
            subscription details needed to send them — no message content.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            To transcribe and clean up your recordings, to show you your notes, to respond to
            feedback, and to send you notifications you&apos;ve opted into. We do not sell your
            data, and we do not use it for advertising.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>We use a small number of service providers to run Dumpty:</p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium">Supabase</span> — our database and sign-in system.
            </li>
            <li>
              <span className="font-medium">Deepgram</span> — converts your speech to text.
            </li>
            <li>
              <span className="font-medium">Anthropic</span> — cleans up and organizes your
              transcript.
            </li>
            <li>
              <span className="font-medium">Cloudflare R2</span> — temporary storage for your
              audio.
            </li>
            <li>
              <span className="font-medium">Resend</span> — delivers feedback and account emails.
            </li>
            <li>
              <span className="font-medium">Vercel</span> — hosts the app.
            </li>
            <li>
              <span className="font-medium">Google</span> — if you choose to sign in with Google.
            </li>
          </ul>
          <p className="mt-4">
            Each only receives what it needs to do its job. None of them are permitted to use your
            data for their own purposes. We do not sell your data or use it for advertising.
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul className="list-disc pl-5">
            <li>
              Your <span className="font-medium">raw audio recording</span> is automatically
              deleted from storage 7 days after upload, regardless of anything else.
            </li>
            <li>
              Your <span className="font-medium">transcript, notes, and account data</span> stay
              until you delete them or delete your account.
            </li>
            <li>
              <span className="font-medium">Deleting your account</span> permanently and
              immediately removes your profile and every note you&apos;ve created. There is no way
              to undo this.
            </li>
          </ul>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc pl-5">
            <li>Delete individual notes, or your whole account, any time from Account.</li>
            <li>Turn notifications on or off any time from Account.</li>
            <li>Use guest mode if you&apos;d rather nothing touch our servers at all.</li>
          </ul>
        </Section>

        <Section title="Children">
          <p>
            Dumpty isn&apos;t directed at children under 13, and we don&apos;t knowingly collect
            data from them.
          </p>
        </Section>

        <Section title="Changes">
          <p>If this policy changes in a way that matters, we&apos;ll update the date above.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data:{' '}
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

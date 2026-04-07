export const metadata = { title: 'Privacy Policy — CULT Dashboard' }

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: 'system-ui, sans-serif', color: '#111', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 40 }}>Last updated: 7 April 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>1. Who we are</h2>
        <p>CULT Dashboard is operated by Will Scott. This tool is used by Will Scott and authorised clients to manage Instagram content strategy. If you have questions, contact: <a href="mailto:will@scottvip.com" style={{ color: '#2563eb' }}>will@scottvip.com</a></p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>2. What data we collect</h2>
        <p>When you connect your Instagram account, we request access to:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>Your Instagram profile information (username, account ID)</li>
          <li>Your media (reels, posts) and associated metadata (captions, hashtags, timestamps)</li>
          <li>Insights data (views, likes, comments, reach) for your own content</li>
        </ul>
        <p style={{ marginTop: 12 }}>We do not collect passwords, payment information, or personal data from your followers.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>3. How we use your data</h2>
        <p>We use your Instagram data solely to:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>Display your content performance analytics within your personal dashboard</li>
          <li>Generate AI-assisted content ideas and scripts tailored to your account</li>
          <li>Track content trends and format performance over time</li>
        </ul>
        <p style={{ marginTop: 12 }}>We do not sell, share, or disclose your data to third parties. Data is only accessible to you and the account administrator.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>4. Data storage</h2>
        <p>Your data is stored securely in a private Supabase database. Access is restricted by row-level security — you can only view your own data. We use industry-standard encryption in transit and at rest.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>5. Third-party services</h2>
        <p>We use the following services to operate the dashboard:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li><strong>Meta / Instagram Graph API</strong> — to read your Instagram content and insights</li>
          <li><strong>OpenAI Whisper</strong> — to transcribe video audio for content analysis</li>
          <li><strong>Anthropic Claude</strong> — to generate content ideas and scripts</li>
          <li><strong>Supabase</strong> — for secure database storage</li>
          <li><strong>Vercel</strong> — for application hosting</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>6. Data retention</h2>
        <p>We retain your Instagram data for as long as your account is active. You may request deletion of your data at any time by emailing <a href="mailto:will@scottvip.com" style={{ color: '#2563eb' }}>will@scottvip.com</a> or by using our <a href="/data-deletion" style={{ color: '#2563eb' }}>data deletion page</a>.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>7. Your rights</h2>
        <p>You may at any time:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>Disconnect your Instagram account from within the dashboard settings</li>
          <li>Request a copy of your stored data</li>
          <li>Request complete deletion of your data</li>
          <li>Revoke app access via your <a href="https://www.instagram.com/accounts/privacy_and_security/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Instagram security settings</a></li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>8. Contact</h2>
        <p>For any privacy-related questions or data requests, contact: <a href="mailto:will@scottvip.com" style={{ color: '#2563eb' }}>will@scottvip.com</a></p>
      </section>
    </div>
  )
}

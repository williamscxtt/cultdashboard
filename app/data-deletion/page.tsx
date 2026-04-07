export const metadata = { title: 'Data Deletion — CULT Dashboard' }

export default function DataDeletionPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', fontFamily: 'system-ui, sans-serif', color: '#111', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Data Deletion Request</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 40 }}>How to remove your data from CULT Dashboard</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Remove Instagram access</h2>
        <p>To revoke CULT Dashboard&apos;s access to your Instagram account:</p>
        <ol style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>Go to your <a href="https://www.instagram.com/accounts/privacy_and_security/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Instagram Security Settings</a></li>
          <li>Select <strong>Apps and Websites</strong></li>
          <li>Find <strong>CULT Dashboard</strong> and click <strong>Remove</strong></li>
        </ol>
        <p style={{ marginTop: 12 }}>This immediately revokes our access token and we will no longer be able to fetch your data.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Delete your stored data</h2>
        <p>To request deletion of all data we have stored about you (analytics, transcripts, content history), email us at:</p>
        <p style={{ marginTop: 8 }}>
          <a href="mailto:will@scottvip.com?subject=Data Deletion Request" style={{ color: '#2563eb', fontWeight: 600 }}>will@scottvip.com</a>
        </p>
        <p style={{ marginTop: 12 }}>Include the Instagram username associated with your account. We will delete all your data within 30 days and confirm by email.</p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Questions</h2>
        <p>For any questions about your data, see our <a href="/privacy" style={{ color: '#2563eb' }}>Privacy Policy</a> or contact <a href="mailto:will@scottvip.com" style={{ color: '#2563eb' }}>will@scottvip.com</a>.</p>
      </section>
    </div>
  )
}

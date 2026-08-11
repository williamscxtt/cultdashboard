<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GitHub authentication

- GitHub CLI credentials are stored securely in the macOS Keychain.
- A sandboxed `gh auth status` cannot read the Keychain and may incorrectly report that the token is invalid.
- Run GitHub authentication checks and pushes with escalated permissions so the existing Keychain login is used.
- Do not start `gh auth login` unless an escalated `gh auth status` genuinely fails.

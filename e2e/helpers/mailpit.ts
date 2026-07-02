const MAILPIT_URL = 'http://localhost:8025'

interface MailpitMessageSummary {
  ID: string
  To: { Address: string }[]
}

/**
 * Return the verification code from the most recent Mailpit message sent to
 * `email`. Polls because delivery is asynchronous relative to the signup call.
 */
export async function latestCodeFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    const { messages } = (await search.json()) as {
      messages: MailpitMessageSummary[]
    }
    if (messages.length > 0) {
      const detail = await fetch(
        `${MAILPIT_URL}/api/v1/message/${messages[0]!.ID}`,
      )
      const body = ((await detail.json()) as { Text: string }).Text
      // The code sits alone on its own line, e.g. "NDKM-PNCR".
      const match = body.match(/^\s*([A-Z0-9]{4,8}(?:-[A-Z0-9]{4,8})?)\s*$/m)
      if (match) return match[1]!
      throw new Error(`No verification code found in message:\n${body}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No Mailpit message for ${email}`)
}

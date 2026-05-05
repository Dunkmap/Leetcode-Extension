/**
 * SQL Master LeetCode Extension — Background Service Worker
 * Handles only GROQ AI proxy requests for LeetCode solution generation.
 */
console.log("[SQL Master LeetCode] Background Service Worker Starting...");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[SQL Master LeetCode] Received message:", message.type);
  if (message.type === 'GROQ_AI_GENERATE') {
    handleGroqAI(message).then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
});

async function handleGroqAI({ apiKey, systemPrompt, userPrompt, raw }) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      let msg = errData.error?.message || `HTTP ${response.status}`;
      return { success: false, error: msg, status: response.status };
    }

    const data = await response.json();
    let text = (data.choices?.[0]?.message?.content || '').trim();
    if (raw) {
      return { success: true, text };
    }
    let sql = text.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    return { success: true, sql };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

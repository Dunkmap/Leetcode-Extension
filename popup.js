/**
 * SQL Master LeetCode Extension — Popup Script
 * Manages API key, captured questions list with solutions, and export (JSON + PDF).
 */
document.addEventListener('DOMContentLoaded', () => {
  initCreditSystem();
  loadApiKey();
  loadCapturedQuestions();

  document.getElementById('save-key-btn').addEventListener('click', saveApiKey);
  document.getElementById('clear-btn').addEventListener('click', clearQuestions);
  document.getElementById('export-json-btn').addEventListener('click', exportJSON);
  document.getElementById('export-pdf-btn').addEventListener('click', exportPDF);

  // AI Autofill info modal
  document.getElementById('ai-autofill-info-btn').addEventListener('click', () => {
    document.getElementById('ai-info-modal').classList.add('show');
  });
  document.getElementById('close-ai-modal').addEventListener('click', () => {
    document.getElementById('ai-info-modal').classList.remove('show');
  });
  document.getElementById('ai-info-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('show');
  });
});

/* ===== API Key ===== */
function loadApiKey() {
  chrome.storage.local.get({ groqApiKey: '' }, (data) => {
    if (data.groqApiKey) {
      document.getElementById('api-key-input').value = data.groqApiKey;
      showStatus('key-status', '✅ Key saved', 'success');
    }
  });
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) {
    showStatus('key-status', '❌ Enter a valid API key', 'error');
    return;
  }
  chrome.storage.local.set({ groqApiKey: key }, () => {
    showStatus('key-status', '✅ Key saved successfully', 'success');
  });
}

/* ===== Captured Questions ===== */
function loadCapturedQuestions() {
  chrome.storage.local.get({ capturedLeetCode: [] }, (data) => {
    const list = data.capturedLeetCode || [];
    renderQuestions(list);
    updateStats(list);
  });
}

function renderQuestions(list) {
  const container = document.getElementById('question-list');
  if (list.length === 0) {
    container.innerHTML = '<div class="q-empty">No questions captured yet.<br>Visit a LeetCode SQL problem to auto-capture.</div>';
    return;
  }

  container.innerHTML = list.map((q, i) => `
    <div class="q-wrapper">
      <div class="q-item" data-url="${q.url || '#'}">
        <div style="flex:1;min-width:0;">
          <div class="q-title">${escapeHtml(q.title || 'Untitled')}</div>
          ${q.categories && q.categories.length > 0 ? `
            <div class="q-cats">${q.categories.map(c => `<span class="q-cat">${escapeHtml(c)}</span>`).join('')}</div>
          ` : ''}
        </div>
        ${q.solution
          ? `<span class="q-solved-badge" data-toggle="sol-${i}">✅ Solution ▾</span>`
          : '<span class="q-no-sol">⬜ Unsolved</span>'}
      </div>
      ${q.solution && q.solution.code ? `
      <div class="q-solution-panel" id="sol-${i}">
        <div class="sol-block">
          <div class="sol-label">📝 Code ${q.solution.codeLang ? '(' + escapeHtml(q.solution.codeLang) + ')' : ''}</div>
          <pre class="sol-code">${escapeHtml(q.solution.code)}</pre>
        </div>
      </div>` : ''}
    </div>
  `).join('');

  // Click question title area to open LeetCode problem
  container.querySelectorAll('.q-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.q-solved-badge')) return; // Don't navigate on badge click
      const url = item.dataset.url;
      if (url && url !== '#') chrome.tabs.create({ url });
    });
  });

  // Toggle solution panels
  container.querySelectorAll('.q-solved-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      const panelId = badge.dataset.toggle;
      const panel = document.getElementById(panelId);
      if (panel) {
        const isShown = panel.classList.toggle('show');
        badge.textContent = isShown ? '✅ Solution ▴' : '✅ Solution ▾';
      }
    });
  });
}

function updateStats(list) {
  document.getElementById('stat-captured').textContent = list.length;

  // Count solved (has solution)
  const solvedCount = list.filter(q => q.solution).length;
  document.getElementById('stat-solved').textContent = solvedCount;

  // Today's captures
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = list.filter(q => q.timestamp && q.timestamp.startsWith(today)).length;
  document.getElementById('stat-today').textContent = todayCount;
}

function clearQuestions() {
  if (!confirm('Clear all captured questions? This cannot be undone.')) return;
  chrome.storage.local.set({ capturedLeetCode: [] }, () => {
    loadCapturedQuestions();
    showStatus('export-status', '🗑️ All questions cleared', 'success');
  });
}

/* ===== Export JSON ===== */
function exportJSON() {
  chrome.storage.local.get({ capturedLeetCode: [] }, (data) => {
    const list = data.capturedLeetCode || [];
    if (list.length === 0) {
      showStatus('export-status', '❌ No questions to export', 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetcode_captured_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('export-status', `✅ Exported ${list.length} questions as JSON`, 'success');
  });
}

/* ===== Export PDF (with Solutions) ===== */
function exportPDF() {
  chrome.storage.local.get({ capturedLeetCode: [] }, (data) => {
    const list = data.capturedLeetCode || [];
    if (list.length === 0) {
      showStatus('export-status', '❌ No questions to export', 'error');
      return;
    }

    const printHTML = buildPrintHTML(list);
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);

    const solvedCount = list.filter(q => q.solution).length;
    showStatus('export-status', `✅ PDF ready — ${list.length} questions, ${solvedCount} with solutions`, 'success');
  });
}

function buildPrintHTML(questions) {
  const now = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const solvedCount = questions.filter(q => q.solution).length;

  const rows = questions.map((q, i) => `
    <div class="question ${i > 0 ? 'page-break' : ''}">
      <div class="q-header">
        <span class="q-num">#${i + 1}</span>
        <h2 class="q-title">${escapeHtml(q.title || 'Untitled')}</h2>
        ${q.solution ? '<span class="solved-tag">✅ Solved</span>' : '<span class="unsolved-tag">⬜ Unsolved</span>'}
      </div>
      ${q.categories && q.categories.length > 0 ? `
        <div class="q-tags">${q.categories.map(c => `<span class="tag">${escapeHtml(c)}</span>`).join('')}</div>
      ` : ''}
      ${q.url ? `<div class="q-url"><a href="${escapeHtml(q.url)}">${escapeHtml(q.url)}</a></div>` : ''}
      ${q.question ? `
        <div class="section-label">📝 Problem Statement</div>
        <div class="q-body"><pre>${escapeHtml(q.question)}</pre></div>
      ` : ''}
      ${q.solution ? `
      <div class="solution-box">
        <div class="solution-heading">📝 Solution</div>
        <div class="sol-part">
          <h4>💡 Intuition</h4>
          <p>${escapeHtml(q.solution.intuition)}</p>
        </div>
        <div class="sol-part">
          <h4>📋 Approach</h4>
          <p>${escapeHtml(q.solution.approach)}</p>
        </div>
        <div class="complexity-row">
          <div class="complexity-card">
            <h4>⏱ Time Complexity</h4>
            <p class="complexity-val">${escapeHtml(q.solution.timeComplexity)}</p>
          </div>
          <div class="complexity-card">
            <h4>💾 Space Complexity</h4>
            <p class="complexity-val">${escapeHtml(q.solution.spaceComplexity)}</p>
          </div>
        </div>
        ${q.solution.code ? `
        <div class="sol-part">
          <h4>📝 Code ${q.solution.codeLang ? '(' + escapeHtml(q.solution.codeLang) + ')' : ''}</h4>
          <pre class="code-block">${escapeHtml(q.solution.code)}</pre>
        </div>` : ''}
        ${q.solution.generatedAt ? `<div class="sol-date">Generated: ${new Date(q.solution.generatedAt).toLocaleString()}</div>` : ''}
      </div>
      ` : ''}
      ${q.timestamp ? `<div class="q-date">Captured: ${new Date(q.timestamp).toLocaleString()}</div>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LeetCode Questions & Solutions — SQL Master</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'JetBrains Mono', monospace; color: #1a202c; padding: 40px; line-height: 1.6; }

    /* Cover */
    .cover { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid #eae1d7; }
    .cover h1 { font-size: 1.8rem; color: #b86a7c; margin-bottom: 8px; }
    .cover .meta { font-size: 0.8rem; color: #718096; font-weight: 600; }
    .cover .stats-summary {
      display: inline-flex; gap: 24px; margin-top: 14px; padding: 10px 28px;
      background: #f8f4ef; border: 1.5px solid #eae1d7; border-radius: 12px;
    }
    .cover .stats-summary span { font-size: 0.75rem; font-weight: 800; color: #32475b; }
    .cover .stats-summary strong { color: #b86a7c; }

    /* Question Block */
    .question { margin-bottom: 36px; padding-bottom: 28px; border-bottom: 1.5px dashed #eae1d7; }
    .q-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
    .q-num { color: #b86a7c; font-weight: 800; font-size: 0.85rem; }
    .q-title { font-size: 1.1rem; font-weight: 800; color: #2c3e50; flex: 1; }
    .solved-tag { font-size: 0.65rem; padding: 3px 10px; background: #dcfce7; color: #15803d; border-radius: 10px; font-weight: 700; }
    .unsolved-tag { font-size: 0.65rem; padding: 3px 10px; background: #f1f5f9; color: #94a3b8; border-radius: 10px; font-weight: 700; }
    .q-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .tag { font-size: 0.65rem; padding: 3px 10px; background: #fbe6dd; color: #b86a7c; border-radius: 10px; font-weight: 700; }
    .q-url { font-size: 0.7rem; margin-bottom: 12px; }
    .q-url a { color: #3b82f6; text-decoration: none; }

    .section-label { font-size: 0.72rem; font-weight: 800; color: #718096; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; margin-top: 14px; }

    .q-body { background: #f8f4ef; border: 1px solid #eae1d7; border-radius: 10px; padding: 18px; margin-bottom: 8px; }
    .q-body pre { white-space: pre-wrap; word-wrap: break-word; font-size: 0.82rem; font-family: inherit; line-height: 1.7; }
    .q-date { font-size: 0.65rem; color: #a0aec0; font-weight: 600; margin-top: 8px; }

    /* Solution Box */
    .solution-box {
      margin-top: 18px; padding: 22px; background: #fefdfb;
      border: 2px solid #c0ebd0; border-radius: 14px;
    }
    .solution-heading {
      font-size: 0.9rem; font-weight: 900; color: #15803d;
      margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1.5px solid #dcfce7;
    }
    .sol-part { margin-bottom: 16px; }
    .sol-part h4 { font-size: 0.8rem; font-weight: 800; color: #b86a7c; margin-bottom: 6px; }
    .sol-part p { font-size: 0.82rem; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word; }

    .complexity-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .complexity-card {
      flex: 1; padding: 14px; background: #f0fdf4; border: 1.5px solid #bbf7d0;
      border-radius: 10px; text-align: center;
    }
    .complexity-card h4 { font-size: 0.7rem; font-weight: 800; color: #15803d; margin-bottom: 6px; }
    .complexity-val { font-size: 0.9rem; font-weight: 900; color: #166534; }

    .code-block {
      background: #1e293b; color: #e2e8f0; padding: 18px;
      border-radius: 10px; font-size: 0.78rem; line-height: 1.7;
      white-space: pre-wrap; word-wrap: break-word; overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
    }

    .sol-date { font-size: 0.6rem; color: #a0aec0; font-weight: 600; margin-top: 10px; text-align: right; }

    .page-break { page-break-before: auto; }
    @media print {
      body { padding: 20px; }
      .question { page-break-inside: avoid; }
      .solution-box { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>⚡ LeetCode Questions & Solutions</h1>
    <div class="meta">Captured by SQL Master • ${escapeHtml(now)}</div>
    <div class="stats-summary">
      <span><strong>${questions.length}</strong> Questions</span>
      <span><strong>${solvedCount}</strong> Solved</span>
    </div>
  </div>
  ${rows}
</body>
</html>`;
}

/* ===== Helpers ===== */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showStatus(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = 'status ' + type;
  setTimeout(() => { el.className = 'status'; }, 4000);
}

/* ===== Credit System ===== */
const CREDIT_DEFAULTS = {
  credits: 0,
  streak: 0,
  lastLoginDate: null,
  isFirstInstall: true
};

function initCreditSystem() {
  chrome.storage.local.get(CREDIT_DEFAULTS, (data) => {
    // First-time install — give 5 welcome credits
    if (data.isFirstInstall) {
      data.credits = 5;
      data.isFirstInstall = false;
      chrome.storage.local.set({ credits: 5, isFirstInstall: false });
    }

    // Daily streak logic
    const today = new Date().toISOString().slice(0, 10);
    const lastLogin = data.lastLoginDate;

    if (lastLogin !== today) {
      // Check if yesterday — streak continues
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      if (lastLogin === yesterday) {
        // Streak continues! Award 1 credit
        data.streak += 1;
        data.credits += 1;
      } else if (lastLogin === null) {
        // Brand new user, first open
        data.streak = 1;
      } else {
        // Streak broken — reset to 1
        data.streak = 1;
      }

      // Random surprise bonus (20% chance for 2 extra credits)
      let bonusAwarded = false;
      if (Math.random() < 0.2) {
        data.credits += 2;
        bonusAwarded = true;
      }

      // Save updated data
      chrome.storage.local.set({
        credits: data.credits,
        streak: data.streak,
        lastLoginDate: today
      }, () => {
        updateCreditUI(data.credits, data.streak);

        // Show streak notification
        if (lastLogin === yesterday) {
          showStatus('key-status', `🔥 Streak day ${data.streak}! +1 credit earned`, 'success');
        }

        // Show bonus notification after a delay
        if (bonusAwarded) {
          setTimeout(() => {
            showStatus('key-status', '🎉 Surprise! You earned 2 bonus credits!', 'success');
          }, lastLogin === yesterday ? 2500 : 500);
        }
      });
    } else {
      // Already logged in today, just update UI
      updateCreditUI(data.credits, data.streak);
    }
  });
}

function updateCreditUI(credits, streak) {
  const creditCountEl = document.getElementById('credit-count');
  const creditBadgeEl = document.getElementById('credit-badge');
  const streakCountEl = document.getElementById('streak-count');

  if (creditCountEl) creditCountEl.textContent = credits;
  if (streakCountEl) streakCountEl.textContent = streak;

  // Turn badge red when credits are low
  if (creditBadgeEl) {
    if (credits <= 2) {
      creditBadgeEl.classList.add('low');
    } else {
      creditBadgeEl.classList.remove('low');
    }
  }
}

/**
 * Call this before allowing an AI Autofill.
 * Returns true if the user has credits, false if they don't.
 * Deducts 1 credit on success.
 */
function useCredit(callback) {
  chrome.storage.local.get({ credits: 0, streak: 0 }, (data) => {
    if (data.credits <= 0) {
      callback(false);
      return;
    }
    const newCredits = data.credits - 1;
    chrome.storage.local.set({ credits: newCredits }, () => {
      updateCreditUI(newCredits, data.streak);
      callback(true);
    });
  });
}


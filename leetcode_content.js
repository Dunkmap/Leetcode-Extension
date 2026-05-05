/**
 * 🚀 SQL Master: GLOBAL LEETCODE INJECTOR
 * This script runs everywhere on leetcode.com but only captures in /problems/.
 * Force-Capture: ALT + Q
 */

(function() {
  console.log('🚀 SQL MASTER INJECTOR: LOADED (WAITING FOR CONTENT...)');

  let lastCapturedUrl = '';
  let captureTimeout = null;

  // Watch for the page to finish building (SPA and dynamic content)
  const observer = new MutationObserver(() => {
    injectSolutionAIButton();

    if (location.href.includes('/problems/') && location.href !== lastCapturedUrl) {
        const isTabSpecific = location.href.includes('/solutions/') || location.href.includes('/submissions/');
        if (!isTabSpecific) {
           clearTimeout(captureTimeout);
           captureTimeout = setTimeout(captureLeetCodeQuestion, 5000); 
        }
    }
  });

  // Start observing once body exists
  const startObserver = () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      if (location.href.includes('/problems/')) {
        setTimeout(captureLeetCodeQuestion, 5000);
      }
    } else {
      setTimeout(startObserver, 100);
    }
  };
  startObserver();

  // Manual Force-Capture (ALT + Q)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyQ') {
      console.log('⚡ SQL Master: Force Scan Initiated!');
      captureLeetCodeQuestion(true);
    }
  });

  // --- Glass-Piercing Search ---
  function deepQuerySelector(selector, root = document) {
    let el = root.querySelector(selector);
    if (el) return el;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()) {
      if (node.shadowRoot) {
        el = deepQuerySelector(selector, node.shadowRoot);
        if (el) return el;
      }
    }
    return null;
  }

  async function captureLeetCodeQuestion(isForce = false) {
    if (!isForce && location.href === lastCapturedUrl) return;

    try {
      console.log('🔍 SQL Master: Deep-Scanning...');

      let titleEl = deepQuerySelector('[data-cy="question-title"]') || 
                    deepQuerySelector('.text-title-large') ||
                    document.querySelector('h4');

      let contentEl = deepQuerySelector('[data-track-load="description_content"]') ||
                      deepQuerySelector('[data-cy="question-content"]') || 
                      deepQuerySelector('.question-content__JfgR') || 
                      document.querySelector('.d_description');

      // 2. Structural Search (Title) - deepest match
      if (!titleEl) {
        const titleMatches = Array.from(document.querySelectorAll('div, a, span, h4')).filter(el => {
          const t = el.innerText || el.textContent || '';
          return /^\d+\.\s+/.test(t.trim()) && t.trim().length < 150;
        });
        if (titleMatches.length > 0) titleEl = titleMatches.pop(); // Deepest nested element with the title
      }

      // 3. Structural Search (Body) - deepest container holding the SQL problem markers
      if (!contentEl) {
        const contentMatches = Array.from(document.querySelectorAll('div, section')).filter(el => {
          const t = el.innerText || el.textContent || '';
          return t.includes('Table:') && t.length > 100 && t.length < 5000;
        });
        if (contentMatches.length > 0) contentEl = contentMatches.pop(); // Deepest container holding the 'Table:' keyword
      }

      if (!titleEl || !contentEl) {
        if (isForce) console.error('❌ SQL Master: Points not found. Scan failed.');
        return;
      }

      // ❗ CRUCIAL: Use innerText to preserve actual visible line-breaks, needed for parser regex!
      const title = (titleEl.innerText || titleEl.textContent).trim();
      const body = (contentEl.innerText || contentEl.textContent).trim();
      const url = window.location.href;

      // SQL Validation
      const isSql = location.href.includes('database') || 
                    body.includes('Table:') || 
                    body.toLowerCase().includes('result table');

      if (!isSql && !isForce) return;

      console.log('✨ SQL Master: Found problem:', title);

      // Analyze
      let cats = [];
      if (typeof SQL_CLAUSE_TAXONOMY !== 'undefined' && typeof detectIntentClauses === 'function') {
        const result = detectIntentClauses(body, '');
        const catSet = new Set();
        result.primary.forEach(c => {
          for (const [k, v] of Object.entries(SQL_CLAUSE_TAXONOMY)) {
            if (v.clauses.includes(c)) catSet.add(v.label);
          }
        });
        cats = Array.from(catSet);
      }

      // Store
      chrome.storage.local.get({ capturedLeetCode: [] }, (res) => {
        let list = res.capturedLeetCode;
        if (list.some(q => q.title === title)) {
          lastCapturedUrl = location.href;
          return;
        }

        const entry = {
          id: 'lc_' + Date.now(),
          source: 'LeetCode',
          title: title,
          question: body,
          url: url,
          categories: cats,
          timestamp: new Date().toISOString()
        };

        list.unshift(entry);

        chrome.storage.local.set({ capturedLeetCode: list.slice(0, 50) }, () => {
          lastCapturedUrl = location.href;
          console.log('📦 SQL Master: Captured & Securely Stored!');
          const toast = showCaptureToast(title, cats);
          // 🤖 Auto-solve immediately after capture
          autoSolveQuestion(entry.id, title, body, toast);
        });
      });

    } catch (e) {
      console.error('⚠️ SQL Master Error:', e);
    }
  }

  function showCaptureToast(title, cats) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 24px; right: 24px; padding: 22px 34px;
      background: rgba(255, 255, 255, 0.82); backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%); border: 1px solid rgba(184, 106, 124, 0.4);
      border-radius: 30px; box-shadow: 0 25px 60px rgba(0,0,0,0.15);
      z-index: 10000000; font-family: 'JetBrains Mono', monospace;
      animation: sqlIn 0.8s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      display: flex; flex-direction: column; gap: 4px; max-width: 350px;
    `;

    toast.innerHTML = `
      <div style="font-size: 0.6rem; font-weight: 800; color: #b86a7c; letter-spacing: 2px;">⚡ SECURED (ALT+Q READY)</div>
      <div style="font-size: 1rem; font-weight: 800; color: #1a202c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.5px;">${title}</div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
        ${cats.map(c => `<span style="font-size: 0.6rem; padding: 6px 14px; background: rgba(184,106,124,0.1); color: #b86a7c; border-radius: 14px; font-weight: 800;">${c}</span>`).join('')}
      </div>
      <div id="sql-solve-status" style="font-size: 0.6rem; font-weight: 800; color: #667eea; letter-spacing: 1px; margin-top: 8px; display: flex; align-items: center; gap: 6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#667eea; animation: solvePulse 1s infinite;"></span>
        🤖 AI Solving...
      </div>
    `;

    if (!document.getElementById('sql-style')) {
      const s = document.createElement('style'); s.id = 'sql-style';
      s.innerHTML = `
        @keyframes sqlIn { from { transform: translate(140%, 0); opacity: 0; } to { transform: translate(0, 0); opacity: 1; } }
        @keyframes solvePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(toast);
    // Don't auto-dismiss yet — let autoSolveQuestion handle dismissal after completion
    return toast;
  }

  function dismissToast(toast, delay = 5000) {
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px) scale(0.95)';
        toast.style.transition = 'all 0.6s ease';
        setTimeout(() => toast.remove(), 700);
      }
    }, delay);
  }

  // --- Auto-Solve: Send captured question to Groq AI immediately ---
  async function autoSolveQuestion(questionId, title, questionBody, toast) {
    try {
      const { groqApiKey } = await new Promise(resolve =>
        chrome.storage.local.get({ groqApiKey: '' }, resolve)
      );

      if (!groqApiKey) {
        console.log('⚠️ SQL Master: No API key — skipping auto-solve. Set key in popup.');
        updateToastStatus(toast, '⚠️ No API key — set in popup', '#e53e3e');
        dismissToast(toast, 4000);
        return;
      }

      console.log('🤖 SQL Master: Auto-solving "' + title + '"...');

      const systemPrompt = `You are an expert LeetCode problem solver and technical writer.
Given a problem statement, generate a complete solution with the following sections:

1. Intuition — A clear, concise explanation of your first thoughts on how to solve this problem.
2. Approach — A step-by-step description of the approach.
3. Code — The complete solution code.
4. Complexity — Time and Space complexity analysis.

Return your response using EXACTLY this format with XML tags:
<INTUITION>
Your intuition explanation here
</INTUITION>
<APPROACH>
Your approach explanation here (numbered steps)
</APPROACH>
<CODE_LANG>mysql</CODE_LANG>
<CODE>
Your complete solution code here
</CODE>
<TIME_COMPLEXITY>$$O(...)$$</TIME_COMPLEXITY>
<SPACE_COMPLEXITY>$$O(...)$$</SPACE_COMPLEXITY>

IMPORTANT:
- Detect the language from the problem context (SQL, Python, etc.) and set CODE_LANG accordingly
- Write clean, optimized code
- Keep explanations clear and concise
- Use $$ delimiters for complexity notation`;

      const userPrompt = `Problem: ${title}\n\n${questionBody}`;

      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          type: 'GROQ_AI_GENERATE',
          apiKey: groqApiKey,
          systemPrompt,
          userPrompt,
          raw: true
        }, resolve);
      });

      if (!response || !response.success) {
        console.warn('⚠️ SQL Master: Auto-solve failed:', response?.error);
        updateToastStatus(toast, '❌ AI Error: ' + (response?.error || 'Unknown'), '#e53e3e');
        dismissToast(toast, 5000);
        return;
      }

      const aiText = response.text;
      const intuitionMatch = aiText.match(/<INTUITION>([\s\S]*?)<\/INTUITION>/i);
      const approachMatch = aiText.match(/<APPROACH>([\s\S]*?)<\/APPROACH>/i);
      const codeMatch = aiText.match(/<CODE>([\s\S]*?)<\/CODE>/i);
      const codeLangMatch = aiText.match(/<CODE_LANG>([\s\S]*?)<\/CODE_LANG>/i);
      const timeMatch = aiText.match(/<TIME_COMPLEXITY>([\s\S]*?)<\/TIME_COMPLEXITY>/i);
      const spaceMatch = aiText.match(/<SPACE_COMPLEXITY>([\s\S]*?)<\/SPACE_COMPLEXITY>/i);

      if (!intuitionMatch || !approachMatch) {
        console.warn('⚠️ SQL Master: Could not parse auto-solve response');
        updateToastStatus(toast, '⚠️ Parse error — check console', '#e53e3e');
        dismissToast(toast, 5000);
        return;
      }

      const solutionData = {
        title: title,
        intuition: intuitionMatch[1].trim(),
        approach: approachMatch[1].trim(),
        code: codeMatch ? codeMatch[1].trim() : '',
        codeLang: codeLangMatch ? codeLangMatch[1].trim() : 'sql',
        timeComplexity: timeMatch ? timeMatch[1].trim() : '$$O(n)$$',
        spaceComplexity: spaceMatch ? spaceMatch[1].trim() : '$$O(n)$$',
        generatedAt: new Date().toISOString()
      };

      // Save solution to the captured question
      chrome.storage.local.get({ capturedLeetCode: [] }, (res) => {
        let list = res.capturedLeetCode;
        const match = list.find(q => q.id === questionId);
        if (match) {
          match.solution = solutionData;
          chrome.storage.local.set({ capturedLeetCode: list }, () => {
            console.log('✅ SQL Master: Auto-solved "' + title + '"!');
            updateToastStatus(toast, '✅ Solved! View in popup.', '#15803d');
            dismissToast(toast, 5000);
          });
        }
      });

    } catch (e) {
      console.error('⚠️ SQL Master: Auto-solve error:', e);
      updateToastStatus(toast, '❌ Error: ' + e.message, '#e53e3e');
      dismissToast(toast, 5000);
    }
  }

  function updateToastStatus(toast, message, color) {
    if (!toast || !document.body.contains(toast)) return;
    const statusEl = toast.querySelector('#sql-solve-status');
    if (statusEl) {
      statusEl.innerHTML = message;
      statusEl.style.color = color;
    }
  }

  // --- AI Auto Fill for Solutions ---
  function injectSolutionAIButton() {
    const isSolutionPage = window.location.href.includes('/solutions/new') || 
                           window.location.href.includes('/solutions/edit');

    const titleInput = document.querySelector('input[placeholder="Enter your title"]');
    
    // Only proceed if we are genuinely on a solution page or have the title input
    if (!isSolutionPage && !titleInput) return;

    // Check if injected
    if (document.getElementById('sql-master-ai-autofill')) return;

    // Find Post button container
    const buttons = Array.from(document.querySelectorAll('button'));
    const postBtn = buttons.find(b => b.innerText && b.innerText.includes('Post'));
    if (!postBtn) return;

    const btnContainer = postBtn.parentElement;

    const aiBtn = document.createElement('button');
    aiBtn.id = 'sql-master-ai-autofill';
    aiBtn.innerHTML = '✨ AI Auto Fill';
    aiBtn.style.cssText = `
      background: linear-gradient(135deg, #FF6B6B, #9B59B6);
      color: white; border: none; padding: 6px 16px; border-radius: 6px;
      font-weight: 600; cursor: pointer; display: flex; align-items: center;
      gap: 6px; margin-right: 12px; font-family: inherit; font-size: 14px;
      transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(155, 89, 182, 0.3);
    `;
    
    aiBtn.onmouseenter = () => aiBtn.style.transform = 'translateY(-1px) scale(1.02)';
    aiBtn.onmouseleave = () => aiBtn.style.transform = 'translateY(0) scale(1)';

    aiBtn.onclick = async (e) => {
      e.preventDefault();
      await executeAIAutoFill(aiBtn);
    };

    btnContainer.insertBefore(aiBtn, postBtn);
  }

  async function executeAIAutoFill(aiBtn) {
    aiBtn.innerHTML = '⏳ Reading code...';
    aiBtn.style.opacity = '0.7';
    aiBtn.style.pointerEvents = 'none';

    try {
      // ─── STEP 1: Ask the MAIN world bridge to extract code from Monaco ───
      const extractedData = await new Promise((resolve) => {
        const handler = (e) => {
          document.removeEventListener('sql-master-extract-response', handler);
          try { resolve(JSON.parse(e.detail)); } catch(err) { resolve({ error: 'Parse error' }); }
        };
        document.addEventListener('sql-master-extract-response', handler);
        document.dispatchEvent(new CustomEvent('sql-master-extract-request'));

        // Timeout fallback after 3s
        setTimeout(() => {
          document.removeEventListener('sql-master-extract-response', handler);
          resolve({ error: 'Bridge timeout — main world script may not be loaded' });
        }, 3000);
      });

      if (extractedData.error) {
        console.warn('⚠️ Monaco extraction failed:', extractedData.error);
      }

      let userCode = extractedData.userCode || '';
      let codeLang = extractedData.lang || '';

      // ─── Fallback: DOM-based code extraction ───
      if (!userCode || userCode.length < 10) {
        console.log('📋 Falling back to DOM-based code extraction...');
        const linesContainers = document.querySelectorAll('.view-lines');
        
        // First pass: find markdown editor and extract # Code block
        for (const container of linesContainers) {
          const text = Array.from(container.querySelectorAll('.view-line'))
                            .map(e => e.textContent.replace(/\u00a0/g, ' '))
                            .join('\n');

          if (text.includes('# Intuition') || text.includes('# Code')) {
            // Extract code between ```lang []\nCODE\n```
            const codeMatch = text.match(/# Code\s*\n+```(\w*)\s*(?:\[\])?\s*\n([\s\S]*?)(?:\n```|$)/i);
            if (codeMatch && codeMatch[2]) {
              userCode = codeMatch[2].trim();
              codeLang = codeMatch[1] || '';
            }
            if (userCode && userCode.length >= 10) break;
          }
        }

        // Second pass: any non-markdown editor content
        if (!userCode || userCode.length < 10) {
          for (const container of linesContainers) {
            const text = Array.from(container.querySelectorAll('.view-line'))
                              .map(e => e.textContent.replace(/\u00a0/g, ' '))
                              .join('\n');
            if (text.length > 10 && !text.includes('# Intuition') && !text.includes('# Approach')) {
              userCode = text;
              break;
            }
          }
        }
      }

      if (!userCode || userCode.trim().length < 5) {
        alert("⚠️ Could not find any code in the editor.\nPlease write your solution in the Code section first.");
        resetBtn(aiBtn);
        return;
      }

      console.log('✅ Extracted code (' + userCode.length + ' chars, lang: ' + codeLang + ')');

      // ─── STEP 2: Determine problem context ───
      const problemTitle = document.title.split('-')[0].trim() || 
                          window.location.pathname.split('/')[2]?.replace(/-/g, ' ') || 
                          'Unknown Problem';

      // ─── STEP 3: Check API key ───
      const { groqApiKey } = await chrome.storage.local.get({ groqApiKey: '' });
      if (!groqApiKey) {
        alert("SQL Master: Groq API Key not set!\nPlease open the extension popup and configure it.");
        resetBtn(aiBtn);
        return;
      }

      aiBtn.innerHTML = '🤖 Generating...';

      // ─── STEP 4: AI Request — generate Intuition, Approach, Complexity ───
      const systemPrompt = `You are an expert LeetCode problem solver and technical writer.
Given a problem title and the user's solution code, generate ONLY the following sections:

1. Intuition — A clear, concise explanation of the first thoughts on how to solve this problem.
2. Approach — A step-by-step description of the approach taken in the code.
3. Complexity — Time and Space complexity analysis.
4. Title — A catchy, descriptive title for this solution.

Return your response using EXACTLY this format with XML tags:
<TITLE>A catchy, descriptive solution title</TITLE>
<INTUITION>
Your intuition explanation here (plain text, can use markdown formatting)
</INTUITION>
<APPROACH>
Your approach explanation here (plain text, can use markdown formatting, numbered steps)
</APPROACH>
<TIME_COMPLEXITY>$$O(...)$$</TIME_COMPLEXITY>
<SPACE_COMPLEXITY>$$O(...)$$</SPACE_COMPLEXITY>

IMPORTANT:
- Do NOT include any code in your response
- Do NOT wrap your response in markdown code fences
- Keep explanations clear and concise
- Use $$ delimiters for complexity notation`;

      const userPrompt = `Problem: ${problemTitle}\n\nUser's Solution Code (${codeLang || 'unknown'}):\n\`\`\`\n${userCode}\n\`\`\``;

      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          type: 'GROQ_AI_GENERATE',
          apiKey: groqApiKey,
          systemPrompt,
          userPrompt,
          raw: true
        }, resolve);
      });

      if (!response || !response.success) {
        console.error("AI Error:", response?.error);
        alert("AI Generation failed: " + (response?.error || 'Unknown error'));
        resetBtn(aiBtn);
        return;
      }

      // ─── STEP 5: Parse AI response ───
      const aiText = response.text;
      console.log('🤖 AI Response received (' + aiText.length + ' chars)');

      const titleMatch = aiText.match(/<TITLE>([\s\S]*?)<\/TITLE>/i);
      const intuitionMatch = aiText.match(/<INTUITION>([\s\S]*?)<\/INTUITION>/i);
      const approachMatch = aiText.match(/<APPROACH>([\s\S]*?)<\/APPROACH>/i);
      const timeMatch = aiText.match(/<TIME_COMPLEXITY>([\s\S]*?)<\/TIME_COMPLEXITY>/i);
      const spaceMatch = aiText.match(/<SPACE_COMPLEXITY>([\s\S]*?)<\/SPACE_COMPLEXITY>/i);

      if (!intuitionMatch || !approachMatch) {
        console.error("Failed to parse AI tags. Raw:", aiText);
        alert("Could not parse AI response. Copied to clipboard.\nCheck console for raw output.");
        try { await navigator.clipboard.writeText(aiText); } catch(e) {}
        resetBtn(aiBtn);
        return;
      }

      const aiTitle = titleMatch ? titleMatch[1].trim() : problemTitle;
      const intuition = intuitionMatch[1].trim();
      const approach = approachMatch[1].trim();
      const timeComplexity = timeMatch ? timeMatch[1].trim() : '$$O(n)$$';
      const spaceComplexity = spaceMatch ? spaceMatch[1].trim() : '$$O(n)$$';

      // ─── STEP 6: Build the full markdown preserving original code ───
      const langTag = codeLang || '';
      const finalMarkdown = `# Intuition\n${intuition}\n\n# Approach\n${approach}\n\n# Complexity\n- Time complexity:\n${timeComplexity}\n\n- Space complexity:\n${spaceComplexity}\n\n# Code\n\`\`\`${langTag} []\n${userCode}\n\`\`\``;

      // ─── STEP 7: Send data to the MAIN world bridge for injection ───
      aiBtn.innerHTML = '📝 Filling...';

      const injectResult = await new Promise((resolve) => {
        const handler = (e) => {
          document.removeEventListener('sql-master-inject-response', handler);
          try { resolve(JSON.parse(e.detail)); } catch(err) { resolve({ success: false, error: 'Parse error' }); }
        };
        document.addEventListener('sql-master-inject-response', handler);
        
        document.dispatchEvent(new CustomEvent('sql-master-inject-request', {
          detail: JSON.stringify({ title: aiTitle, markdown: finalMarkdown })
        }));

        // Timeout
        setTimeout(() => {
          document.removeEventListener('sql-master-inject-response', handler);
          resolve({ success: false, error: 'Inject timeout' });
        }, 3000);
      });

      if (!injectResult.success) {
        console.warn('⚠️ Monaco injection failed:', injectResult.error);
        alert("Could not inject into editor. Solution copied to clipboard!\nError: " + injectResult.error);
        try { await navigator.clipboard.writeText(finalMarkdown); } catch(e) {}
        resetBtn(aiBtn);
        return;
      }

      console.log('✅ AI Auto Fill complete!');
      resetBtn(aiBtn, '✅ Done!');
      setTimeout(() => resetBtn(aiBtn), 3000);

      // ─── STEP 8: Save solution alongside the captured question ───
      const currentSlug = window.location.pathname.split('/problems/')[1]?.split('/')[0];
      if (currentSlug) {
        chrome.storage.local.get({ capturedLeetCode: [] }, (res) => {
          let list = res.capturedLeetCode;
          const solutionData = {
            title: aiTitle,
            intuition,
            approach,
            timeComplexity,
            spaceComplexity,
            code: userCode,
            codeLang: codeLang || '',
            generatedAt: new Date().toISOString()
          };

          const match = list.find(q => {
            if (!q.url) return false;
            try { return new URL(q.url).pathname.includes(currentSlug); }
            catch { return false; }
          });

          if (match) {
            match.solution = solutionData;
          } else {
            // No matching capture — create a new entry with both question + solution
            list.unshift({
              id: 'lc_' + Date.now(),
              source: 'LeetCode',
              title: problemTitle,
              question: '',
              url: window.location.href.split('/solutions')[0],
              categories: [],
              timestamp: new Date().toISOString(),
              solution: solutionData
            });
          }

          chrome.storage.local.set({ capturedLeetCode: list.slice(0, 50) }, () => {
            console.log('📦 SQL Master: Solution saved alongside captured question!');
          });
        });
      }

    } catch (e) {
      console.error('AI AutoFill Error:', e);
      alert("An error occurred: " + e.message);
      resetBtn(aiBtn);
    }
  }

  function resetBtn(btn, text="✨ AI Auto Fill") {
    btn.innerHTML = text;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'all';
  }

})();

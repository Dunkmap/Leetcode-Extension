/**
 * 🌐 SQL Master: MAIN WORLD BRIDGE
 * This script runs in the MAIN world (page context) so it can access window.monaco.
 * It listens for custom DOM events from the content script (isolated world).
 */

(function() {
  console.log('🌐 SQL Master: Main-world bridge loaded');

  // ─── EXTRACT: Read code from Monaco models ───
  document.addEventListener('sql-master-extract-request', () => {
    try {
      const monaco = window.monaco;
      if (!monaco || !monaco.editor) {
        document.dispatchEvent(new CustomEvent('sql-master-extract-response', {
          detail: JSON.stringify({ error: 'Monaco editor not found on window.monaco' })
        }));
        return;
      }

      const models = monaco.editor.getModels();
      let mdModel = null;
      let mdScore = -1;
      let codeModel = null;

      models.forEach(m => {
        const val = m.getValue();
        let score = 0;
        if (val.includes('# Intuition')) score += 10;
        if (val.includes('# Approach')) score += 5;
        if (val.includes('# Complexity')) score += 5;
        if (val.includes('# Code')) score += 5;
        if (m.getLanguageId() === 'markdown') score += 20;
        if (score > mdScore) { mdScore = score; mdModel = m; }

        // Also find the main code editor (non-markdown)
        if (m.getLanguageId() !== 'markdown' && val.length > 10 && !val.includes('# Intuition')) {
          if (!codeModel || val.length > codeModel.getValue().length) {
            codeModel = m;
          }
        }
      });

      let userCode = '';
      let lang = '';
      let fullMarkdown = '';

      // Priority 1: Extract code from the # Code block in the markdown model
      if (mdModel && mdScore > 0) {
        fullMarkdown = mdModel.getValue();
        // Match: # Code\n```lang []\nCODE\n```
        const codeBlockMatch = fullMarkdown.match(/# Code[\s\S]*?\n```(\w*)[\s]*(?:\[\])?\n([\s\S]*?)\n```/i);
        if (codeBlockMatch) {
          lang = codeBlockMatch[1] || '';
          userCode = codeBlockMatch[2].trim();
        }
      }

      // Priority 2: If no code found in markdown, use the standalone code editor
      if ((!userCode || userCode.length < 10) && codeModel) {
        userCode = codeModel.getValue().trim();
        lang = codeModel.getLanguageId() || '';
      }

      document.dispatchEvent(new CustomEvent('sql-master-extract-response', {
        detail: JSON.stringify({ userCode, lang, fullMarkdown, hasMdModel: !!(mdModel && mdScore > 0) })
      }));

    } catch(e) {
      document.dispatchEvent(new CustomEvent('sql-master-extract-response', {
        detail: JSON.stringify({ error: e.message })
      }));
    }
  });

  // ─── INJECT: Write data into Monaco + Title input ───
  document.addEventListener('sql-master-inject-request', (evt) => {
    try {
      const data = JSON.parse(evt.detail);
      const { title, markdown } = data;

      // 1. Set the title input (React-compatible native setter)
      const titleInput = document.querySelector('input[placeholder="Enter your title"]');
      if (titleInput && title) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeSetter.call(titleInput, title);
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 2. Set the Monaco markdown model
      const monaco = window.monaco;
      if (!monaco || !monaco.editor) {
        document.dispatchEvent(new CustomEvent('sql-master-inject-response', {
          detail: JSON.stringify({ success: false, error: 'Monaco not found' })
        }));
        return;
      }

      const models = monaco.editor.getModels();
      let bestModel = null;
      let highestScore = -1;

      models.forEach(m => {
        const val = m.getValue();
        let score = 0;
        if (val.includes('# Intuition')) score += 10;
        if (val.includes('# Approach')) score += 5;
        if (val.includes('# Complexity')) score += 5;
        if (val.includes('# Code')) score += 5;
        if (m.getLanguageId() === 'markdown') score += 20;
        if (score > highestScore) { highestScore = score; bestModel = m; }
      });

      if (bestModel && highestScore > 0) {
        bestModel.setValue(markdown);
        document.dispatchEvent(new CustomEvent('sql-master-inject-response', {
          detail: JSON.stringify({ success: true })
        }));
      } else {
        document.dispatchEvent(new CustomEvent('sql-master-inject-response', {
          detail: JSON.stringify({ success: false, error: 'No markdown model found (score: ' + highestScore + ', models: ' + models.length + ')' })
        }));
      }

    } catch(e) {
      document.dispatchEvent(new CustomEvent('sql-master-inject-response', {
        detail: JSON.stringify({ success: false, error: e.message })
      }));
    }
  });

})();

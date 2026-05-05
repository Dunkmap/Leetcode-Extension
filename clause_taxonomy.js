/**
 * SQL Clause Taxonomy Engine
 * Complete clause classification, detection, and suggestion system.
 * 
 * Supports 10 categories with 60+ clauses for comprehensive coverage.
 */

const SQL_CLAUSE_TAXONOMY = {
  // ===== 1. Core Query Clauses =====
  core: {
    label: '📌 Core Query',
    description: 'The backbone of every SQL query',
    clauses: ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT']
  },

  // ===== 2. Filtering & Projection =====
  filtering: {
    label: '🔍 Filtering & Projection',
    description: 'Narrow down and shape your results',
    clauses: ['DISTINCT', 'ALL', 'AS', 'IN', 'NOT IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL', 'EXISTS', 'NOT EXISTS']
  },

  // ===== 3. Join Clauses =====
  joins: {
    label: '🔗 Joins',
    description: 'Relational logic between tables',
    clauses: ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'SELF JOIN', 'ON', 'USING']
  },

  // ===== 4. Aggregation & Window =====
  aggregation: {
    label: '📊 Aggregation & Window',
    description: 'Summarize and analyze data patterns',
    clauses: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'OVER', 'PARTITION BY', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'NTILE', 'PERCENT_RANK']
  },

  // ===== 5. Subquery & CTE =====
  subquery: {
    label: '🧩 Subquery & CTE',
    description: 'Nested queries and common table expressions',
    clauses: ['WITH', 'WITH RECURSIVE', 'Subquery', 'Correlated Subquery', 'IN Subquery']
  },

  // ===== 6. Set Operations =====
  sets: {
    label: '🔄 Set Operations',
    description: 'Combine results from multiple queries',
    clauses: ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT']
  },

  // ===== 7. DDL (Data Definition) =====
  ddl: {
    label: '🏗️ DDL',
    description: 'Define and modify database structure',
    clauses: ['CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE', 'CREATE VIEW', 'CREATE INDEX']
  },

  // ===== 8. DML (Data Manipulation) =====
  dml: {
    label: '✏️ DML',
    description: 'Insert, update, and delete data',
    clauses: ['INSERT', 'UPDATE', 'DELETE']
  },

  // ===== 9. Constraints & Keys =====
  constraints: {
    label: '🔐 Constraints',
    description: 'Data integrity and relationships',
    clauses: ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK', 'DEFAULT', 'NOT NULL']
  },

  // ===== 10. Advanced / MySQL-Specific =====
  advanced: {
    label: '⚙️ Advanced',
    description: 'Conditional logic and special functions',
    clauses: ['CASE', 'IF', 'IFNULL', 'COALESCE', 'OFFSET', 'GROUP_CONCAT', 'String Functions', 'Date Functions', 'Window Aggregates', 'Transactions']
  }
};

/**
 * Flat list of ALL clauses (used for progress tracking)
 */
const ALL_CLAUSE_LIST = Object.values(SQL_CLAUSE_TAXONOMY).flatMap(cat => cat.clauses);

/**
 * Hybrid Rule-Based Clause Detection Engine
 * Maps problem intent keywords to relevant SQL clauses
 */
const CLAUSE_DETECTION_RULES = {
  // --- Core intent mapping ---
  'unique values':     { primary: ['DISTINCT'],                       secondary: ['GROUP BY'] },
  'unique':            { primary: ['DISTINCT'],                       secondary: ['GROUP BY', 'COUNT'] },
  'duplicates':        { primary: ['GROUP BY', 'HAVING'],             secondary: ['COUNT', 'DISTINCT'] },
  'duplicate':         { primary: ['GROUP BY', 'HAVING'],             secondary: ['COUNT'] },
  'top highest':       { primary: ['ORDER BY', 'LIMIT'],              secondary: ['DESC'] },
  'top':               { primary: ['ORDER BY', 'LIMIT'],              secondary: ['MAX'] },
  'highest':           { primary: ['ORDER BY', 'LIMIT'],              secondary: ['MAX'] },
  'lowest':            { primary: ['ORDER BY', 'LIMIT'],              secondary: ['MIN'] },
  'bottom':            { primary: ['ORDER BY', 'LIMIT'],              secondary: ['MIN', 'ASC'] },
  'ranking':           { primary: ['RANK', 'DENSE_RANK', 'ROW_NUMBER'], secondary: ['OVER', 'PARTITION BY', 'ORDER BY'] },
  'rank':              { primary: ['RANK', 'DENSE_RANK'],             secondary: ['OVER', 'ORDER BY'] },
  'row number':        { primary: ['ROW_NUMBER'],                     secondary: ['OVER', 'PARTITION BY'] },
  'comparison':        { primary: ['WHERE', 'CASE'],                  secondary: ['WHEN', 'AND', 'OR'] },
  'compare':           { primary: ['WHERE', 'CASE'],                  secondary: ['HAVING'] },
  'null handling':     { primary: ['IS NULL', 'COALESCE', 'IFNULL'],  secondary: ['IS NOT NULL', 'CASE'] },
  'null':              { primary: ['IS NULL', 'IS NOT NULL'],         secondary: ['COALESCE', 'IFNULL'] },
  'missing':           { primary: ['IS NULL'],                        secondary: ['COALESCE', 'LEFT JOIN'] },
  'join tables':       { primary: ['JOIN', 'ON'],                     secondary: ['INNER JOIN', 'LEFT JOIN'] },
  'join':              { primary: ['INNER JOIN', 'LEFT JOIN'],        secondary: ['ON', 'USING'] },
  'inner join':        { primary: ['INNER JOIN', 'ON'],               secondary: ['WHERE'] },
  'left join':         { primary: ['LEFT JOIN', 'ON'],                secondary: ['IS NULL'] },
  'right join':        { primary: ['RIGHT JOIN', 'ON'],               secondary: ['IS NULL'] },
  'full join':         { primary: ['FULL JOIN', 'ON'],                secondary: ['COALESCE'] },
  'cross join':        { primary: ['CROSS JOIN'],                     secondary: [] },
  'self join':         { primary: ['SELF JOIN'],                      secondary: ['AS', 'ON'] },
  'subquery':          { primary: ['Subquery', 'EXISTS', 'IN'],       secondary: ['WITH', 'Correlated Subquery'] },
  'nested':            { primary: ['Subquery'],                       secondary: ['IN', 'EXISTS'] },
  'cte':               { primary: ['WITH'],                           secondary: ['Subquery'] },
  'recursive':         { primary: ['WITH RECURSIVE'],                 secondary: ['WITH'] },
  'exist':             { primary: ['EXISTS', 'NOT EXISTS'],           secondary: ['Subquery', 'IN'] },

  // --- Aggregation ---
  'count':             { primary: ['COUNT'],                          secondary: ['GROUP BY'] },
  'total':             { primary: ['SUM'],                            secondary: ['GROUP BY'] },
  'sum':               { primary: ['SUM'],                            secondary: ['GROUP BY'] },
  'average':           { primary: ['AVG'],                            secondary: ['GROUP BY', 'HAVING'] },
  'avg':               { primary: ['AVG'],                            secondary: ['GROUP BY'] },
  'minimum':           { primary: ['MIN'],                            secondary: ['GROUP BY'] },
  'min':               { primary: ['MIN'],                            secondary: ['WHERE'] },
  'maximum':           { primary: ['MAX'],                            secondary: ['GROUP BY'] },
  'max':               { primary: ['MAX'],                            secondary: ['WHERE'] },
  'group':             { primary: ['GROUP BY'],                       secondary: ['HAVING', 'COUNT', 'SUM', 'AVG'] },
  'aggregate':         { primary: ['GROUP BY', 'COUNT', 'SUM'],      secondary: ['HAVING', 'AVG'] },

  // --- Window functions ---
  'window':            { primary: ['OVER', 'PARTITION BY'],           secondary: ['ROW_NUMBER', 'RANK', 'LAG', 'LEAD'] },
  'running total':     { primary: ['SUM', 'OVER'],                    secondary: ['ORDER BY', 'Window Aggregates'] },
  'running':           { primary: ['OVER'],                           secondary: ['SUM', 'Window Aggregates'] },
  'lag':               { primary: ['LAG'],                            secondary: ['OVER', 'ORDER BY'] },
  'lead':              { primary: ['LEAD'],                           secondary: ['OVER', 'ORDER BY'] },
  'previous':          { primary: ['LAG'],                            secondary: ['OVER'] },
  'next':              { primary: ['LEAD'],                           secondary: ['OVER'] },
  'partition':         { primary: ['PARTITION BY'],                   secondary: ['OVER', 'ROW_NUMBER'] },
  'moving average':    { primary: ['AVG', 'OVER'],                    secondary: ['Window Aggregates', 'ROWS'] },
  'cumulative':        { primary: ['SUM', 'OVER'],                    secondary: ['Window Aggregates'] },
  'percentile':        { primary: ['PERCENT_RANK', 'NTILE'],         secondary: ['OVER', 'ORDER BY'] },

  // --- Sorting & Filtering ---
  'sort':              { primary: ['ORDER BY'],                       secondary: ['ASC', 'DESC'] },
  'order':             { primary: ['ORDER BY'],                       secondary: ['ASC', 'DESC', 'LIMIT'] },
  'filter':            { primary: ['WHERE'],                          secondary: ['AND', 'OR', 'HAVING'] },
  'limit':             { primary: ['LIMIT'],                          secondary: ['OFFSET', 'ORDER BY'] },
  'offset':            { primary: ['OFFSET', 'LIMIT'],               secondary: ['ORDER BY'] },
  'second highest':    { primary: ['ORDER BY', 'LIMIT', 'OFFSET'],   secondary: ['DISTINCT'] },
  'nth':               { primary: ['LIMIT', 'OFFSET'],               secondary: ['ORDER BY', 'ROW_NUMBER'] },
  'between':           { primary: ['BETWEEN'],                       secondary: ['WHERE', 'AND'] },
  'like':              { primary: ['LIKE'],                           secondary: ['WHERE'] },
  'pattern':           { primary: ['LIKE'],                           secondary: ['WHERE'] },
  'contains':          { primary: ['LIKE'],                           secondary: ['WHERE'] },
  'starts with':       { primary: ['LIKE'],                           secondary: ['WHERE'] },
  'ends with':         { primary: ['LIKE'],                           secondary: ['WHERE'] },
  'in list':           { primary: ['IN'],                             secondary: ['WHERE'] },
  'not in':            { primary: ['NOT IN'],                         secondary: ['WHERE', 'Subquery'] },

  // --- Set operations ---
  'union':             { primary: ['UNION'],                          secondary: ['UNION ALL'] },
  'combine':           { primary: ['UNION'],                         secondary: ['UNION ALL'] },
  'intersect':         { primary: ['INTERSECT'],                      secondary: [] },
  'except':            { primary: ['EXCEPT'],                         secondary: [] },
  'difference':        { primary: ['EXCEPT'],                         secondary: ['NOT IN'] },

  // --- DML ---
  'insert':            { primary: ['INSERT'],                         secondary: ['VALUES'] },
  'update':            { primary: ['UPDATE'],                         secondary: ['SET', 'WHERE'] },
  'delete':            { primary: ['DELETE'],                         secondary: ['WHERE'] },
  'remove':            { primary: ['DELETE'],                         secondary: ['WHERE'] },
  'add':               { primary: ['INSERT'],                         secondary: ['VALUES'] },
  'modify':            { primary: ['UPDATE'],                         secondary: ['SET'] },

  // --- DDL ---
  'create':            { primary: ['CREATE TABLE'],                   secondary: ['CREATE VIEW', 'CREATE INDEX'] },
  'alter':             { primary: ['ALTER TABLE'],                    secondary: ['ADD COLUMN'] },
  'drop':              { primary: ['DROP TABLE'],                     secondary: [] },
  'truncate':          { primary: ['TRUNCATE'],                       secondary: [] },
  'view':              { primary: ['CREATE VIEW'],                    secondary: ['SELECT'] },
  'index':             { primary: ['CREATE INDEX'],                   secondary: [] },

  // --- Advanced ---
  'case':              { primary: ['CASE'],                           secondary: ['WHEN', 'THEN', 'ELSE'] },
  'conditional':       { primary: ['CASE'],                           secondary: ['IF', 'COALESCE'] },
  'if':                { primary: ['CASE', 'IF'],                     secondary: ['IFNULL'] },
  'coalesce':          { primary: ['COALESCE'],                       secondary: ['IFNULL', 'IS NULL'] },
  'string':            { primary: ['String Functions'],               secondary: ['UPPER', 'LOWER', 'LENGTH'] },
  'date':              { primary: ['Date Functions'],                 secondary: ['STRFTIME', 'JULIANDAY'] },
  'time':              { primary: ['Date Functions'],                 secondary: ['STRFTIME'] },
  'pivot':             { primary: ['CASE', 'GROUP BY'],               secondary: ['SUM', 'COUNT'] },
  'percentage':        { primary: ['OVER', 'SUM'],                    secondary: ['Window Aggregates', 'ROUND'] },
  'per department':    { primary: ['GROUP BY', 'PARTITION BY'],       secondary: ['OVER'] },
  'per category':      { primary: ['GROUP BY'],                       secondary: ['HAVING'] },
  'per employee':      { primary: ['GROUP BY'],                       secondary: ['SUM', 'COUNT'] },
  'report':            { primary: ['GROUP BY', 'INNER JOIN'],         secondary: ['SUM', 'COUNT', 'ORDER BY'] },
  'summary':           { primary: ['GROUP BY', 'COUNT', 'SUM', 'AVG'], secondary: ['HAVING'] },
  'pairs':             { primary: ['SELF JOIN'],                      secondary: ['ON', 'AND'] },
  'manager':           { primary: ['SELF JOIN', 'LEFT JOIN'],         secondary: ['ON'] },
  'every':             { primary: ['HAVING', 'MIN'],                  secondary: ['GROUP BY'] },
  'all employees':     { primary: ['SELECT', 'FROM'],                 secondary: ['WHERE'] },
  'never':             { primary: ['NOT EXISTS', 'LEFT JOIN'],        secondary: ['IS NULL'] },
  'no orders':         { primary: ['LEFT JOIN', 'IS NULL'],           secondary: ['NOT EXISTS'] },
};

/**
 * Detect clauses from a question's text + topic
 * Returns { primary: [...], secondary: [...], all: [...] }
 */
function detectClauses(questionText, topic) {
  const text = (questionText || '').toLowerCase();
  const primarySet = new Set();
  const secondarySet = new Set();

  // 1. Always add the topic as a primary clause if it's a valid clause
  if (topic) {
    const normalized = topic.trim();
    if (ALL_CLAUSE_LIST.includes(normalized) || 
        ALL_CLAUSE_LIST.some(c => c.toLowerCase() === normalized.toLowerCase())) {
      primarySet.add(normalized);
    }
  }

  // 2. Match detection rules against question text
  for (const [keyword, mapping] of Object.entries(CLAUSE_DETECTION_RULES)) {
    if (text.includes(keyword.toLowerCase())) {
      mapping.primary.forEach(c => primarySet.add(c));
      mapping.secondary.forEach(c => secondarySet.add(c));
    }
  }

  // 3. Remove secondary items that are already primary
  primarySet.forEach(c => secondarySet.delete(c));

  return {
    primary: [...primarySet],
    secondary: [...secondarySet],
    all: [...primarySet, ...secondarySet]
  };
}

/**
 * Detect clauses from an actual SQL query string
 * Returns array of clause names found in the query
 */
function detectClausesFromSQL(sqlQuery) {
  if (!sqlQuery) return [];
  const sql = sqlQuery.toUpperCase();
  const found = [];

  const sqlPatterns = [
    { clause: 'SELECT',           pattern: /\bSELECT\b/ },
    { clause: 'FROM',             pattern: /\bFROM\b/ },
    { clause: 'WHERE',            pattern: /\bWHERE\b/ },
    { clause: 'GROUP BY',         pattern: /\bGROUP\s+BY\b/ },
    { clause: 'HAVING',           pattern: /\bHAVING\b/ },
    { clause: 'ORDER BY',         pattern: /\bORDER\s+BY\b/ },
    { clause: 'LIMIT',            pattern: /\bLIMIT\b/ },
    { clause: 'OFFSET',           pattern: /\bOFFSET\b/ },
    { clause: 'DISTINCT',         pattern: /\bDISTINCT\b/ },
    { clause: 'AS',               pattern: /\bAS\b/ },
    { clause: 'IN',               pattern: /\bIN\s*\(/ },
    { clause: 'NOT IN',           pattern: /\bNOT\s+IN\b/ },
    { clause: 'BETWEEN',          pattern: /\bBETWEEN\b/ },
    { clause: 'LIKE',             pattern: /\bLIKE\b/ },
    { clause: 'IS NULL',          pattern: /\bIS\s+NULL\b/ },
    { clause: 'IS NOT NULL',      pattern: /\bIS\s+NOT\s+NULL\b/ },
    { clause: 'EXISTS',           pattern: /\bEXISTS\s*\(/ },
    { clause: 'NOT EXISTS',       pattern: /\bNOT\s+EXISTS\b/ },
    { clause: 'INNER JOIN',       pattern: /\bINNER\s+JOIN\b/ },
    { clause: 'LEFT JOIN',        pattern: /\bLEFT\s+(OUTER\s+)?JOIN\b/ },
    { clause: 'RIGHT JOIN',       pattern: /\bRIGHT\s+(OUTER\s+)?JOIN\b/ },
    { clause: 'FULL JOIN',        pattern: /\bFULL\s+(OUTER\s+)?JOIN\b/ },
    { clause: 'CROSS JOIN',       pattern: /\bCROSS\s+JOIN\b/ },
    { clause: 'JOIN',             pattern: /\bJOIN\b/ },
    { clause: 'ON',               pattern: /\bON\b/ },
    { clause: 'USING',            pattern: /\bUSING\b/ },
    { clause: 'COUNT',            pattern: /\bCOUNT\s*\(/ },
    { clause: 'SUM',              pattern: /\bSUM\s*\(/ },
    { clause: 'AVG',              pattern: /\bAVG\s*\(/ },
    { clause: 'MIN',              pattern: /\bMIN\s*\(/ },
    { clause: 'MAX',              pattern: /\bMAX\s*\(/ },
    { clause: 'OVER',             pattern: /\bOVER\s*\(/ },
    { clause: 'PARTITION BY',     pattern: /\bPARTITION\s+BY\b/ },
    { clause: 'ROW_NUMBER',       pattern: /\bROW_NUMBER\s*\(/ },
    { clause: 'RANK',             pattern: /\bRANK\s*\(/ },
    { clause: 'DENSE_RANK',       pattern: /\bDENSE_RANK\s*\(/ },
    { clause: 'LAG',              pattern: /\bLAG\s*\(/ },
    { clause: 'LEAD',             pattern: /\bLEAD\s*\(/ },
    { clause: 'NTILE',            pattern: /\bNTILE\s*\(/ },
    { clause: 'PERCENT_RANK',     pattern: /\bPERCENT_RANK\s*\(/ },
    { clause: 'WITH',             pattern: /\bWITH\b/ },
    { clause: 'WITH RECURSIVE',   pattern: /\bWITH\s+RECURSIVE\b/ },
    { clause: 'UNION ALL',        pattern: /\bUNION\s+ALL\b/ },
    { clause: 'UNION',            pattern: /\bUNION\b/ },
    { clause: 'INTERSECT',        pattern: /\bINTERSECT\b/ },
    { clause: 'EXCEPT',           pattern: /\bEXCEPT\b/ },
    { clause: 'CASE',             pattern: /\bCASE\b/ },
    { clause: 'COALESCE',         pattern: /\bCOALESCE\s*\(/ },
    { clause: 'IFNULL',           pattern: /\bIFNULL\s*\(/ },
    { clause: 'INSERT',           pattern: /\bINSERT\s+INTO\b/ },
    { clause: 'UPDATE',           pattern: /\bUPDATE\b/ },
    { clause: 'DELETE',           pattern: /\bDELETE\b/ },
    { clause: 'CREATE TABLE',     pattern: /\bCREATE\s+TABLE\b/ },
    { clause: 'CREATE VIEW',      pattern: /\bCREATE\s+VIEW\b/ },
    { clause: 'CREATE INDEX',     pattern: /\bCREATE\s+INDEX\b/ },
    { clause: 'ALTER TABLE',      pattern: /\bALTER\s+TABLE\b/ },
    { clause: 'DROP TABLE',       pattern: /\bDROP\s+TABLE\b/ },
    { clause: 'GROUP_CONCAT',     pattern: /\bGROUP_CONCAT\s*\(/ },
    // String functions
    { clause: 'String Functions',  pattern: /\b(UPPER|LOWER|LENGTH|SUBSTR|TRIM|REPLACE|INSTR)\s*\(/ },
    // Date functions
    { clause: 'Date Functions',    pattern: /\b(STRFTIME|JULIANDAY|DATETIME|DATE)\s*\(/ },
    // Window aggregates (SUM/AVG/MAX/MIN with OVER)
    { clause: 'Window Aggregates', pattern: /\b(SUM|AVG|MAX|MIN)\s*\([^)]*\)\s*OVER\b/ },
  ];

  for (const { clause, pattern } of sqlPatterns) {
    if (pattern.test(sql) && !found.includes(clause)) {
      found.push(clause);
    }
  }

  // Detect self-join: same table aliased twice
  const fromMatch = sql.match(/\bFROM\s+(\w+)\s+(\w+)/);
  const joinMatches = [...sql.matchAll(/\bJOIN\s+(\w+)\s+(\w+)/g)];
  if (fromMatch && joinMatches.length > 0) {
    const fromTable = fromMatch[1];
    if (joinMatches.some(m => m[1] === fromTable)) {
      if (!found.includes('SELF JOIN')) found.push('SELF JOIN');
    }
  }

  // Detect subquery
  const parenDepth = (sql.match(/\(\s*SELECT\b/g) || []).length;
  if (parenDepth > 0 && !found.includes('Subquery')) {
    found.push('Subquery');
  }

  // Detect correlated subquery (references outer table alias)
  if (parenDepth > 0) {
    const outerAliasMatch = sql.match(/\bFROM\s+\w+\s+(\w+)/);
    if (outerAliasMatch) {
      const alias = outerAliasMatch[1];
      const subqueryContent = sql.match(/\(\s*SELECT[^)]+\)/g) || [];
      if (subqueryContent.some(sq => sq.includes(alias + '.'))) {
        if (!found.includes('Correlated Subquery')) found.push('Correlated Subquery');
      }
    }
  }

  return found;
}

/**
 * Get the category for a given clause
 */
function getClauseCategory(clauseName) {
  for (const [catKey, cat] of Object.entries(SQL_CLAUSE_TAXONOMY)) {
    if (cat.clauses.includes(clauseName)) {
      return { key: catKey, ...cat };
    }
  }
  return null;
}

/**
 * Get weak areas — clauses never used by the user
 */
function getWeakAreas(masteredClauses) {
  const mastered = new Set(masteredClauses || []);
  const weak = {};

  for (const [catKey, cat] of Object.entries(SQL_CLAUSE_TAXONOMY)) {
    const unmastered = cat.clauses.filter(c => !mastered.has(c));
    if (unmastered.length > 0) {
      weak[catKey] = {
        label: cat.label,
        total: cat.clauses.length,
        mastered: cat.clauses.length - unmastered.length,
        unmastered
      };
    }
  }

  return weak;
}

/**
 * Render the clause suggestion panel HTML
 * Shows primary (top 2-4), expandable secondary, and full clause coverage
 */
function renderClauseSuggestionPanel(questionText, topic, expectedQuery) {
  const detected = detectClauses(questionText, topic);
  const fromSQL = expectedQuery ? detectClausesFromSQL(expectedQuery) : [];

  // Limit primary to top 4
  const primaryDisplay = detected.primary.slice(0, 4);
  const secondaryDisplay = detected.secondary.slice(0, 6);

  let html = `<div class="clause-suggestion-panel" id="clause-suggestion-panel">`;

  // --- Primary Clauses ---
  if (primaryDisplay.length > 0) {
    html += `
      <div class="clause-suggestion-section">
        <div class="clause-section-label">
          <span class="clause-section-icon">🎯</span> LEETCODE (SQL GUESSER)
        </div>
        <div class="clause-chips-row">
          ${primaryDisplay.map(c => {
            const cat = getClauseCategory(c);
            return `<span class="clause-chip-suggestion primary" title="${cat ? cat.label : ''}">${c}</span>`;
          }).join('')}
        </div>
      </div>`;
  }

  // --- Secondary (expandable) ---
  if (secondaryDisplay.length > 0) {
    html += `
      <div class="clause-suggestion-section clause-secondary-section" id="clause-secondary-wrapper" style="display:none;">
        <div class="clause-section-label">
          <span class="clause-section-icon">💡</span> ALTERNATIVE APPROACHES
        </div>
        <div class="clause-chips-row">
          ${secondaryDisplay.map(c => `<span class="clause-chip-suggestion secondary">${c}</span>`).join('')}
        </div>
      </div>`;
    html += `
      <button class="clause-expand-btn" id="clause-expand-btn" onclick="toggleClauseSecondary()">
        ▾ View More Clauses
      </button>`;
  }

  html += `</div>`;
  return html;
}

function toggleClauseSecondary() {
  const wrapper = document.getElementById('clause-secondary-wrapper');
  const btn = document.getElementById('clause-expand-btn');
  if (!wrapper || !btn) return;
  
  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    btn.textContent = '▴ Hide Extra Clauses';
  } else {
    wrapper.style.display = 'none';
    btn.textContent = '▾ View More Clauses';
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.SQL_CLAUSE_TAXONOMY = SQL_CLAUSE_TAXONOMY;
  window.ALL_CLAUSE_LIST = ALL_CLAUSE_LIST;
  window.detectClauses = detectClauses;
  window.detectClausesFromSQL = detectClausesFromSQL;
  window.getClauseCategory = getClauseCategory;
  window.getWeakAreas = getWeakAreas;
  window.renderClauseSuggestionPanel = renderClauseSuggestionPanel;
  window.toggleClauseSecondary = toggleClauseSecondary;
}

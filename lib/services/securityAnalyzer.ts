import type { SecurityFinding, LineAnchor } from '@/lib/types/analysis';

type SecurityCategory = 'injection' | 'xss' | 'secrets' | 'crypto' | 'deserialization' | 'path-traversal' | 'file-ops' | 'rce' | 'randomness';

export function analyze(code: string, _language: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = code.split('\n').map((l) => l.replace(/\r$/, ''));
  const lower = code.toLowerCase();

  pushHigh(findings, code, lower, lines);
  pushMedium(findings, code, lower, lines);
  pushLow(findings, code, lower, lines);

  return findings;
}

function anchorForRegex(code: string, regex: RegExp, label?: string): { anchors: LineAnchor[]; line: number; snippet: string } {
  const m = code.match(regex);
  if (!m || m.index === undefined) {
    return { anchors: [{ startLine: 1, endLine: 1, label }], line: 1, snippet: '' };
  }
  const line = code.substring(0, m.index).split('\n').length;
  const snippet = '`' + code.substring(Math.max(0, m.index - 10), Math.min(code.length, m.index + m[0].length + 20)).replace(/\n/g, ' ') + '`';
  return { anchors: [{ startLine: line, endLine: line, label }], line, snippet };
}

function lineAnchor(lineNumber: number, label?: string): LineAnchor[] {
  return [{ startLine: lineNumber, endLine: lineNumber, label }];
}

function multiAnchor(start: number, end: number, label?: string): LineAnchor[] {
  return [{ startLine: start, endLine: end, label }];
}

function pushHigh(findings: SecurityFinding[], code: string, lower: string, lines: string[]): void {
  const evalRegex = /eval\s*\(/i;
  if (evalRegex.test(lower)) {
    const { anchors, line, snippet } = anchorForRegex(code, evalRegex, 'eval() call');
    findings.push({
      severity: 'high',
      title: 'Use of `eval()` (code injection risk)',
      description: `Found \`eval()\` which executes arbitrary string code at runtime. Evidence: ${snippet}`,
      line,
      anchors,
      category: 'injection',
      suggestedFix: 'Remove eval() entirely. If dynamic evaluation is required, use a safe sandboxed interpreter or JSON.parse with a strict schema validator.',
    });
  }

  const execRegex = /exec\s*\(/i;
  if (execRegex.test(lower)) {
    const { anchors, line, snippet } = anchorForRegex(code, execRegex, 'exec() call');
    findings.push({
      severity: 'high',
      title: 'Use of `exec()` or OS-level exec call (RCE risk)',
      description: `Found \`exec()\` which may spawn arbitrary processes. Evidence: ${snippet}`,
      line,
      anchors,
      category: 'rce',
      suggestedFix: 'Avoid executing shell commands. If unavoidable, use a safe allowlist and pass arguments as arrays (not a single shell string) to prevent injection.',
    });
  }

  const javaExecRegex = /Runtime\.getRuntime\(\)\.exec/i;
  if (javaExecRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, javaExecRegex, 'Java Runtime.exec');
    findings.push({
      severity: 'high',
      title: 'Java `Runtime.exec()` for shell execution (RCE risk)',
      description: 'Runtime.getRuntime().exec(...) executes OS commands with no sandbox by default.',
      line,
      anchors,
      category: 'rce',
      suggestedFix: 'Use ProcessBuilder with a fixed argument list and never pass user input directly to the shell.',
    });
  }

  const cpExecRegex = /child_process\.exec/i;
  if (cpExecRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, cpExecRegex, 'child_process.exec');
    findings.push({
      severity: 'high',
      title: 'Node `child_process.exec` shell execution (RCE risk)',
      description: 'child_process.exec spawns a shell; passing untrusted input leads to command injection.',
      line,
      anchors,
      category: 'rce',
      suggestedFix: 'Use child_process.execFile or child_process.spawn with an args array instead of exec(). Never pass user-controlled data in the command string.',
    });
  }

  const osSystemRegex = /os\.system\s*\(/i;
  if (osSystemRegex.test(lower)) {
    const { anchors, line } = anchorForRegex(code, osSystemRegex, 'os.system()');
    findings.push({
      severity: 'high',
      title: 'Python `os.system` shell execution (RCE risk)',
      description: 'os.system() invokes the system shell on the supplied string command.',
      line,
      anchors,
      category: 'rce',
      suggestedFix: 'Use subprocess.run() with shell=False and pass arguments as a list.',
    });
  }

  const shellTrueRegex = /shell\s*=\s*True/i;
  if (shellTrueRegex.test(lower)) {
    const { anchors, line } = anchorForRegex(code, shellTrueRegex, 'shell=True');
    findings.push({
      severity: 'high',
      title: 'subprocess `shell=True` (command injection)',
      description: 'subprocess.*(..., shell=True) enables shell metacharacter expansion from input.',
      line,
      anchors,
      category: 'rce',
      suggestedFix: 'Set shell=False and pass command arguments as a list.',
    });
  }

  if (/System\s*\(/.test(lower) && /system\.diagnostics/i.test(lower) === false) {
    const systemCallRegex = /System\s*\(\s*["']/;
    if (systemCallRegex.test(code)) {
      const { anchors, line, snippet } = anchorForRegex(code, systemCallRegex, 'System(...) call');
      findings.push({
        severity: 'high',
        title: 'Direct shell/System command invocation',
        description: `Detected System("...")-style call; may run arbitrary OS commands. Evidence: ${snippet}`,
        line,
        anchors,
        category: 'rce',
        suggestedFix: 'Replace direct command execution with a safe library API or pass arguments through a sanitized allowlist.',
      });
    }
  }

  const pickleRegex = /pickle\.(loads?|dumps?)\s*\(/i;
  if (pickleRegex.test(lower)) {
    const { anchors, line } = anchorForRegex(code, pickleRegex, 'pickle deserialization');
    findings.push({
      severity: 'high',
      title: 'Unsafe Python pickle deserialization (RCE risk)',
      description: 'pickle.loads / pickle.load can execute arbitrary code from a crafted payload. Never use with untrusted data.',
      line,
      anchors,
      category: 'deserialization',
      suggestedFix: 'Use JSON, MessagePack, or another safe serialization format. Never unpickle data from untrusted sources.',
    });
  }

  const oisRegex = /ObjectInputStream\s*\(/;
  if (oisRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, oisRegex, 'ObjectInputStream');
    findings.push({
      severity: 'high',
      title: 'Java `ObjectInputStream` unsafe deserialization (RCE risk)',
      description: 'ObjectInputStream.readObject() can instantiate attacker-controlled classes leading to RCE.',
      line,
      anchors,
      category: 'deserialization',
      suggestedFix: 'Use a safe serialization format (JSON/Protocol Buffers). If ObjectInputStream is required, implement a hard-coded class whitelist via ObjectInputFilter.',
    });
  }
}

function pushMedium(findings: SecurityFinding[], code: string, lower: string, lines: string[]): void {
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  for (const kw of sqlKeywords) {
    const concatRegex = new RegExp(`["']\\s*${kw}[^"']*["']\\s*\\+`, 'i');
    if (concatRegex.test(code)) {
      const { anchors, line, snippet } = anchorForRegex(code, concatRegex, 'SQL string concat');
      findings.push({
        severity: 'medium',
        title: `SQL string concatenation (${kw}) — SQL injection risk`,
        description: `SQL ${kw} statement built with string concatenation instead of parameterized queries. Evidence: ${snippet}`,
        line,
        anchors,
        category: 'injection',
        suggestedFix: 'Use parameterized queries / prepared statements (?, @p, $1 placeholders) and bind variables instead of concatenation.',
      });
      break;
    }
  }

  const templateRegex = /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{/i;
  if (templateRegex.test(code)) {
    const { anchors, line, snippet } = anchorForRegex(code, templateRegex, 'SQL template literal');
    findings.push({
      severity: 'medium',
      title: 'SQL via template literal with interpolation — SQL injection risk',
      description: `SQL template literal contains \`\${...}\` interpolation; prefer parameterized queries. Evidence: ${snippet}`,
      line,
      anchors,
      category: 'injection',
      suggestedFix: 'Use parameterized queries / prepared statements. Do not interpolate user values directly into SQL strings.',
    });
  }

  const docWriteRegex = /document\.write\s*\(/;
  if (docWriteRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, docWriteRegex, 'document.write()');
    findings.push({
      severity: 'medium',
      title: '`document.write()` usage (XSS risk)',
      description: 'document.write(...) injects raw HTML into the document; avoid for untrusted data.',
      line,
      anchors,
      category: 'xss',
      suggestedFix: 'Use safe DOM APIs like textContent or createTextNode(). If HTML is required, sanitize with DOMPurify or a trusted library.',
    });
  }

  const innerHtmlRegex = /\.innerHTML\s*=\s*[^=]/;
  if (innerHtmlRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, innerHtmlRegex, '.innerHTML assignment');
    findings.push({
      severity: 'medium',
      title: '`.innerHTML` assignment (XSS risk)',
      description: 'Assigning untrusted input to innerHTML parses arbitrary markup including <script>.',
      line,
      anchors,
      category: 'xss',
      suggestedFix: 'Use textContent for plain text, or sanitize HTML with DOMPurify before assigning to innerHTML.',
    });
  }

  const dangerouslyRegex = /dangerouslySetInnerHTML\s*=\s*\{/;
  if (dangerouslyRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, dangerouslyRegex, 'dangerouslySetInnerHTML');
    findings.push({
      severity: 'medium',
      title: 'React `dangerouslySetInnerHTML` (XSS risk)',
      description: 'dangerouslySetInnerHTML bypasses React\'s XSS protection and renders raw markup.',
      line,
      anchors,
      category: 'xss',
      suggestedFix: 'Avoid dangerouslySetInnerHTML. If HTML is required, sanitize it with DOMPurify before rendering.',
    });
  }

  const vHtmlRegex = /v-html\s*=/;
  if (vHtmlRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, vHtmlRegex, 'v-html directive');
    findings.push({
      severity: 'medium',
      title: 'Vue `v-html` directive (XSS risk)',
      description: 'v-html renders raw HTML content, bypassing Vue\'s escaping and enabling script injection.',
      line,
      anchors,
      category: 'xss',
      suggestedFix: 'Use v-text for plain text or sanitize HTML output with a library like DOMPurify before binding.',
    });
  }

  const outerHtmlRegex = /\.outerHTML\s*=\s*[^=]/;
  if (outerHtmlRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, outerHtmlRegex, '.outerHTML assignment');
    findings.push({
      severity: 'medium',
      title: '`.outerHTML` assignment (XSS risk)',
      description: 'Assigning user-controlled content to outerHTML replaces the element with unescaped markup.',
      line,
      anchors,
      category: 'xss',
      suggestedFix: 'Use textContent or safe DOM builder methods. If HTML is necessary, sanitize with DOMPurify first.',
    });
  }

  const jsonParseRegex = /JSON\.parse\s*\(\s*(?:req|request|input|user|params|query|body|data|payload)/i;
  if (jsonParseRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, jsonParseRegex, 'JSON.parse on input');
    findings.push({
      severity: 'medium',
      title: '`JSON.parse` on untrusted input without schema validation',
      description: 'JSON.parse(userInput) is not itself RCE, but without a schema validator (zod, yup, ajv, class-validator) the resulting object can carry unexpected types leading to downstream bugs or proto-pollution.',
      line,
      anchors,
      category: 'deserialization',
      suggestedFix: 'Validate the parsed JSON with a schema library (zod, yup, ajv, io-ts) to enforce expected shapes, types, and ranges before consuming the data.',
    });
  }

  const evalJsonRegex = /eval\s*\(\s*(?:JSON\.|["']\s*\{)/;
  if (evalJsonRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, evalJsonRegex, 'eval on JSON-like data');
    findings.push({
      severity: 'high',
      title: 'Use of `eval()` to parse JSON instead of `JSON.parse`',
      description: 'eval() on JSON strings executes arbitrary code in the input. Use JSON.parse.',
      line,
      anchors,
      category: 'deserialization',
      suggestedFix: 'Replace eval(jsonString) with JSON.parse(jsonString), and validate the result with a schema library.',
    });
  }

  const pathTraversalRegex = /\.\.\/|\.\.\\/;
  if (pathTraversalRegex.test(code)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/\.\.\/|\.\.\\/.test(line)) {
        findings.push({
          severity: 'medium',
          title: 'Path traversal: `../` sequence detected in code',
          description: `Literal \`../\` found in source. If paths are concatenated with user input, attackers can escape a base directory with \`../../etc/passwd\`-style payloads. Line: \`${line.trim().substring(0, 120)}\``,
          line: i + 1,
          anchors: lineAnchor(i + 1, '../ path traversal'),
          category: 'path-traversal',
          suggestedFix: 'Normalize and resolve paths with path.resolve() / Path.GetFullPath(), then verify the resolved path is still inside the allowed base directory. Never concatenate paths with +.',
        });
        break;
      }
    }
  }

  const fsReadRegex = /fs\.(?:readFile|readFileSync|createReadStream|open|openSync)\s*\(\s*(?:req|input|user|params|query|body|data|path)/i;
  if (fsReadRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, fsReadRegex, 'fs.read* with user input');
    findings.push({
      severity: 'high',
      title: '`fs.readFile` / file open with user-controlled path (path traversal risk)',
      description: 'File API receives user-supplied path input. Without normalization this allows reading arbitrary files via path traversal.',
      line,
      anchors,
      category: 'path-traversal',
      suggestedFix: 'Resolve the path with path.resolve(baseDir, userPath) and verify the result starts with the baseDir canonical path before opening the file.',
    });
  }

  const fileOpenConcatRegex = /new\s+File(?:Stream|Reader|InputStream)?\s*\(\s*[A-Za-z_]\w*\s*\+/;
  if (fileOpenConcatRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, fileOpenConcatRegex, 'File(...) concat');
    findings.push({
      severity: 'medium',
      title: 'File open with concatenated user path (path traversal risk)',
      description: 'File object constructed by concatenating paths; user input could contain `../` to escape the base directory.',
      line,
      anchors,
      category: 'path-traversal',
      suggestedFix: 'Use a proper path-joining utility (Path.Combine / path.join) and validate that the resolved absolute path is within the allowed directory.',
    });
  }

  const weakCryptoRe: { r: RegExp; title: string; fix: string }[] = [
    { r: /\bmd5\s*\(|\bMD5\b|createHash\s*\(\s*["']md5["']/i, title: 'Weak cryptography: MD5 hash used', fix: 'Replace MD5 with SHA-256 or SHA-3 for checksums. For passwords, use bcrypt/argon2/PBKDF2.' },
    { r: /\bsha1\s*\(|\bSHA1\b|createHash\s*\(\s*["']sha1["']/i, title: 'Weak cryptography: SHA-1 hash used', fix: 'Replace SHA-1 with SHA-256 or SHA-3. For password hashing, use bcrypt/argon2/PBKDF2.' },
    { r: /(?:AES|DES|RC4|TripleDES).*ECB|MODE_ECB|Cipher\.getInstance\s*\(\s*["'].*\/ECB\//i, title: 'Weak cryptography: ECB mode or DES/RC4 cipher', fix: 'Use AES-GCM or AES-CBC with a random IV and authenticated encryption (HMAC or AEAD). Avoid DES, 3DES, RC4, and ECB mode entirely.' },
    { r: /\bDES\b|DESede|RC4\b|createCipheriv\s*\(\s*["'](?:des|rc4)/i, title: 'Weak cryptography: DES/RC4 cipher used', fix: 'Replace DES/RC4 with AES-256-GCM or ChaCha20-Poly1305.' },
  ];
  for (const wc of weakCryptoRe) {
    if (wc.r.test(code)) {
      const { anchors, line, snippet } = anchorForRegex(code, wc.r, 'weak crypto');
      findings.push({
        severity: 'medium',
        title: wc.title,
        description: `${wc.title}. Evidence: ${snippet || 'pattern matched in source.'}`,
        line,
        anchors,
        category: 'crypto',
        suggestedFix: wc.fix,
      });
    }
  }

  const appendFileRegex = /fs\.(?:appendFile|appendFileSync|writeFile|writeFileSync)\s*\(\s*(?:req|input|user|params|query|body|data|path)/i;
  if (appendFileRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, appendFileRegex, 'fs.append/write with user path');
    findings.push({
      severity: 'medium',
      title: 'Unsafe file op: fs.appendFile / fs.writeFile with user-controlled path',
      description: 'Write/append API receives user-supplied path; could be used to overwrite or append to arbitrary system files.',
      line,
      anchors,
      category: 'file-ops',
      suggestedFix: 'Resolve and validate the target path against an allowed base directory, and run the process with a restricted user / chroot when possible.',
    });
  }

  const openWriteRegex = /open\s*\(\s*[^)]*["']w(?:b|\+)?["']/;
  if (openWriteRegex.test(code)) {
    const { anchors, line } = anchorForRegex(code, openWriteRegex, 'open with write mode');
    findings.push({
      severity: 'low',
      title: 'Unsafe file op: file opened for write without permission checks',
      description: 'File opened in write mode (`"w"`) — ensure the caller has validated both the path and the user\'s authorization before writing.',
      line,
      anchors,
      category: 'file-ops',
      suggestedFix: 'Verify the resolved path is inside the allowed directory, check the user\'s permissions, and create new files with restrictive modes (e.g. 0o600).',
    });
  }

  const chmodRegex = /chmod\s*\(\s*[^,)]*0?o?777\b|chmod\s+777/;
  if (chmodRegex.test(code) || /chmod\s*\(\s*[^,)]*,\s*0o?777/.test(code)) {
    for (let i = 0; i < lines.length; i++) {
      if (/777/.test(lines[i]!) && /chmod/i.test(lines[i]!)) {
        findings.push({
          severity: 'high',
          title: 'Dangerous file permission: chmod 777 makes file world-writable',
          description: `Setting permissions to 777 grants read/write/execute to every user on the system. Pattern: \`${lines[i]!.trim().substring(0, 120)}\``,
          line: i + 1,
          anchors: lineAnchor(i + 1, 'chmod 777'),
          category: 'file-ops',
          suggestedFix: 'Use the most restrictive permissions that still work (644 for files, 755 for directories, 600 for secrets).',
        });
        break;
      }
    }
  }
}

function pushLow(findings: SecurityFinding[], code: string, _lower: string, lines: string[]): void {
  const secretRegex = /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i;
  const match = code.match(secretRegex);
  if (match && match.index !== undefined) {
    const raw = match[0];
    const line = code.substring(0, match.index).split('\n').length;
    findings.push({
      severity: 'low',
      title: 'Possible hardcoded secret/credential in source',
      description: `Possible hardcoded credential found at line ~${line}: \`${maskSecret(raw)}\`.`,
      line,
      anchors: lineAnchor(line, 'hardcoded secret'),
      category: 'secrets',
      suggestedFix: 'Move credentials to environment variables, a secrets manager (AWS Secrets Manager, Vault), or a secure config service. Rotate any leaked secrets immediately.',
    });
  }

  const mathRandomRegex = /Math\.random\s*\(\)/;
  if (mathRandomRegex.test(code)) {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]!;
      if (/Math\.random\s*\(\)/.test(l) && /(?:token|password|auth|nonce|csrf|salt|session|secret|key|id|otp)/i.test(lines.slice(Math.max(0, i - 2), i + 3).join(' '))) {
        findings.push({
          severity: 'medium',
          title: 'Insecure randomness: `Math.random()` used for security value',
          description: `Math.random() is not cryptographically secure. It appears near security-sensitive code at line ${i + 1}: \`${l.trim().substring(0, 120)}\``,
          line: i + 1,
          anchors: lineAnchor(i + 1, 'Math.random() for token/secret'),
          category: 'randomness',
          suggestedFix: 'Use crypto.getRandomValues() in browsers or crypto.randomBytes() in Node.js for tokens, IDs, OTPs, passwords, or any security-sensitive value.',
        });
        break;
      }
    }
    if (!findings.some((f) => f.title.startsWith('Insecure randomness: `Math.random`'))) {
      const { anchors, line } = anchorForRegex(code, mathRandomRegex, 'Math.random()');
      findings.push({
        severity: 'low',
        title: 'Weak randomness hint: `Math.random()` — verify usage is non-security',
        description: 'Math.random() is a PRNG, not cryptographically secure. Ensure it is NOT used for tokens, passwords, nonces, IDs, shuffles used for betting/gaming, etc.',
        line,
        anchors,
        category: 'randomness',
        suggestedFix: 'For any security-sensitive purpose, replace with crypto.getRandomValues() (browser) or crypto.randomBytes() (Node.js).',
      });
    }
  }

  const randRegex = /\brand\s*\(|\bsrand\s*\(|\brandom\s*\(|\bmt_rand\s*\(/;
  if (randRegex.test(code) && !/crypto|secrets\.SystemRandom/.test(code)) {
    const { anchors, line } = anchorForRegex(code, randRegex, 'rand()/random()');
    if (!findings.some((f) => f.category === 'randomness' && /\brand\b|Math\.random/.test(f.title))) {
      findings.push({
        severity: 'low',
        title: 'Insecure randomness hint: `rand()` / `random()` module usage',
        description: 'Standard rand()/srand()/Python random module are not cryptographically secure. Verify they are not used for tokens, passwords, or session IDs.',
        line,
        anchors,
        category: 'randomness',
        suggestedFix: 'Use secrets.token_* / SystemRandom (Python), crypto/rand (Go), SecureRandom (Java), or RandomNumberGenerator (C#) for security.',
      });
    }
  }

  const pySecretsRandom = /\brandom\s*\.\s*(?:choice|randint|randrange|random)\s*\(/;
  if (pySecretsRandom.test(code) && /(token|password|auth|nonce|csrf|salt|session|secret|key|otp)/i.test(code)) {
    const { anchors, line } = anchorForRegex(code, pySecretsRandom, 'python random module');
    findings.push({
      severity: 'medium',
      title: 'Insecure randomness: Python `random` module used for security-sensitive value',
      description: 'The `random` module is a Mersenne Twister PRNG and is not secure for tokens/passwords. Use the `secrets` module instead.',
      line,
      anchors,
      category: 'randomness',
      suggestedFix: 'Replace `random.*` with `secrets.token_urlsafe()`, `secrets.choice()`, or `secrets.SystemRandom()` for all security-sensitive operations.',
    });
  }
}

function maskSecret(raw: string): string {
  return raw.replace(/(["'])([A-Za-z0-9_\-]{6,})\1/g, (_: string, q: string, v: string) => {
    return `${q}${v.substring(0, 2)}***${v.substring(v.length - 2)}${q}`;
  });
}

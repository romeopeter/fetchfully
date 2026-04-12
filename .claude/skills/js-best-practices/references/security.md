# JavaScript Security Patterns
 
## XSS Prevention
 
```js
// ❌ NEVER inject user content as HTML
element.innerHTML = userContent;
document.write(userContent);
 
// ✅ Use textContent for plain text
element.textContent = userContent;
 
// ✅ For rich HTML, sanitize first (DOMPurify)
import DOMPurify from "dompurify";
element.innerHTML = DOMPurify.sanitize(userContent);
```
 
**React/Vue/Svelte** escape by default — but `dangerouslySetInnerHTML` / `v-html` need the same sanitization treatment.
 
---
 
## Injection Prevention
 
```js
// ❌ String interpolation in SQL — never
const q = `SELECT * FROM users WHERE email = '${email}'`;
 
// ✅ Parameterized queries — always
const q = await db.query("SELECT * FROM users WHERE email = $1", [email]);
 
// ✅ For NoSQL (MongoDB), validate shapes
const { email } = UserSchema.parse(req.body); // Zod throws on malformed input
```
 
---
 
## Input Validation with Zod
 
```ts
import { z } from "zod";
 
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).max(10).optional(),
});
 
// At the API boundary
app.post("/posts", async (req, res) => {
  const result = CreatePostSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  const post = await createPost(result.data); // fully typed and validated
});
```
 
---
 
## Secrets & Environment Variables
 
```js
// ❌ Never hardcode secrets
const apiKey = "sk-live-abc123";
 
// ✅ Always from environment
const apiKey = process.env.PAYMENT_API_KEY;
if (!apiKey) throw new Error("PAYMENT_API_KEY is required");
```
 
`.env` file:
```
PAYMENT_API_KEY=sk-live-abc123
```
 
`.gitignore` must include `.env`. Use `.env.example` (no real values) committed to the repo.
 
---
 
## Content Security Policy (CSP)
 
Set via HTTP header or meta tag to prevent XSS:
 
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self'
```
 
In Express:
```js
import helmet from "helmet";
app.use(helmet()); // sets CSP and other security headers
```
 
---
 
## Dependency Security
 
```bash
npm audit           # scan for known vulnerabilities
npm audit fix       # auto-fix where possible
npx snyk test       # deeper analysis
```
 
Automate with GitHub Dependabot or Renovate.
 
---
 
## OWASP Top 10 Checklist for JS Apps
 
1. **Broken Access Control** — verify auth server-side on every request, not just client-side
2. **Cryptographic Failures** — use HTTPS everywhere, never roll your own crypto
3. **Injection** — parameterized queries, input validation at boundaries
4. **Insecure Design** — threat model early; validate trust boundaries
5. **Security Misconfiguration** — use `helmet`, disable debug in production, set `NODE_ENV=production`
6. **Vulnerable Components** — `npm audit`, Dependabot
7. **Auth Failures** — use established libs (Auth.js, Passport), never custom JWT handling
8. **Integrity Failures** — use `npm ci` for reproducible installs, check package integrity
9. **Logging Failures** — log security events, but never log passwords/tokens
10. **SSRF** — validate/allow-list URLs before server-side fetches

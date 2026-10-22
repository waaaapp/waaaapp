const { randomUUID, randomBytes, scryptSync, createCipheriv, createDecipheriv } = require('node:crypto');
const MAX_ACCOUNTS = 50;
function account(name = 'Account') { return { id: `tab_${randomUUID()}`, name, avatar: '' }; }
function validateWorkspace(value) {
  if (!value || value.format !== 'waaaapp-workspace' || value.version !== 1 || !Array.isArray(value.accounts) || value.accounts.length > MAX_ACCOUNTS) throw new Error('This is not a supported waaaapp workspace.');
  const ids = new Set();
  const accounts = value.accounts.map(item => {
    if (!item || typeof item.id !== 'string' || !/^tab_[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate account identifier.');
    ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new Error('Invalid account name.');
    const avatar = item.avatar || '';
    if (typeof avatar !== 'string' || avatar.length > 200000 || (avatar && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar))) throw new Error('Invalid account photo.');
    return { id: item.id, name: item.name.trim(), avatar };
  });
  return { format: 'waaaapp-workspace', version: 1, accounts, activeId: ids.has(value.activeId) ? value.activeId : accounts[0]?.id || null };
}
function encryptWorkspace(workspace, password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 1024) throw new Error('Use a passphrase of at least 10 characters.');
  const salt = randomBytes(16), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(password, salt, 32), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(validateWorkspace(workspace))), cipher.final()]);
  return JSON.stringify({ format: 'waaaapp-encrypted', version: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') });
}
function decryptWorkspace(text, password) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 15000000 || typeof password !== 'string' || password.length > 1024) throw new Error('Backup is too large or invalid.');
  const value = JSON.parse(text);
  if (value.format !== 'waaaapp-encrypted' || value.version !== 1) throw new Error('Unsupported backup. Export a new workspace from waaaapp 2 or later.');
  for (const key of ['salt', 'iv', 'tag', 'data']) if (typeof value[key] !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(value[key])) throw new Error('Invalid backup.');
  const salt = Buffer.from(value.salt, 'base64'), iv = Buffer.from(value.iv, 'base64'), tag = Buffer.from(value.tag, 'base64');
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) throw new Error('Invalid backup.');
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(password, salt, 32), iv);
  decipher.setAuthTag(tag);
  let decoded;
  try { decoded = Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8'); }
  catch { throw new Error('Incorrect passphrase or damaged backup.'); }
  return validateWorkspace(JSON.parse(decoded));
}
function isWhatsApp(url) { try { return new URL(url).origin === 'https://web.whatsapp.com'; } catch { return false; } }
function externalURL(url) { try { return ['https:', 'http:', 'mailto:'].includes(new URL(url).protocol); } catch { return false; } }
module.exports = { account, validateWorkspace, encryptWorkspace, decryptWorkspace, isWhatsApp, externalURL, MAX_ACCOUNTS };

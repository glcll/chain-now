module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var body = req.body || {};
  var password = (typeof body === 'string' ? '' : (body.password || '')).trim();
  var sitePassword = (process.env.SITE_PASSWORD || '').trim();

  if (password && sitePassword && password === sitePassword) {
    res.setHeader('Set-Cookie', 'site_auth=authenticated; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400');
    return res.redirect(302, '/');
  }

  return res.redirect(302, '/login?error=1');
};

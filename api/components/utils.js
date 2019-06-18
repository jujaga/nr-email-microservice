const config = require('config');

const utils = {
  // Returns a pretty JSON representation of an object
  prettyStringify: obj => JSON.stringify(obj, null, 2),
  responseOk: status => status >= 200 && status <= 299,
  removeLeading: (s, c) => {
    if (!s || !c) return;
    return s.startsWith(c) ? s.substring(c.length, s.length) : s;
  },
  removeTrailing: (s, c) => {
    if (!s || !c) return;
    return s.endsWith(c) ? s.substring(0, s.length - c.length) : s;
  },
  createHref: (req, path) => {
    const hostUrl = utils.removeTrailing(config.get('server.hostUrl'), '/');
    const baseUrl = utils.removeTrailing(utils.removeLeading(req.baseUrl, '/'), '/');
    const p = path ? path : req.path;
    const linkPath = utils.removeLeading(p, '/');

    return [hostUrl, baseUrl, linkPath].join('/');
  },
  createLink: (req, rel, method, path) => {
    const href = utils.createHref(req, path);
    if ('self'.toLowerCase() === rel.toLowerCase()) {
      return {rel: 'self', method: req.method.toUpperCase(), href: href};
    }
    return {rel: rel.toLowerCase(), method: method.toUpperCase(), href: href};
  }
};

module.exports = utils;

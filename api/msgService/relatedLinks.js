const config = require('config');

const relatedLinks = {

  removeLeading: (s, c) => {
    if (!s || !c) return;
    return s.startsWith(c) ? s.substring(c.length, s.length) : s;
  },

  removeTrailing: (s, c) => {
    if (!s || !c) return;
    return s.endsWith(c) ? s.substring(0, s.length - c.length) : s;
  },

  createHref: (req, path) => {
    const hostUrl = relatedLinks.removeTrailing(config.get('server.hostUrl'), '/');
    const baseUrl = relatedLinks.removeTrailing(relatedLinks.removeLeading(req.baseUrl, '/'), '/');
    const p = path ? path : req.path;
    const linkPath = relatedLinks.removeLeading(p, '/');

    const href = [hostUrl, baseUrl, linkPath].join('/');
    return relatedLinks.removeTrailing(href, '/');
  },

  createLink: (req, rel, method, path) => {
    const href = relatedLinks.createHref(req, path);
    if ('self'.toLowerCase() === rel.toLowerCase()) {
      return {rel: 'self', method: req.method.toUpperCase(), href: href};
    }
    return {rel: rel.toLowerCase(), method: method.toUpperCase(), href: href};
  },

  createLinks: (req, links) => {

    if (links && links.length > 0) {
      // if we passed in links, add self to front of the list
      links.unshift({r:'self'});
    } else {
      // no links, always return self
      links = [{r:'self'}];
    }

    const linksArray = links.map(l => relatedLinks.createLink(req, l.r, l.m, l.p));
    return linksArray;
  }


};

module.exports = { relatedLinks };

const config = require('config');
const log = require('npmlog');
const passport = require('passport');

const Problem = require('api-problem');

const {relatedLinks} = require('../../components/relatedLinks');

const userAuthenticationEnabled = () => {
  try {
    return config.get('userAuthentication.enabled').toLowerCase() === 'true';
  } catch (e) {
    log.warn('userAuthenticate', 'Could not determine if User Authentication enabled, setting to false (disabled).');
    return false;
  }
};

const userAuthenticate = (req, res, next) => {
  if (!userAuthenticationEnabled()) {
    next();
  } else {
    return passport.authenticate('jwt', { session: false }, (err, user, info) => {
      let links = [relatedLinks.createLink(req, 'login', 'GET', '/auth/login'),
        relatedLinks.createLink(req, 'logout', 'GET', '/auth/logout'),
        relatedLinks.createLink(req, 'token', 'GET', '/auth/token')];

      if (err) {
        return next(new Problem(500, 'Unknown Authentication error', {detail: err.message, links: links}));
      }
      if (info != undefined) {
        return next(new Problem(401, 'Authentication error', {detail: info.message, info: info, links: links}));
      }
      if (!user) {
        return next(new Problem(401, 'Authentication error', {detail: 'No user info details returned from authentication server', links: links}));
      }
      // Forward user information to the next middleware
      req.user = user;
      next();
    })(req, res, next);
  }
};


module.exports = {userAuthenticate};

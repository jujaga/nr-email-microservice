const Problem = require('api-problem');

const authenticate = async (req, res, next) => {
  if (!req.token || !req.status) {
    next(new Problem(401, 'Authentication error', {detail: 'Service Client has not been authenticated.'}));
  } else if (req.status.error) {
    next(new Problem(401, 'Authentication error', {detail: req.status.error}));
  } else {
    next();
  }
};

module.exports = {authenticate};

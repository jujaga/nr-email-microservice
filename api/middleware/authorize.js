const Problem = require('api-problem');

const authorize = (scope) => {
  return (req, res, next) => {
    if (!req.scope) {
      next(new Problem(401, 'Authorization error', {detail: 'Service Client has not been authenticated.'}));
    } else if (req.scope.split(' ').indexOf(scope) < 0) {
      next(new Problem(401, 'Authorization error', {detail: `Service Client has not been authorized for ${scope}.`}));
    } else {
      next();
    }
  };
};
module.exports = {authorize};

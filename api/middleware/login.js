const config = require('config');

const clientScopes = config.get('services.cmsg.scopes.all');
const clientId = config.get('services.cmsg.client.id');
const clientSecret = config.get('services.cmsg.client.secret');

const { webadeSvc } = require('../oauthService/webadeSvc');
const { cmsgSvc } = require('../msgService/cmsgSvc');

const Problem = require('api-problem');

const login = async (req, res, next) => {
  try {
    let oauthData = await webadeSvc.getToken(clientId, clientSecret, clientScopes);
    let oauthResult = webadeSvc.parseToken(oauthData);
    let cmsgResult = cmsgSvc.parseScopes(oauthData);
    let status = {...oauthResult.status, ...cmsgResult.status};
    let token = oauthResult.token;

    // we will use these in other middleware or our controllers...
    req.token = token;
    req.status = status;
    req.scope = oauthData.scope;

    next();
  } catch (e) {
    if (e instanceof Problem) {
      next(e);
    } else {
      next(new Problem(401, 'OAuth login error', {detail: e.message, path: req.originalUrl}));
    }
  }
};

module.exports = {login};

const axios = require('axios');
const config = require('config');
const log = require('npmlog');

const Problem = require('api-problem');
const utils = require('../components/utils');

const tokenUrl = config.get('cmsg.urls.token');
const topLevelScope = config.get('cmsg.scopes.topLevel');
const createMessageScope = config.get('cmsg.scopes.createMessage');

const secure = (options) => {
  // options
  // quiet - do not throw exceptions...
  // scope - if provided, check if we have the scope
  options = options || {};


  return async (req, res, next) => {
    let error = undefined;
    let token = undefined;
    let scopes = undefined;
    let credentialsGood = false;
    let credentialsAuthenticated = false;
    let hasTopLevel = false;
    let hasCreateMessage = false;

    try {

      //
      // Contact OAuth, "login" our configured CMSG service client
      //
      const oauthResponse = await axios.get(tokenUrl, {
        auth: {
          username: config.get('cmsg.client.id'),
          password: config.get('cmsg.client.secret')
        },
        params: {
          disableDeveloperFilter: true,
          grant_type: 'client_credentials',
          scope: config.get('cmsg.scopes.all')
        }
      }).catch(e => {
        error = `OAuth token error ${tokenUrl}: ${e.message}`;
        log.error('', error);
        if (!options.quiet) {
          throw new Problem(e.response.status, 'OAuth token error', {detail: e.message, tokenUrl: tokenUrl});
        }
      });

      if (!error) {
        log.verbose(utils.prettyStringify(oauthResponse.data));
      }

      if (!error && !utils.responseOk(oauthResponse.status)) {
        error = `Error getting OAuth token from ${tokenUrl}: ${oauthResponse.status} - ${oauthResponse.statusText}`;
        log.error('', error);
        if (!options.quiet) {
          throw new Problem(oauthResponse.status, 'OAuth token response error', {detail: oauthResponse.statusText, tokenUrl: config.get('cmsg.urls.token')});
        }
      }

      //
      // We have a valid response from the OAuth server, now let's see if we have a valid access token
      //
      if (!error) {
        credentialsGood = !oauthResponse.data.error;
        credentialsAuthenticated = false;

        if (oauthResponse.data.error) {
          if ('unauthorized' !== oauthResponse.data.error || 'Bad credentials' !== oauthResponse.data.error_description) {
            error = `Could not determine OAuth credentials: ${oauthResponse.data.error}`;
            log.error('', error);
            if (!options.quiet) {
              throw new Problem(401, 'Authentication error', {detail: error, tokenUrl: config.get('cmsg.urls.token')});
            }
          }
        }

        if (credentialsGood) {
          credentialsAuthenticated = (oauthResponse.data.access_token && oauthResponse.data.access_token.length >= 16);
          if (!credentialsAuthenticated) {
            error = 'Credentials for Service are not authenticated.  Access token is invalid.';
            log.error('', error);
            if (!options.quiet) {
              throw new Problem(401, 'Authentication error', {detail: error, tokenUrl: config.get('cmsg.urls.token')});
            }
          }
          token = oauthResponse.data.access_token;
        }

      }

      //
      // Have a valid access token, now parse out scopes
      //
      if (!error) {
        scopes = oauthResponse.data.scope ? oauthResponse.data.scope : '';
        hasTopLevel = (scopes.split(' ').indexOf(topLevelScope) >= 0);
        hasCreateMessage = (scopes.split(' ').indexOf(createMessageScope) >= 0);
        if (options.scope) {
          // need to check if we have this scope.
          if (scopes.split(' ').indexOf(options.scope) < 0) {
            error = `Service Client has not been authorized for ${options.scope}.`;
            log.error('', error);
            if (!options.quiet) {
              throw new Problem(401, 'Authorization error', {detail: error});
            }
          }
        }
      }

      req.token = token;
      req.status = {
        credentialsGood: credentialsGood,
        credentialsAuthenticated: credentialsAuthenticated,
        hasTopLevel: hasTopLevel,
        hasCreateMessage: hasCreateMessage,
        error: error
      };
      req.scope = scopes;

      next();
    } catch (e) {
      if (e instanceof Problem) {
        if (!options.quiet) {
          next(e);
        } else {
          next();
        }
      } else {
        error = `Unknown error during authentication and authorization process: ${e.message}`;
        log.error('', error);
        if (!options.quiet) {
          next(new Problem(401, 'Authentication/Authorization error', {detail: error, path: req.originalUrl}));
        } else {
          req.status = {
            credentialsGood: credentialsGood,
            credentialsAuthenticated: credentialsAuthenticated,
            hasTopLevel: hasTopLevel,
            hasCreateMessage: hasCreateMessage,
            error: error
          };
          next();
        }
      }
    }
  };
};
module.exports = {secure};

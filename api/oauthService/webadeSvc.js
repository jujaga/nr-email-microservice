const axios = require('axios');
const config = require('config');
const log = require('npmlog');

const utils = require('../components/utils');

const Problem = require('api-problem');

const tokenUrl = config.get('services.cmsg.urls.token');

const webadeSvc = {
  getToken: async (username, password, scope) => {
    const response = await axios.get(tokenUrl, {
      auth: {
        username: username,
        password: password
      },
      params: {
        disableDeveloperFilter: true,
        grant_type: 'client_credentials',
        scope: scope
      }
    }).catch(e => {
      throw new Problem(e.response.status, 'OAuth token error', {detail: e.message, tokenUrl: config.get('services.cmsg.urls.token')});
    });

    log.verbose(utils.prettyStringify(response.data));

    if (!utils.responseOk(response.status)) {
      log.error('', 'Error getting OAuth token from %s: %d - %s', tokenUrl, response.status, response.statusText);
      throw new Problem(response.status, 'OAuth token response error', {detail: response.statusText, tokenUrl: config.get('services.cmsg.urls.token')});
    }

    return response.data;
  },

  parseToken: (data) => {
    let token = undefined;
    let status = {
      credentialsGood: !data.error,
      credentialsAuthenticated: false,
      error: undefined,
    };

    if (data.error) {
      if ('unauthorized' !== data.error || 'Bad credentials' !== data.error_description) {
        status.error = `Could not determine OAuth credentials: ${data.error}`;
      }
    }

    if (status.credentialsGood) {
      status.credentialsAuthenticated = (data.access_token && data.access_token.length >= 16);
      if (!status.credentialsAuthenticated) {
        status.error = 'Credentials for Service are not authenticated.  Access token is invalid.';
      }
      token = data.access_token;
    }

    return {token, status};
  }
};

module.exports = { webadeSvc };

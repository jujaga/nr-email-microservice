const axios = require('axios');
const config = require('config');
const log = require('npmlog');

const {prettyStringify} = require('./utils');

const oidcDiscovery = async () => {
  try {
    const response = await axios.get(config.get('oidc.discovery'));

    log.verbose('oidcDiscovery', prettyStringify(response.data));
    return response.data;
  } catch (error) {
    log.error('oidcDiscovery', `OIDC Discovery failed - ${error.message}`);
    return error.response.data;
  }
};

module.exports = {oidcDiscovery};

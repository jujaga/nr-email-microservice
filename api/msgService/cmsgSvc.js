const axios = require('axios');
const config = require('config');
const log = require('npmlog');

const utils = require('../components/utils');

const ROOT_URL = config.get('cmsg.urls.root');
const MESSAGES_URL = `${ROOT_URL}messages`;

const Problem = require('api-problem');

const cmsgSvc = {
  healthCheck: async (token) => {
    let error = undefined;
    const response = await axios.get(ROOT_URL, {
      headers: {
        'Authorization':`Bearer ${token}`,
        'Content-Type':'application/json'
      }
    }
    ).catch(e => {
      error = `Error verifying Common Messaging API alive at ${ROOT_URL}: ${e.response.status} - ${e.response.statusText}`;
      log.error('', error);
      throw new Problem(e.response.status, 'CMSG Health Check error', {detail: error, cmsgUrl: ROOT_URL});
    });

    log.verbose(utils.prettyStringify(response.data));

    if (response.status !== 200) {
      error = `Error verifying Common Messaging API alive at ${ROOT_URL}: ${response.status} - ${response.statusText}`;
      log.error('', error);
      throw new Problem(response.status, 'CMSG Health Check error', {detail: error, cmsgUrl: ROOT_URL});
    }

    return response.data['@type'] === 'http://nrscmsg.nrs.gov.bc.ca/v1/endpoints';
  },

  sendEmail: async (token, email, attachments) => {
    const defaults = {
      '@type' : 'http://nrscmsg.nrs.gov.bc.ca/v1/emailMessage',
      'links': [
      ],
      'delay': 0,
      'expiration': 0,
      'maxResend': 0
    };


    const requestBody = { ...defaults, ...email };
    requestBody.recipients = email.recipients.replace(/\s/g, '').split(',');
    if (attachments && attachments.length > 0) {
      // add the attachements to the outgoing request.
      requestBody.attachments = attachments;
    }

    const response = await axios.post(
      MESSAGES_URL,
      JSON.stringify(requestBody),
      {
        headers: {
          'Authorization':`Bearer ${token}`,
          'Content-Type':'application/json'
        }
      }
    ).catch(e => {
      // we could be getting specific errors back from cmsg.
      log.error(`Error from Common Messaging: status = ${e.response.status}, msg = ${e.response.statusText}`);
      let cmsgErrors = [];
      if (e.response.data && e.response.data.errors) {
        cmsgErrors = e.response.data.errors.map(e => {
          log.error(`.. ${e.message}`);
          return e.message;
        });
      }
      throw new Problem(e.response.status, 'CMSG Email Message error', {detail: e.message, cmsgUrl: ROOT_URL, cmsgErrors: cmsgErrors});
    });

    log.verbose(utils.prettyStringify(response.data));

    if (response.status !== 202) {
      log.error('', 'Error sending email to Common Messaging API at %s: %d - %s', MESSAGES_URL, response.status, response.statusText);
      throw new Problem(response.status, 'CMSG Email Message error', {detail: `Could not send email through Common Messaging API: ${response.statusText}`, cmsgUrl: ROOT_URL});
    }

    // we also expect the response to be of a certain type...  let's verify that.
    if (response.data['@type'] !== 'http://nrscmsg.nrs.gov.bc.ca/v1/accepted') {
      throw new Problem(500, 'CMSG Email Message error', {detail: `Unexpected return from Common Messaging API: type returned = : ${response.data['@type']}`, cmsgUrl: ROOT_URL});
    }

    return response.data;
  },

  getEmailStatus: async (token, messageId) => {
    const statusUrl = `${MESSAGES_URL}/${messageId}/statuses`;
    let data = {};

    const response = await axios.get(statusUrl, {
      headers: {
        'Authorization':`Bearer ${token}`,
        'Content-Type':'application/json'
      }
    }).catch(e => {
      // we could be getting specific errors back from cmsg.
      log.error(`Error from Common Messaging: status = ${e.response.status}, msg = ${e.response.statusText}`);
      let cmsgErrors = [];
      if (e.response.data && e.response.data.errors) {
        cmsgErrors = e.response.data.errors.map(e => {
          log.error(`.. ${e.message}`);
          return e.message;
        });
      }
      throw new Problem(e.response.status, 'CMSG Email Statuses error', {detail: e.message, cmsgUrl: ROOT_URL, cmsgErrors: cmsgErrors});
    });
    data = response.data;

    if (response.status !== 200) {
      log.error('', 'Error retreiving status from Common Messaging API at %s: %d - %s', statusUrl, response.status, response.statusText);
      throw new Problem(response.status, 'CMSG Email Statuses error', {detail: `Could not retrieve email status through Common Messaging API: ${response.statusText}`, cmsgUrl: ROOT_URL});
    }
    return data;
  },

  parseScopes: (data) => {
    let status = {
      hasTopLevel: false,
      hasCreateMessage: false
    };
    status.hasTopLevel = (data.scope && data.scope.split(' ').indexOf(config.get('cmsg.scopes.topLevel')) >= 0);
    status.hasCreateMessage = (data.scope && data.scope.split(' ').indexOf(config.get('cmsg.scopes.createMessage')) >= 0);

    return {status};
  },

  parseMessageId: (data) => {
    let splitHref = data.links[0].href.split('/').reverse();
    // expect statuses / messageId / messages / <path>
    return splitHref[1];
  },


  parseStatusType: (data) => {
    if (data.elements.length === 0) {
      return '';
    }
    let el = data.elements[0];
    return el.type;
  }


};

module.exports = { cmsgSvc };

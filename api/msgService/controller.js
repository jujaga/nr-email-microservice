const config = require('config');
const fileUtils = require('../components/fileUtils');
const Problem = require('api-problem');

const {relatedLinks} = require('./relatedLinks');
const { cmsgSvc } = require('../msgService/cmsgSvc');

const getConfig = async (req, res) => {
  let uploads = {... config.get('server.uploads')};
  delete uploads.path;
  res.status(200).json({
    data: {
      attachments: uploads,
      defaultSender: config.get('cmsg.sender')
    },
    links: relatedLinks.createLinks(req)
  });
};

const getHealth = async (req, res) => {
  // we must have already used the login middleware.
  // we examine what login has placed into our request.

  // need oauth token for our service client for the Common Messaging Service
  // need to check the credentials (valid/good, authenticated in env)
  // need to check the expected scopes (top level, create/send message)
  // finally need to ping the Common Messaging Service to see if it is up.


  req.status.cmsgApiHealthy = false;
  if (req.status.hasTopLevel) {
    try {
      req.status.cmsgApiHealthy = await cmsgSvc.healthCheck(req.token);
    } catch (e) {
      if (e instanceof Problem) {
        req.status.error = e.detail;
      } else {
        req.status.error = e.message;
      }
    }
  }

  res.status(200).json({
    data: {
      cmsg: req.status
    },
    links: relatedLinks.createLinks(req)
  });

};

const sendEmail = async (req, res, next) => {
  let email = {};
  let filenames = [];
  let attachments = [];
  try {
    // extract what we need from the request
    email = req.body;
    filenames = email.filenames;
    // remove filenames field from email, we don't want to send this to the cmsg service.
    delete email.filenames;
    // convert our filenames to acceptable attachment model.
    if (filenames && filenames.length > 0) {
      attachments = await fileUtils.convertFiles(filenames);
    }
    // send the email and attachements
    let sendResponse = await cmsgSvc.sendEmail(req.token, email, attachments);
    let messageId = cmsgSvc.parseMessageId(sendResponse);
    res.status(200).json({
      data: {
        messageId: messageId
      },
      links: relatedLinks.createLinks(req, [{r:'status', m:'GET', p:[req.path, messageId, 'status'].join('/')}])
    });

  } catch (error) {
    next(error);
  } finally {
    // check for presence of uploaded files, delete them if they exist....
    if (filenames && filenames.length >0) {
      await fileUtils.deleteFiles(filenames);
    }
  }
};

const getEmailStatus = async (req, res) => {

  let result = await cmsgSvc.getEmailStatus(req.token, req.params.messageId);
  let statuses = [];

  if (result.elements && result.elements.length > 0) {
    statuses = result.elements.map((el) => {
      let recipient = el.recipient.startsWith('EMAIL:') ? el.recipient.substring(6) : el.recipient;
      return {messageId: el.messageIdentifier, recipient: recipient, type: el.type, content: el.content, date: el.date};
    });
  }

  res.status(200).json({
    data: {
      statuses: statuses
    },
    links: relatedLinks.createLinks(req)
  });

};

const handleFiles = async (req, res) => {
  res.status(200).json({
    data: {
      files: req.files.map(f => {
        let file = {... f};
        delete file.fieldname;
        delete file.destination;
        delete file.path;
        return file;
      })
    },
    links: relatedLinks.createLinks(req, [{r:'email', m:'POST', p:'/email'}])
  });
};

module.exports = {getConfig, getHealth, sendEmail, getEmailStatus, handleFiles};

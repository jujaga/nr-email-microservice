const { Buffer } = require('buffer');
const config = require('config');
var fs = require('fs');
const log = require('npmlog');
const util = require('util');
const unlink = util.promisify(fs.unlink);
const utils = require('./utils');

const fileUtils = {
  encode_base64: (filename) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filename, function(error, data){
        if(error) {
          reject(error);
        } else {
          var buf = Buffer.from(data);
          var base64 = buf.toString('base64');
          resolve(base64);
        }
      });
    });
  },

  convertFile: (file) => {
    return new Promise((resolve, reject) => {
      try {
        fileUtils.encode_base64(fileUtils.filePath(file)).then(encoded => {
          resolve({
            name: file.originalname,
            fileType: config.get('server.uploads.fileType'),
            content: encoded
          });
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  convertFiles: (files) => {
    return Promise.all(files.map(file => fileUtils.convertFile(file)));
  },

  deleteFiles: async (files) => {
    try {
      const unlinkPromises = files.map(file => unlink(fileUtils.filePath(file)));
      return Promise.all(unlinkPromises);
    } catch(err) {
      log.error(err);
    }
  },

  filePath: (file) => {
    const path = utils.removeTrailing(config.get('server.uploads.path'), '/');
    const name = utils.removeLeading(file.filename, '/');
    return `${path}/${name}`;
  }

};

module.exports = fileUtils;

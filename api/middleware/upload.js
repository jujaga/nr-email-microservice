const config = require('config');
const multer = require('multer');
const path = require('path');

const uploadsDir = path.resolve(config.get('server.uploads.path'));
const formFieldName = config.get('server.uploads.fieldName');
const maxFileSize = parseInt(config.get('server.uploads.fileSize'));
const maxFileCount = parseInt(config.get('server.uploads.fileCount'));

const Problem = require('api-problem');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now());
  }
});

const upload = (req, res, next) => {
  // build up our handler based on the configuration.
  const mw = multer({ storage: storage, limits: {fileSize: maxFileSize, files: maxFileCount} }).array(formFieldName);
  mw(req, res, function (err) {
    // detect multer errors, send back nicer errors to express...
    if (err instanceof multer.MulterError) {
      switch(err.code) {
      case 'LIMIT_FILE_SIZE':
        next(new Problem(400, 'Upload file error', { detail: `Upload file size is limited to ${maxFileSize} bytes`}));
        break;
      case 'LIMIT_FILE_COUNT':
        next(new Problem(400, 'Upload file error', { detail: `Upload is limited to ${maxFileCount} files`}));
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        next(new Problem(400, 'Upload file error', { detail: 'Upload encountered an unexpected file'}));
        break;
      // we don't expect that we will encounter these in our api/app, but here for completeness
      case 'LIMIT_PART_COUNT':
        next(new Problem(400, 'Upload file error', { detail: 'Upload rejected: upload form has too many parts'}));
        break;
      case 'LIMIT_FIELD_KEY':
        next(new Problem(400, 'Upload file error', { detail: 'Upload rejected: upload field name for the files is too long'}));
        break;
      case 'LIMIT_FIELD_VALUE':
        next(new Problem(400, 'Upload file error', { detail: 'Upload rejected: upload field is too long'}));
        break;
      case 'LIMIT_FIELD_COUNT':
        next(new Problem(400, 'Upload file error', { detail: 'Upload rejected: too many fields'}));
        break;
      default:
        next(new Problem(400, 'Upload file error', { detail: `Upload failed with the following error: ${err.message}`}));
      }
    } else if (err) {
      // send this error to express...
      next(new Problem(400, 'Unknown upload file error', { detail: err.message}));
    } else {
      // all good, carry on.
      next();
    }
  });
};

module.exports = { storage, upload };

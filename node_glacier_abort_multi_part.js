var minm = require('minimist');

var argv = require('minimist')(process.argv.slice(2));

var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')
var vaultName = argv.vaultname || 'amax-photo-storage';

var myConfig = new AWS.Config({
  accessKeyId: creds.AccessKeyID,
  secretAccessKey: creds.SecretAccessKey,
  region: 'us-west-1'
});

var jobId = argv.id;

if (!jobId) {
    throw "ERROR: must pass an id via --id <id>"
}

var params = {
  accountId: '-',
  vaultName: vaultName,
  uploadId: argv.id
};

var glacier = new AWS.Glacier(myConfig);

glacier.abortMultipartUpload(params, function(err, data) {
  if (err) {
    console.log("failed")
    console.log(err, err.stack);
  } else {
    console.log("suceeded")
    console.log(data);
  }
});
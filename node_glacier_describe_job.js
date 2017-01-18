var minm = require('minimist');

var argv = require('minimist')(process.argv.slice(2));

var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')
var jobId = argv.id;
var vaultName = argv.vaultname ;

if (!vaultName) {
    throw "ERROR: must pass a vaultname via --vaultname <vaultname>"
}
if (!jobId) {
    throw "ERROR: must pass an id via --id <id>"
}

var myConfig = new AWS.Config({
  accessKeyId: creds.AccessKeyID,
  secretAccessKey: creds.SecretAccessKey,
  region: 'us-west-1'
});

var glacier = new AWS.Glacier(myConfig);

var params = {
  accountId: "-",
  jobId: jobId,
  vaultName: vaultName
};

 glacier.describeJob(params, function(err, data) {
  if (err) {
    console.log("failed")
    console.log(err, err.stack);
  } else {
    console.log("suceeded")
    console.log(data);
  }
});
var minm = require('minimist');

var argv = require('minimist')(process.argv.slice(2));

var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')
var vaultName = argv.vaultname ;

if (!vaultName) {
    throw "ERROR: must pass a vaultname via --vaultname <vaultname>"
}

var myConfig = new AWS.Config({
  accessKeyId: creds.AccessKeyID,
  secretAccessKey: creds.SecretAccessKey,
  region: 'us-west-1'
});

var glacier = new AWS.Glacier(myConfig);

var params = {
  accountId: "-",
  jobParameters: {
    Description: "test inventory",
    Format: "JSON",
    Type: "inventory-retrieval"
  },
  vaultName: vaultName
};

 glacier.initiateJob(params, function(err, data) {
  if (err) {
    console.log("failed")
    console.log(err, err.stack);
  } else {
    console.log("==========================")
    console.log("ID for notifications: ", data.jobId);
    console.log("==========================")
  }
 });

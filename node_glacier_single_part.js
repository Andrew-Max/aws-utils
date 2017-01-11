var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')

var myConfig = new AWS.Config({
  accessKeyId: creds.AccessKeyID,
  secretAccessKey: creds.SecretAccessKey,
  region: 'us-west-1'
});

var glacier = new AWS.Glacier(myConfig)

var filePath = '/home/yotta/zips/pics/100.zip';
var file = fs.readFileSync(filePath);

var params = {
  accountId: '-',
  vaultName: 'amax-photos',
  archiveDescription: '100media',
  body: file,
};

glacier.uploadArchive(params, function(err, data) {
  if (err) {
    console.log("=========ERROR==========",err, err.stack); // an error occurred
  } else {
    console.log("=========Success==========",data);           // successful response
  }
});

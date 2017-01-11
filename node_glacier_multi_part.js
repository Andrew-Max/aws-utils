var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')
var fs =  require('fs');
var filePath = '/home/yotta/zips/pics/100.zip';
var encoding = "utf8";

var myConfig = new AWS.Config({
  accessKeyId: creds.AccessKeyID,
  secretAccessKey: creds.SecretAccessKey,
  region: 'us-west-1'
});

var glacier = new AWS.Glacier(myConfig)

var buffer = fs.readFileSync(filePath);
// var buffer = new Buffer(2.5 * 1024 * 1024); // 2.5MB buffer
var partSize = 1024 * 1024; // 1MB chunks,
var numPartsLeft = Math.ceil(buffer.length / partSize);
var startTime = new Date();

var params = {
  accountId: '-',
  vaultName: 'amax-photos',
  archiveDescription: '100media',
  partSize: partSize.toString(),
};

// Compute the complete SHA-256 tree hash so we can pass it
// to completeMultipartUpload request at the end
var treeHash = glacier.computeChecksums(buffer).treeHash;

// Initiate the multipart upload
console.log('Initiating upload to', params.vaultName);
glacier.initiateMultipartUpload(params, function (mpErr, multipart) {
    if (mpErr) { console.log('Error!', mpErr.stack); return; }
    console.log("Got upload ID", multipart.uploadId);

    // Grab each partSize chunk and upload it as a part
    for (var i = 0; i < buffer.length; i += partSize) {
        var end = Math.min(i + partSize, buffer.length),
            partParams = {
                accountId: '-',
                vaultName: params.vaultName,
                uploadId: multipart.uploadId,
                range: 'bytes ' + i + '-' + (end-1) + '/*',
                body: buffer.slice(i, end)
            };

        // Send a single part
        console.log('body length: ', partParams.body.length)
        console.log('Uploading part', i, '=', partParams.range);

        glacier.uploadMultipartPart(partParams, function(multiErr, mData) {
            if (multiErr) {
                console.log('multiErr: ', multiErr)
                return;
            }

            console.log("Completed part", this.request.params.range);

            if (--numPartsLeft > 0) {
                console.log('no parts left: finished')
                return; // complete only when all parts uploaded
            }

            var doneParams = {
                vaultName: params.vaultName,
                uploadId: multipart.uploadId,
                archiveSize: buffer.length.toString(),
                checksum: treeHash // the computed tree hash
            };

            console.log("Completing upload...");

            glacier.completeMultipartUpload(doneParams, function(err, data) {
                if (err) {
                    console.log("An error occurred while uploading the archive");
                    console.log(err);
                } else {
                    var delta = (new Date() - startTime) / 1000;
                    console.log('Completed upload in', delta, 'seconds');
                    console.log('Archive ID:', data.archiveId);
                    console.log('Checksum:  ', data.checksum);
                }
            });
        });
    }
});
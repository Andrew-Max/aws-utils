var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')
var fs =  require('fs');
var encoding = "utf8";
var partSize = 1024 * 1024; // 1MB chunks,
var numPartsLeft = Math.ceil(buffer.length / partSize);
var startTime = new Date();
var byteIncrementer = 0;
var MBcounter = 0;
var multipart;

//move these out to args
var filePath = '/home/yotta/zips/pics/100.zip';
var vaultName = 'amax-photo-storage';
var archiveDescription = '100media'

var myConfig = new AWS.Config({
  accessKeyId: creds.AccessKeyID,
  secretAccessKey: creds.SecretAccessKey,
  region: 'us-west-1'
});
var params = {
  accountId: '-',
  vaultName: vaultName,
  archiveDescription: archiveDescription,
  partSize: partSize.toString(),
};

var buffer = fs.readFileSync(filePath);
var glacier = new AWS.Glacier(myConfig)
var treeHash = glacier.computeChecksums(buffer).treeHash;

new Promise(function (resolve, reject) {
    glacier.initiateMultipartUpload(params, function (mpErr, multi) {
        if (mpErr) { console.log('Error!', mpErr.stack); return; }
        console.log("Got upload ID", multi.uploadId);
        multipart = multi
        resolve();
    });
}).then(function () {
    console.log("total upload size: ", buffer.length);
    recursivelyUploadPart(byteIncrementer)
}).catch(function (err) {console.log(err)});

function recursivelyUploadPart() {
    var end = Math.min(byteIncrementer + partSize, buffer.length);

    var partParams = {
        accountId: '-',
        uploadId: multipart.uploadId,
        vaultName: params.vaultName,
        range: 'bytes ' + byteIncrementer + '-' + (end-1) + '/*',
        body: buffer.slice(byteIncrementer, end)
    };

    console.log('Uploading part', byteIncrementer, '=', partParams.range);
    glacier.uploadMultipartPart(partParams, function(multiErr, mData) {
        if (multiErr) {
            console.log('part upload error: ', multiErr)
            console.log('retrying')
            return recursivelyUploadPart(byteIncrementer)
        } else {
            console.log("Completed part", this.request.params.range);

            if (--numPartsLeft > 0) {
                MBcounter++;
                console.log("MB Uploaded: ", MBcounter);
                byteIncrementer += partSize;
                console.log('recursing');
                return recursivelyUploadPart(byteIncrementer);
            } else {
                var doneParams = {
                    vaultName: params.vaultName,
                    uploadId: multipart.uploadId,
                    archiveSize: buffer.length.toString(),
                    checksum: treeHash // the computed tree hash
                };
                console.log("Completing upload...");
                glacier.completeMultipartUpload(doneParams, function(err, data) {
                    if (err) {
                        console.log("An error occurred while uploading the archive: ", err);
                    } else {
                        var delta = (new Date() - startTime) / 1000;
                        console.log('Completed upload in', delta, 'seconds');
                        console.log('Archive ID:', data.archiveId);
                        console.log('Checksum:  ', data.checksum);
                    }
                });
            }
        }
    });
};

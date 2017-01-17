var minm = require('minimist');

var argv = require('minimist')(process.argv.slice(2));
var AWS = require('aws-sdk');
var creds = require('/home/yotta/.aws')
var fs =  require('fs');
var encoding = "utf8";
var partSize = 1024 * 1024; // 1MB chunks,
var startTime = new Date();
var byteIncrementer = 0;
var MBcounter = 0;
var multipart;

//move these out to args
var filePath = argv.filepath;
var vaultName = argv.vaultname || 'amax-photo-storage';
var archiveDescription = argv.description

if (!filePath) {
    throw "ERROR: must pass file path via --filepath <filepath>"
}

if (!archiveDescription) {
    throw "ERROR: must pass description path via --description <description>"
}

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
var numPartsLeft;
var glacier = new AWS.Glacier(myConfig)
var treeHash = glacier.computeChecksums(buffer).treeHash;

new Promise(function (resolve, reject) {
    //pass in upload id and byte starting place to resume a killed upload
    if (argv.multi && argv.lastByte) {
        // change to first byte
        var bytesRemaining = buffer.length - argv.lastByte ;
        numPartsLeft = Math.ceil(bytesRemaining / partSize);
        console.log("numPartsLeft: ", numPartsLeft)
        byteIncrementer = argv.lastByte;
        multipart = { uploadId: argv.multi }
        MBcounter = byteIncrementer / (1024 * 1024)
        console.log("===========================")
        console.log('used existing upload');
        console.log('id: ', multipart.uploadId);
        console.log('starting Byte: ', byteIncrementer);
        console.log('starting with MB completed: ', MBcounter);
        console.log("===========================")

        resolve();
    //if no existing upload info, start new one
    } else {
        numPartsLeft = Math.ceil(buffer.length / partSize);
        glacier.initiateMultipartUpload(params, function (mpErr, multi) {
            if (mpErr) { console.log('Error!', mpErr.stack); return; }
            console.log("===========================")
            conole.log("Initiated new upload with id: ",  multi.uploadId);
            console.log("===========================")
            multipart = multi
            resolve();
        });
    }
}).then(function () {
    if(numPartsLeft > 0) {
        console.log("total upload size: ", buffer.length);
        recursivelyUploadPart(byteIncrementer)
    } else {
        console.log('download already finished: completing')
        //copy paster of other complete code
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
                console.log("==============================");
                console.log('COMPLETED');
                console.log("==============================");
            }
        });
        //copy paster of other complete code
    }

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
                        console.log("==============================");
                        console.log('COMPLETED');
                        console.log("==============================");
                    }
                });
            }
        }
    });
};

var AWS = require('aws-sdk');
var fs = require('fs');
var gm = require('gm');
var express = require('express');
var multer  = require('multer');
var bodyParser = require('body-parser')
var app = express();

var port = process.env.PORT || 3000;

var region = "us-west-2";
AWS.config.update({
	//accessKeyId: 'your-access-key',
	//secretKeyId: 'secret-key',
	region: region,
});

var bucketName = 'BUCKET-NAME';
var photoBucket = new AWS.S3({params: {Bucket: bucketName}});

app.use(bodyParser.text());
//Multer is for handling the file upload.
var upload = multer().single('file');

/**
 * Creates a thumbnail and uploads to S3.
 * @param readStream
 * @param sFileName
 */
function createThumbnail(readStream, sFileName) {
	console.log('creating readStream for thumbnail ' + sFileName);
	var thumbnailReadStream = gm(readStream).resize(240, 240).noProfile().stream();
	
	var key = 'thumbnails/' + sFileName;
	console.log('uploading ' + key);
	photoBucket.upload({
            ACL: 'public-read', 
            Body: thumbnailReadStream, 
            Key: key,
            ContentType: 'application/octet-stream' // force download if it's accessed as a top location
        }).send(function(err,data) {
			console.log('thumbnail upload finished: ' + key);
			console.log(err, data);
			if(err) {
				return res.end(err);
			}
			res.end('Thumbnail was uploaded: ' + key);
		});
}

//returns a readStream
function fetchFromS3(sFilePath) {
	console.log('fetching from S3: ' + sFilePath);
	var params = {Key: sFilePath};
	var readStream = photoBucket.getObject(params).createReadStream();
	return readStream;
}

//This is where SQS messages are accepted as HTTP POST requests.
app.post('/image-uploaded',upload,function(req,res) {
	try {
		console.log('/image-uploaded is requested');
		console.log('request body:');
		console.log(req.body);

		var s3imagePath = JSON.parse(req.body).Records[0].s3.object.key;
		if (s3imagePath === 'uploads/') {
			return res.end();
		}

		var readStream = fetchFromS3(s3imagePath);
		console.log('finished fetching! stream is ready:');

		var sFileName = s3imagePath.split('/').pop();
		console.log('creating thumbnail for ' + sFileName);
		createThumbnail(readStream, sFileName);
	} catch (e) {
		console.log('error parsing message:');
		console.log(e);
		res.end('Error parsing message.');
	}
});

app.listen(port, function () {
  console.log('Listening on port ' + port);
});
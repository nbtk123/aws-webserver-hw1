var express = require('express');
var multer  = require('multer');
var AWS = require('aws-sdk');
var fs = require('fs');
var app = express();
var util = require('util');

var port = process.env.PORT || 3000;

var region = "us-west-2";
AWS.config.update({
	//accessKeyId: 'your-access-key',
	//secretKeyId: 'secret-key',
	region: region,
});

//S3 bucket created with the EB instance
var bucketName = 'BUCKET-NAME';
var photoBucket = new AWS.S3({params: {Bucket: bucketName}});

//Multer is for handling the file upload.
var upload = multer().single('file');

// read index.html, query thumbnails from S3, bind the thumbnails
// into the content of index.html and return this bundle in the response.
app.get('/',function(req,res){
	try {
		console.log('/ requested');

		var html = fs.readFileSync(__dirname + "/index.html", 'utf8');
		var imgs = '';

		console.log('querying thumbnails...');
		photoBucket.listObjects({Prefix: 'thumbnails/'}, function(err, data) {
			if (err) {
				console.log(err, err.stack);
			} else {
				console.log(data);
				//Bind the thumbnails from S3 to the index.html
				for (var i=1; i<data.Contents.length; i++) {
												//'us-west-2' for me
					var thumbnailPath = 'https://s3-REGION.amazonaws.com/BUCKET-NAME/' + data.Contents[i].Key;
					imgs += '<img src="' + thumbnailPath + '"/>'
				}
				html = html.replace('THUMBNAILS_HERE',imgs);
				res.end(html);
			}
		});
	} catch (e) {
		console.log('error occured while requesting /');
		console.log(e);
		res.end('error occured while requesting /');
	}
});

//This is where the form targets to --> here we upload the image to S3.
app.post('/upload/image',upload, function(req,res){
	try {
		console.log('/upload/image requested');
		console.log(req.file);
		var key = 'uploads/' + req.file.originalname.toString();
		console.log('uploading: ' + key);
		photoBucket.upload({
			ACL: 'public-read',
			Body: req.file.buffer,
			Key: key,
			ContentType: 'application/octet-stream' // force download if it's accessed as a top location
		}).send(function(err,data) {
			console.log('Upload finished:');
			console.log(err, data);
			if(err) {
				return res.end(err);
			}

			res.end("File was uploaded to S3!");
		});
	} catch (e) {
		console.log('error occured while requesting /upload/image');
		console.log(e);
		res.end('error occured while uploading');
	}
});

app.listen(port, function () {
  console.log('Listening on port ' + port);
});

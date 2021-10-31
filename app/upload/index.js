const fs = require('fs');

module.exports = function upload(request, response) {
  if( Object.prototype.toString.call( request.files.file ) === '[object Array]' ) {
    request.files.file.forEach(function(entry) {
      fs.writeFile('./public/photos' + decodeURI(entry.name), entry.data, function(err) {
        if(err) {
          return console.log(err);
        }
      });
    });

    response.status(200).send(JSON.stringify({ success: true, fileCount: request.files.file }));
  } else {
    fs.writeFile( './public/photos' + decodeURI(request.files.file.name), request.files.file.data, function(err) {
      if(err) {
        return console.log(err);
      }
    });

    response.status(200).send(JSON.stringify({ success: true, fileCount: request.files.file }));
  }
}

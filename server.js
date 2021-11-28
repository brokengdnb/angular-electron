// get config
let config = require('./app/config/db.config.js');

// SSL
const https = require('https');
const redirectToHTTPS = require('express-http-to-https').redirectToHTTPS

//set a port 3000 !!!
const webDataPort = 80;

// Modules to control application life and create native browser window
//const {app, BrowserWindow, ipcMain, globalShortcut, webContents} = require('electron')
const path = require('path')

// color output terminal ... yea my UX get over it
const ansi = require ('ansicolor').nice


// database
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

// set jwt
const db = require("./models");
const Role = db.role;

db.mongoose
  .connect(config.URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log(("OK") + (" Database " + config.URL));
    console.log("---------------------------------------------");

    initial();
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: "user"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'user' to roles collection");
      });

      new Role({
        name: "moderator"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'moderator' to roles collection");
      });

      new Role({
        name: "admin"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'admin' to roles collection");
      });
    }
  });
}



// API SERVER
// DEPENDICIES

// TODO change the hack with the normal one.... omg...
const fs = require('fs');

const fsHack = require('fs').promises

const request = require('request');
const express = require("express");
const bodyParser = require("body-parser");
// open browser but not in electron
// const expressOasGenerator = require("express-oas-generator");

const fileUpload = require('express-fileupload');
//const multer = require('multer');

//const youtubedl = require('youtube-dl');

//const ffmpeg = require('fluent-ffmpeg');
//const ffmetadata = require("ffmetadata");

let cors = require('cors')

//opload

let multer  = require('multer'),
  upload  = multer({ dest: config.import });


// SET A WEB SERVER
const appe = express(),
  http = require('http').Server(appe),
  io = require('socket.io')(http,  {
    pingTimeout: 60000,
  }),
  geoip = require('geoip-lite');


// SET PUG template rendering
//appe.set('view engine', 'pug');
//appe.set('views',path.join(__dirname, '/views'));

appe.use(express.static(path.join(__dirname, "dist")))


// jwt

require("./app/note/note.routes.js")(appe);
// jwt routes
require("./app/routes/auth.routes")(appe);
require("./app/routes/user.routes")(appe);




appe.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/dist/index.html'));
});

// SET public and upload folder for backup/restore
//appe.use(express.static(path.join(__dirname,  'public')));

// ssl
const appDomain = "app.brokeng.com";
const privateKey  = fs.readFileSync(`/etc/letsencrypt/live/${appDomain}/privkey.pem`, 'utf8');
const certificate = fs.readFileSync(`/etc/letsencrypt/live/${appDomain}/fullchain.pem`, 'utf8');
const credentials = {key: privateKey, cert: certificate};


appe.use("/.well-known", express.static(path.join(__dirname, "/ssl/")));

appe.use(bodyParser.json({limit: "50mb"}));
appe.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

//SET MULTER
//app.use(multer());

// SET FILE UPLOADER
appe.use(fileUpload());
appe.use(cors());

appe.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));


let download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};


// window render
//const mainWindow = require('./app/mainWindow')



// ROUTES
//require("./app/routes/note.routes.js")(appe);



// calculate a size of folder in human readable form baby....
const getAllFiles = function(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  // skip hidden files like .DS_Store etc... HACK but it works
  let betterFiles = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));

  betterFiles.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(dirPath + "/" + file)
    }
  })

  return arrayOfFiles
}

const convertBytes = function(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

  if (bytes == 0) {
    return "n/a"
  }

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))

  if (i == 0) {
    return bytes + " " + sizes[i]
  }

  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i]
}

const getTotalSize = function(directoryPath) {
  const arrayOfFiles = getAllFiles(directoryPath)

  let totalSize = 0

  arrayOfFiles.forEach(function(filePath) {
    totalSize += fs.statSync(filePath).size
  })

  //return convertBytes(totalSize)
  return totalSize
}


// DO NOT CACHE my settings bitch!!!
function requireUncached(module) {
  delete require.cache[require.resolve(module)];
  return require(module);
}


appe.get("/getMovieBasePath", (req, res) => {

  const config = requireUncached("./config/database.json");
  res.status(200).send(config.movies);
});

// dynamic read & calculate /export folder
appe.get("/getStorageExportInfo", (req, res) => {
  const checkDiskSpace = require('check-disk-space')
  const config = requireUncached("./config/database.json");
  let respondData = {};

  // actual size of that folder

  respondData.path = config.export;


  checkDiskSpace(respondData.path).then((diskSpace) => {
    respondData.disk = diskSpace;
    respondData.folder = getTotalSize(respondData.path);

    res.status(200).send(respondData);
  })


})

appe.get("/getDatabaseInfo", (req, res) => {
  const Songs = mongoose.model('Songs')
  const Effects = mongoose.model('Effects')
  const Playlists = mongoose.model('Playlists')
  const Movies = mongoose.model('Movies')

  const dbConfig = require("./config/database.json");

  let databaseData = {};

  databaseData.url = dbConfig.url;

  Songs.collection.stats(function(errSongResults, songsResults) {
    databaseData.songs = songsResults;
    Playlists.collection.stats(function(errPlaylistsResults, playlistsResults) {
      databaseData.playlists = playlistsResults;
      Effects.collection.stats(function(errEffectsResults, effectsResults) {
        databaseData.effects = effectsResults;
        Movies.collection.stats(function(errMoviesResults, moviesResults) {
          databaseData.movies = moviesResults;

          res.status(200).send(databaseData);

        });
      });
    });
  });
});

appe.get("/", (req, res) => {
  res.render(
    'index',
    {
      appName: "AVA",
      appVersion: "f",
      webDataPort: webDataPort
    });

})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// new one

// const ora = require('ora');
// const {exec} = require("child_process");

//const spinner = ora('Loading unicorns').start();


  //globalShortcut.register("CommandOrControl+R", () => {

  //reload()
  //});

  console.log("  AVA - Core  " + ("\n    v0.0.1"));

  console.log("OK" + ' Node.js  ' + process.versions["node"]);
  console.log("OK" + ' Website  ' + "http://127.0.0.1:" + webDataPort);
  console.log("OK" + ' "ssl" ' + path.join(__dirname, config.ssl));

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.



// HOly Jesuis.... and it works!!!
const setImportValueToJSON = (fn, parameter) =>
  fsHack.readFile(fn)
    .then(body => JSON.parse(body))
    .then(json => {
      // manipulate your data here
      json.import = parameter
      return json
    })
    .then(json => JSON.stringify(json))
    .then(body => fsHack.writeFile(fn, body))
    .catch(error => console.warn(error))


//setImportValueToJSON("./config/database.json", arg)




const httpsServer = https.createServer(credentials, appe).listen(443)

const httpServer = http.listen(webDataPort, function(){
  //console.log('   *****  YEA *****  web bitch runing on: http://localhost:' + webDataPort);
  // opens the url in the default browser
  //opn('http://localhost:3000');
});


let nicknames = [];

function filterNullValues(i) {
  return (i!=null);
}

io.on('connection', function(socket){
  // TODO: create model for rooms: socket.join('all');
  //console.log('a user connected');
  io.sockets.emit('connectCounter', Object.keys(io.sockets.sockets).filter(filterNullValues).length);

  //io.sockets.emit('front', 10);

  socket.on('front', function(data){
    console.log(data);
  });


  socket.on('new user', function(data){
    var tmp = {
      id: socket.id,
      data: data,
      geo: geoip.lookup(data.publicIp)
    };

    console.log(tmp);

    nicknames.push(tmp);

    updateNicknames(nicknames);
    updateNewcommer(tmp);
  });

  function updateNicknames(x){
    io.sockets.emit('usernames', x);
  }

  function updateNewcommer(x){
    io.sockets.emit('newcommer', x);
  }

  socket.on('disconnect', function(data){
    var index=nicknames.map(function(x){
      return x.id;
    }).indexOf(socket.id);

    nicknames.splice(index,1);

    io.sockets.emit('connectCounter', Object.keys(io.sockets.sockets).filter(filterNullValues).length);
    //console.log(nicknames);
    updateNicknames(nicknames);
  });
});


// swagger?

//expressOasGenerator.init(app, {});


//TODO: BBW
/*


appe.post('/uploadImageForSong.html', function(request, response) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  if( Object.prototype.toString.call( request.files.file ) === '[object Array]' ) {
    request.files.file.forEach(function(entry) {
      fs.writeFile(directoryPath + '/tn.png', entry.data, function(err) {
        if(err) {
          return console.log(err);
        }
      });
    });

    response.status(200).send(JSON.stringify({ success: true, fileCount: request.files.file }));
  } else {
    fs.writeFile(directoryPath + '/tn.png', request.files.file.data, function(err) {
      if(err) {
        return console.log(err);
      }
    });

    response.status(200).send(JSON.stringify({ success: true, fileCount: request.files.file }));
  }
});


// Responsible for handling the file upload.
appe.post('/upload.html', function(request, response) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  if( Object.prototype.toString.call( request.files.file ) === '[object Array]' ) {
    request.files.file.forEach(function(entry) {
      fs.writeFile(directoryPath + '/' + decodeURI(entry.name), entry.data, function(err) {
        if(err) {
          return console.log(err);
        }
      });
    });

    response.status(200).send(JSON.stringify({ success: true, fileCount: request.files.file }));
  } else {
    fs.writeFile(directoryPath + '/' + decodeURI(request.files.file.name), request.files.file.data, function(err) {
      if(err) {
        return console.log(err);
      }
    });

    response.status(200).send(JSON.stringify({ success: true, fileCount: request.files.file }));
  }
});



// RENDER ALL COLLECTIONS IN DATABASE
appe.get("/schema", (req, res) => {
  if(!req.query.collections) {
    return res.status(404).send()
  } else {
    var Schema = mongoose.model(req.query.collections).schema;
    res.status(200);
    res.send(Schema);
    res.end();
  }
});

var YTFFactive = false;
io.sockets.emit('YTFFactive', false);

appe.post('/import-song', function(req, res) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;

  console.log(req.body.path);

  const mm = require('music-metadata');
  const redColor = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADMCAYAAAA/IkzyAAAEdklEQVR4Xu3TsQ0AMAgEMdh/6ETKBLne1F9Z3J6ZM44AgS+BFcyXkxGBJyAYj0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKYELAVmXRCoVZTkAAAAASUVORK5CYII=";
  let redColorBase64Data = redColor.replace(/^data:image\/png;base64,/, "");

  let songData = [];

  ffmpeg.ffprobe({ source: req.body.path}, function(err, ffmpegInfo){
    songData.push({ffmpeg: ffmpegInfo});

    mm.parseFile(decodeURIComponent(req.body.path))
      .then( meta => {
        songData.push({meta: meta});

        //listData.push({meta: meta});
        if(typeof meta.common.picture != "undefined") {
          console.log("writing IMG for - " + ffmpegInfo.format.filename + '.png');
          fs.writeFile(ffmpegInfo.format.filename + '.png', meta.common.picture[0].data, 'base64', function(err) {
            // wow
          });
        } else {
          console.log("creating RED for - " + ffmpegInfo.format.filename + '.png');

          fs.writeFile(ffmpegInfo.format.filename + '.png', redColorBase64Data, 'base64', function(errr) {
            if(errr) {
              return console.log(errr);
            }
          });

        }

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(songData));

        res.end();
      })
      .catch( err => {
        console.error(err.message);
      });


  });




  /!*mm.parseFile(path.join(__dirname, 'import/' + req.body.data.path))
      .then( meta => {
          const fileSizeInBytes = fs.statSync(path.join(__dirname, 'import/') + req.query.path).size;
          if(typeof meta.common.picture != "undefined") {
              fs.writeFile(path.join(__dirname, 'import/tn.png'), meta.common.picture[0].data, 'base64', function(err) {
                  res.status(200);
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({ path: "ok", data: meta, size: fileSizeInBytes, path: req.query.path }));

                  res.end();
              });
          } else {

              res.status(200);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({ path: "nope", data: meta, size: fileSizeInBytes, path: req.query.path }));

              res.end();
          }
      })
      .catch( err => {
          console.error(err.message);
      });*!/

});


appe.get('/csv', function(req, res) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  const csvFilePath = directoryPath + "/" + req.query.path;
  const csv = require('csvtojson')

  csv()
    .fromFile(csvFilePath)
    .then((jsonObj)=>{
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ files: jsonObj }));
      res.end();
    })
});

appe.get('/ytimg', function(req, res) {
  if(req.query.id) {
    let config = requireUncached('./config/database.json');
    const url = 'https://www.youtube.com/watch?v=' + req.query.id;

    const options = {
      // Downloads available thumbnail.
      all: false,
      // The directory to save the downloaded files in.
      cwd: config.import,
    };

    let random = (new Date()).toString();

    download('https://i.ytimg.com/vi/' + req.query.id + '/sddefault.jpg' + "?cb=" + random, config.import + '/temp.jpg', function(){

      /!*sharp(path.join(__dirname, 'ytdl/down.jpg'))
          .resize(200)
          .toFile(path.join(__dirname, 'import/temp.jpg'), (errr, info) => {
            if (errr) console.error('image processing: ' + errr);


          });*!/


      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ file: 'import/temp.jpg' }));
      res.end();

    });
  } else {
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ file: "NOT-FOUND" }));
    res.end();
  }


});



appe.get('/getMovieInfo', function(req, res) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  ffmpeg({ source: directoryPath + "/" + req.query.path, nolog: true })
    .takeScreenshots({ timemarks: [ req.query.time ] }, config.export, function(err, filenames) {

    });


  ffmpeg.ffprobe({ source: directoryPath + "/" + req.query.path}, function(err, infoo){
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ path: req.query.path, info: infoo }));

    res.end();
  });
});

appe.get('/getEffectInfo', function(req, res) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  ffmpeg({ source: req.query.path, nolog: true })
    .takeScreenshots({ timemarks: [ req.query.time ] }, config.export, function(err, filenames) {

    });

  ffmpeg.ffprobe({ source: req.query.path}, function(err, infoo){
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ path: req.query.path, info: infoo }));

    res.end();
  });
});

appe.get('/getMoveInfo', function(req, res) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  const mm = require('music-metadata');
  const extension = path.extname(directoryPath + "/" + req.query.path);

  if(extension === ".mp3"
    || extension === ".flac"
    || extension === ".webm"
    || extension === ".acc"
    || extension === ".m4a"
    || extension === ".wav") {

    mm.parseFile(directoryPath + '/' + req.query.path)
      .then( metadata => {
        if(typeof metadata.common.picture != "undefined") {
          fs.writeFile(config.export + '/tn.png', metadata.common.picture[0].data, 'base64', function(err) {
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ path: req.query.path }));

            res.end();

          });
        } else {

          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ path: "no image?" }));

          res.end();
        }
      })
      .catch( err => {
        console.error(err.message);
      });


  } else {
    ffmpeg({ source: directoryPath + "/" + req.query.path, nolog: true })
      .takeScreenshots({ timemarks: [ '00:00:02.000' ], size: '1270x720' }, config.export, function(err, filenames) {

      });

    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ path: req.query.path }));

    res.end();
  }
});


appe.post('/moveCsvImg', function(req, res) {

  //let sharp = require("sharp");

  const mv = require('mv');

  for(let i = 0; i < req.body.data.data.length; i++) {
    mv(req.body.data.data[i].path + '.png', config.export + '/imgs/' + req.body.data.data[i]._id + '.png', function(renameError) {
      if ( renameError ) console.error('rename: ' + renameError);


    });

    /!* sharp()
         .resize(150)
         .toFile(path.join(__dirname, 'export/imgs/' + req.body.data.data[i]._id + '.png'), (errr, info) => {
           if (errr) console.error('image processing: ' + errr);

         });*!/

    if(i === (req.body.data.data.length - 1)){
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({data: req.body.data.data}))

      res.end();
    }
  }



});

appe.post('/getImportedCSV', function(req, res) {
  const mm = require('music-metadata');
  const redColor = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADMCAYAAAA/IkzyAAAEdklEQVR4Xu3TsQ0AMAgEMdh/6ETKBLne1F9Z3J6ZM44AgS+BFcyXkxGBJyAYj0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKQHB+AECQUAwAcuUgGD8AIEgIJiAZUpAMH6AQBAQTMAyJSAYP0AgCAgmYJkSEIwfIBAEBBOwTAkIxg8QCAKCCVimBATjBwgEAcEELFMCgvEDBIKAYAKWKYELAVmXRCoVZTkAAAAASUVORK5CYII=";
  var redColorBase64Data = redColor.replace(/^data:image\/png;base64,/, "");

  for(let i = 0; i < req.body.data.length; i++) {



    ffmpeg.ffprobe({ source: req.body.data[i].Location}, function(err, infoo){
      //listData.push({ffmpeg: infoo})

      mm.parseFile(infoo.format.filename)
        .then( meta => {
          //listData.push({meta: meta});
          if(typeof meta.common.picture != "undefined") {
            fs.writeFile(infoo.format.filename + '.png', meta.common.picture[0].data, 'base64', function(err) {
              // wow
            });
          } else {
            console.log("creating RED for - " + infoo.format.filename + '.png');

            fs.writeFile(infoo.format.filename + '.png', redColorBase64Data, 'base64', function(errr) {
              if(errr) {
                return console.log(errr);
              }
            });
          }
        })
        .catch( err => {
          console.error(err.message);
        });

      if(i === (req.body.data.length - 1)){
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(req.body.data));

        res.end();
      }
    });
  }



  /!*mm.parseFile(path.join(__dirname, 'import/' + req.body.data.path))
      .then( meta => {
          const fileSizeInBytes = fs.statSync(path.join(__dirname, 'import/') + req.query.path).size;
          if(typeof meta.common.picture != "undefined") {
              fs.writeFile(path.join(__dirname, 'import/tn.png'), meta.common.picture[0].data, 'base64', function(err) {
                  res.status(200);
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({ path: "ok", data: meta, size: fileSizeInBytes, path: req.query.path }));

                  res.end();
              });
          } else {

              res.status(200);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({ path: "nope", data: meta, size: fileSizeInBytes, path: req.query.path }));

              res.end();
          }
      })
      .catch( err => {
          console.error(err.message);
      });*!/
})

appe.get('/getImportPath', function(req, res) {
  config = requireUncached('./config/database.json');

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ path: config.import }));
  res.end();
})

appe.post('/deleteImportFile', function(req, res) {
  fs.unlink(req.body.path,function(error) {
    if (error) return console.log(error);

    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ local: 'ok' }));
    res.end();
  })
})

appe.post('/removeImportedSong', function(req, res) {
  fs.unlink(path.join(__dirname, 'import/' + req.body.data.path),function(error) {
    if (error) return console.log(error);

    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ local: 'ok' }));
    res.end();
  });
})

appe.post('/removeSongAndImg', function(req, res) {
  let config = requireUncached('./config/database.json');

  fs.unlink(config.export +  '/imgs/' + req.body.data + '.png',function(error) {
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ local: 'ok' }));
    res.end();
  });
})

appe.post('/download-google-image', function(req, res) {
  let config = requireUncached('./config/database.json');

  console.log(req.body.url);

  download(req.body.url, config.import + '/tn.jpeg', function(){

    /!*sharp(path.join(__dirname, 'ytdl/down.jpg'))
        .resize(200)
        .toFile(path.join(__dirname, 'import/temp.jpg'), (errr, info) => {
          if (errr) console.error('image processing: ' + errr);
        });*!/

    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ status: 'ok' }));
    res.end();
  });
})

appe.post('/moveImportedSong', function(req, res) {
  fs.rename(path.join(__dirname, 'import/output.mp3'), path.join(__dirname, 'export/songs/' + req.body.data._id + '.mp3'), function(renameError) {
    if ( renameError ) console.error('rename: ' + renameError);

    fs.rename(path.join(__dirname, 'import/tn.png'), path.join(__dirname, 'export/imgs/' + req.body.data._id + '.png'), function(renameImgError) {
      if ( renameError ) console.error('rename: ' + renameImgError);

      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ok' }));
      res.end();
    });
  });
})

appe.post('/writeSongsImg', function(req, res) {
  let base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

  let config = requireUncached('./config/database.json');


  fs.writeFile(config.export + '/imgs/' + req.body.data._id + '.png', base64Data, 'base64', function() {
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ local: 'ok' }));
    res.end();
  });

})


appe.post('/tagImportedSong', function(req, res) {
  var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

  fs.writeFile(path.join(__dirname, 'import/tn.png'), base64Data, 'base64', function() {

  });

  ffmpeg(directoryPath + '/' + req.body.data.path).outputOptions([
    '-vn',
    '-b:a 256k'
  ])
    .on('progress', function(progress) {
      io.sockets.emit('convertPosition', progress.percent.toFixed(1));

    })
    .on('error', function(err) {
      console.log('An error occurred: ' + err.message);
    })
    .on('end', function(stdout, stderr) {
      io.sockets.emit('convertPosition', 'done');


      if (typeof req.body.data.ffmpeg.common.genre === 'undefined') {
        req.body.data.ffmpeg.common.genre = [];
      }

      if (typeof req.body.data.tags === 'undefined') {
        req.body.data.tags = "";
      }

      // TODO: BPM? KEY? NUMBER TRACK

      var data = {
        artist: req.body.data.ffmpeg.common.artist,
        title: req.body.data.ffmpeg.common.title,
        album_artist: req.body.data.tags,
        date: req.body.data.ffmpeg.common.year,
        album: req.body.data.ffmpeg.common.album,
        genre: req.body.data.ffmpeg.common.genre,
        bpm: req.body.data.ffmpeg.common.bpm,
        //key: req.body.data.ffmpeg.common.key
      };

      var options = {
        attachments: [path.join(__dirname, 'import/tn.png')]
      };

      ffmetadata.write(path.join(__dirname, 'import/output.mp3'), data, options, function(err) {
        if (err) console.error("Error writing metadata", err);
        else {
          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ local: 'ok' }));
          res.end();
        }
      });
    }).save(path.join(__dirname, 'import/output.mp3'));
});

appe.get('/getAnySongInfo', function(req, res) {
  const mm = require('music-metadata');

  mm.parseFile(decodeURIComponent(req.query.path))
    .then( meta => {
      const fileSizeInBytes = fs.statSync(decodeURIComponent(req.query.path)).size;
      if(typeof meta.common.picture != "undefined") {
        fs.writeFile(path.join(__dirname, 'import/tn.png'), meta.common.picture[0].data, 'base64', function(err) {
          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ status: "ok", data: meta, size: fileSizeInBytes, path: req.query.path }));

          res.end();
        });
      } else {

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "nope", data: meta, size: fileSizeInBytes, path: req.query.path }));

        res.end();
      }
    })
    .catch( err => {
      console.error(err.message);
    });
});

appe.get('/getImportedSongInfo', function(req, res) {
  const mm = require('music-metadata');

  mm.parseFile(path.join(__dirname, 'import/' + req.query.path))
    .then( meta => {
      const fileSizeInBytes = fs.statSync(path.join(__dirname, 'import/') + req.query.path).size;
      if(typeof meta.common.picture != "undefined") {
        fs.writeFile(path.join(__dirname, 'import/tn.png'), meta.common.picture[0].data, 'base64', function(err) {
          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ status: "ok", data: meta, size: fileSizeInBytes, path: req.query.path }));

          res.end();
        });
      } else {

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: "nope", data: meta, size: fileSizeInBytes, path: req.query.path }));

        res.end();
      }
    })
    .catch( err => {
      console.error(err.message);
    });
});


appe.get('/getLocalInfo', function(req, res) {
  config = requireUncached('./config/database.json');
  const mm = require('music-metadata');
  const extension = path.extname(req.query.path);
  let directoryPath = "";

  if(req.query.fullPath === 'undefined') {
    directoryPath = config.import + "/" + req.query.path;
  } else if(req.query.fullPath === 'true'){
    directoryPath = req.query.path;
  } else {
    console.error("req.query.fullPath - false || undefined")
  }

  if(extension === ".mp3"
    || extension === ".flac"
    || extension === ".webm"
    || extension === ".acc"
    || extension === ".m4a"
    || extension === ".wav") {

    mm.parseFile(directoryPath)
      .then( metadata => {
        if(typeof metadata.common.picture != "undefined") {
          fs.writeFile(directoryPath + '/tn.png', metadata.common.picture[0].data, 'base64', function(err) {
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ path: req.query.path }));

            res.end();

          });
        } else {

          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ path: "no image?" }));

          res.end();
        }
      })
      .catch( err => {
        console.error(err.message);
      });


  } else {
    ffmpeg({ source: directoryPath, nolog: true })
      .takeScreenshots({ timemarks: [ '00:00:02.000' ], size: '1270x720' }, config.export, function(err, filenames) {

      });


    ffmpeg.ffprobe({ source: directoryPath}, function(err, infoo){
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ path: req.query.path, info: infoo }));

      res.end();
    });
  }







  /!*

     ffmpeg(path.join(__dirname, 'upload/local/' + req.query.path)).outputOptions([
         '-an',
         '-filter:',
         'scale=-2:250',
         '-f',
         'jpeg'
     ])
         .on('progress', function(progress) {
             //io.sockets.emit('convertPosition', progress.percent.toFixed(1));
         })
         .on('error', function(err) {
             console.log('An error occurred: ' + err);
         })
         .on('end', function(stdout, stderr) {
             console.log('IMG DONE!');

             res.status(200);
             res.setHeader('Content-Type', 'application/json');
             res.send(JSON.stringify({ path: req.query.path }));

             res.end();

         }).save(path.join(__dirname, 'upload/local/tn.jpeg'));


     //works on video
        ffmpeg({ source: path.join(__dirname, 'upload/local/' + req.query.path), nolog: true })
             .takeScreenshots({ timemarks: [ '00:00:02.000' ], size: '1270x720' }, path.join(__dirname, 'upload/local/'), function(err, filenames) {



             });*!/

});


appe.get('/listImportFolder', function(req, res) {
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  const files = fs.readdirSync(directoryPath, 'utf8');
  const response = [];

  let filteredFiles = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));

  for (let file of filteredFiles) {
    const extension = path.extname(file);
    const fileSizeInBytes = fs.statSync(directoryPath + "/" + file).size;
    response.push({ name: file, extension, fileSizeInBytes });
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ files: response }));
  res.end();

});

appe.get('/listMove', function(req, res) {
  //requiring path and fs modules
//joining path of directory
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  const files = fs.readdirSync(directoryPath, 'utf8');
  const response = [];

  let filteredFiles = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));


  for (let file of filteredFiles) {
    const extension = path.extname(file);
    const fileSizeInBytes = fs.statSync(directoryPath + "/" + file).size;
    response.push({ name: file, extension, fileSizeInBytes });
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ files: response }));
  res.end();

});


appe.get('/listTreeImport', function(req, res) {
  config = requireUncached('./config/database.json');
  const dirTree = require("directory-tree");
  const tree = dirTree(config.import, {
    extensions: /\.(srt|mp4|mkv|flv|mp3|flac|wav|webm|ogg|ogv|oga|aac|m4a|m4v|ts)$/
  });

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(tree));
  res.end();

})


appe.get('/listLocal', function(req, res) {
  //requiring path and fs modules
//joining path of directory
  config = requireUncached('./config/database.json');
  const directoryPath = config.import;
  const files = fs.readdirSync(directoryPath, 'utf8');
  const response = [];

  let filteredFiles = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));


  for (let file of filteredFiles) {
    const extension = path.extname(file);
    const fileSizeInBytes = fs.statSync(directoryPath + "/" + file).size;
    response.push({ name: file, extension, fileSizeInBytes });
  }

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ files: response }));
  res.end();

});


appe.post('/DownloadAll', function(req, res) {
  if(req.body.data) {
    const url = 'https://www.youtube.com/watch?v=' + req.body.data.youtubeID;

    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var tags = req.body.data.youtubeTags;
      var myStr = tags.toString();

      var tagsString = myStr.replace(/,/g, " ");

      const video = youtubedl(url,
        // Optional arguments passed to youtube-dl.
        ['--no-continue'],
        // Additional options can be given for calling `child_process.execFile()`.
        { cwd: __dirname });

// Will be called when the download starts.
      video.on('info', function(info) {
        size = info.size;
      });

      video.on('error', function(info) {
        console.error(info);
      });

      video.on('data', function(chunk) {
        pos += chunk.length;
        if (size) {
          progress = (pos / size * 100).toFixed(1);
          io.sockets.emit('downloadPosition', progress);
          //console.log("DL: " + progress  + '%');
        }
      });
      video.on('end', function(info) {
        var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

        fs.writeFile(path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.png'), base64Data, 'base64', function(err) {
          console.log(err);
        });

        ffmpeg(path.join(__dirname, 'ytdl/temp.mp4')).outputOptions([
          '-metadata',
          'artist=' + req.body.data.youtubeOriginal,
          '-profile:v',
          'baseline',
          '-level',
          '3.0',
          '-movflags',
          'faststart',
          '-crf',
          '21',
          '-f',
          'mp4'
        ])
          .on('progress', function(progress) {
            io.sockets.emit('convertPosition', progress.percent.toFixed(1));
          })
          .on('error', function(err) {
            console.log('An error occurred: ' + err);
          })
          .on('end', function(stdout, stderr) {
            console.log('FF DONE!');
            YTFFactive = false;
            io.sockets.emit('YTFFactive', false);
            io.sockets.emit('convertPosition', 'done');

            fs.rename(path.join(__dirname, 'upload/output.mp4'), path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.mp4'), function(renameError) {
              if ( renameError ) console.error('rename: ' + renameError);

              ffmpeg(path.join(__dirname, 'ytdl/temp.mp4')).outputOptions([
                '-vn',
                '-b:a 256k'
              ])
                .on('progress', function(progress) {
                  io.sockets.emit('convertPosition', progress.percent.toFixed(1));

                })
                .on('error', function(err) {
                  console.log('An error occurred: ' + err.message);
                })
                .on('end', function(stdout, stderr) {
                  console.log('FF DONE!');
                  YTFFactive = false;
                  io.sockets.emit('YTFFactive', false);
                  io.sockets.emit('convertPosition', 'done');


                  if (typeof req.body.data.youtubeAlbum === 'undefined') {
                    req.body.data.youtubeAlbum = "";
                  }

                  if (typeof req.body.data.youtubeGenre === 'undefined') {
                    req.body.data.youtubeAlbum = "";
                  }

                  var data = {
                    artist: req.body.data.youtubeArtist,
                    title: req.body.data.youtubeTitle,
                    album_artist: tagsString,
                    date: req.body.data.youtubeYear,
                    album: req.body.data.youtubeAlbum,
                    label: req.body.data.youtubeID,
                    genre: req.body.data.youtubeGenre
                  };

                  var options = {
                    attachments: [path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.png')]
                  };

                  ffmetadata.write(path.join(__dirname, 'upload/output.mp3'), data, options, function(err) {
                    if (err) console.error("Error writing metadata", err);
                    else {
                      console.log('META DONE!');

                      fs.rename(path.join(__dirname, 'upload/output.mp3'), path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.mp3'), function(renameError) {
                        if ( renameError ) console.error('rename: ' + renameError);

                        res.status(200);
                        res.setHeader('Content-Type', 'application/json');
                        res.send(JSON.stringify({ local: 'DONE' }));
                        res.end();
                      });
                    }
                  });
                }).save(path.join(__dirname, 'upload/output.mp3'));
            });
          }).save(path.join(__dirname, 'upload/output.mp4'));
      });

      video.pipe(fs.createWriteStream(path.join(__dirname, 'ytdl/temp.mp4')))
    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});

appe.post('/downloadVideo', function(req, res) {
  if(req.body.data) {
    const url = 'https://www.youtube.com/watch?v=' + req.body.data.youtubeID;

    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var tags = req.body.data.youtubeTags;
      var myStr = tags.toString();

      var tagsString = myStr.replace(/,/g, " ");

      const video = youtubedl(url,
        // Optional arguments passed to youtube-dl.
        ['--no-continue'],
        // Additional options can be given for calling `child_process.execFile()`.
        { cwd: __dirname });

// Will be called when the download starts.
      video.on('info', function(info) {
        size = info.size;
      });

      video.on('error', function(info) {
        console.error(info);
      });

      video.on('data', function(chunk) {
        pos += chunk.length;
        if (size) {
          progress = (pos / size * 100).toFixed(1);
          io.sockets.emit('downloadPosition', progress);
          //console.log("DL: " + progress  + '%');
        }
      });
      video.on('end', function(info) {
        var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

        fs.writeFile(path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.png'), base64Data, 'base64', function(err) {
          console.log(err);
        });

        ffmpeg(path.join(__dirname, 'ytdl/temp.mp4')).outputOptions([
          '-an',
          '-metadata',
          'artist=' + req.body.data.youtubeOriginal,
          '-profile:v',
          'baseline',
          '-level',
          '3.0',
          '-movflags',
          'faststart',
          '-crf',
          '21',
          '-f',
          'mp4'
        ])
          .on('progress', function(progress) {
            io.sockets.emit('convertPosition', progress.percent.toFixed(1));
          })
          .on('error', function(err) {
            console.log('An error occurred: ' + err);
          })
          .on('end', function(stdout, stderr) {
            console.log('FF DONE!');
            YTFFactive = false;
            io.sockets.emit('YTFFactive', false);
            io.sockets.emit('convertPosition', 'done');

            fs.rename(path.join(__dirname, 'upload/output.mp4'), path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.mp4'), function(renameError) {
              if ( renameError ) console.error('rename: ' + renameError);

              res.status(200);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({ local: 'DONE' }));
              res.end();
            });
          }).save(path.join(__dirname, 'upload/output.mp4'));
      });

      video.pipe(fs.createWriteStream(path.join(__dirname, 'ytdl/temp.mp4')))
    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});




appe.post('/moveMovie', function(req, res) {
  config = requireUncached('./config/database.json');
  const importDirectoryPath = config.import;
  const moviesDirectoryPath = config.movies;

  // add movie poster !!!
  //ffmpeg -i video.mp4 -i image.png -map 1 -map 0 -c copy -disposition:0 attached_pic out.mp4


  if(req.body.data) {

    download(req.body.data.poster_raw, moviesDirectoryPath + '/img/' + req.body.data._id + '.png', function(){

      const { exec } = require("child_process");

      let escapeTitle = req.body.data.title.replace(/(\W)/g, '');

      exec("ffmpeg -i " + req.body.data.path.replace(/(\s+)/g, '\\$1') + " -i " + moviesDirectoryPath + '/img/' + req.body.data._id + '.png' + " -map 1 -map 0 -c copy -disposition:0 attached_pic -metadata year=" + req.body.data.year + " -metadata title=" + escapeTitle + " -f mp4 " + moviesDirectoryPath + '/' + req.body.data._id + '.mp4', (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);

          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ local: `${error.message}` }));

          res.end();

          return;
        }
        if (stderr) {

          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ local: `${stderr}` }));

          res.end();

        }

      });
    });
  }
});


appe.post('/moveEffect', function(req, res) {
  config = requireUncached('./config/database.json');

  if(req.body.data) {

    let base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");
    let mv = require("mv");

    let escapeTitle = req.body.data.title.replace(/(\W)/g, '   ');

    console.log(escapeTitle);

    fs.writeFile(config.export + '/imgs/' + req.body.data._id + '.png', base64Data, 'base64', function (imageError) {
      if (imageError) console.error('image: ' + imageError);

      mv(req.body.data.path.replace(/(\s+)/g, '\\$1'), config.effects + '/' + req.body.data._id + '.mp4', function (renameError) {
        if (renameError) console.error('rename: ' + renameError);

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({local: "done?"}));

        res.end();

      });
    })
  }
});


appe.post('/MoveVideo', function(req, res) {
  if(req.body.data) {

    let size = 0;
    let pos = 0;
    let progress = 0;
    YTFFactive = true;
    io.sockets.emit('YTFFactive', true);

    var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");


    console.log(req.body.data.youtubeID);


    fs.writeFile(path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.png'), base64Data, 'base64', function(err) {
      //console.log(err);

      console.log("IMAGE");

      fs.rename(path.join(__dirname, 'upload/move/' + req.body.data.youtubeID), path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.mp4'), function(renameError) {
        if ( renameError ) console.error('rename: ' + renameError);

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ local: 'DONE' }));
        res.end();
      });

    });

  }
});

appe.post('/convertVideo', function(req, res) {
  if(req.body.data) {
    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

      fs.writeFile(path.join(__dirname, 'upload/' + req.body.data.youtubeOriginal + '.png'), base64Data, 'base64', function(err) {
        //console.log(err);
      });

      ffmpeg(path.join(__dirname, 'upload/local/' + req.body.data.youtubeOriginal)).outputOptions([
        '-an',
        '-metadata',
        'artist=' + req.body.data.youtubeOriginal,
        '-profile:v',
        'baseline',
        '-level',
        '3.0',
        '-movflags',
        'faststart',
        '-crf',
        '21',
        '-f',
        'mp4'
      ])
        .on('progress', function(progress) {
          io.sockets.emit('convertPosition', progress.percent.toFixed(1));
        })
        .on('error', function(err) {
          console.log('An error occurred: ' + err);
        })
        .on('end', function(stdout, stderr) {
          console.log('FF DONE!');
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);
          io.sockets.emit('convertPosition', 'done');


          fs.rename(path.join(__dirname, 'upload/output.mp4'), path.join(__dirname, 'upload/' + req.body.data.youtubeOriginal + '.mp4'), function(renameError) {
            if ( renameError ) console.error('rename: ' + renameError);

            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ local: 'DONE' }));
            res.end();
          });
        }).save(path.join(__dirname, 'upload/output.mp4'));


    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});


appe.post('/convertMovie', function(req, res) {
  if(req.body.data) {
    if(!YTFFactive) {
      config = requireUncached('./config/database.json');


      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      // get image urls download them, add cover into mp4
      /!*var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

      fs.writeFile(path.join(__dirname, 'import/' + req.body.data.youtubeOriginal + '.png'), base64Data, 'base64', function(err) {
        //console.log(err);
      });*!/

      let command = req.body.data.command.split(/(\s+)/).filter( e => e.trim().length > 0);



      command.push('-f');
      command.push('mp4');

      ffmpeg(req.body.data.path).outputOptions(
        command
      )
        .on('progress', function(progress) {

          io.sockets.emit('convertPosition', progress.percent.toFixed(1));
        })
        .on('error', function(err) {
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);

          console.log('An error occurred: ' + err);
        })
        .on('end', function(stdout, stderr) {
          console.log('FF DONE!');
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);
          io.sockets.emit('convertPosition', 'done');


          // "Error: EXDEV: cross-device link not permitted, rename..."

          const mv = require('mv');


          mv(config.import + '/output.mp4', config.import + '/100_convert_' + req.body.data.title.replace(/(\W)/g, '.') + '.mp4', function(renameError) {
            if ( renameError ) console.error('rename: ' + renameError);

            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ local: 'DONE' }));
            res.end();
          });
        }).save(config.import + '/output.mp4');


    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});

appe.post('/convertEffect', function(req, res) {
  if(req.body.data) {
    if(!YTFFactive) {
      config = requireUncached('./config/database.json');


      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      // get image urls download them, add cover into mp4
      /!*var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

      fs.writeFile(path.join(__dirname, 'import/' + req.body.data.youtubeOriginal + '.png'), base64Data, 'base64', function(err) {
        //console.log(err);
      });*!/

      let command = req.body.data.command.split(/(\s+)/).filter( e => e.trim().length > 0);


      command.push('-f');
      command.push('mp4');


      ffmpeg(req.body.data.path).outputOptions(
        command
      )
        .on('progress', function(progress) {

          io.sockets.emit('convertPosition', progress.percent.toFixed(1));
        })
        .on('error', function(err) {
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);

          console.log('An error occurred: ' + err);
        })
        .on('end', function(stdout, stderr) {
          console.log('FF DONE!');
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);
          io.sockets.emit('convertPosition', 'done');


          // "Error: EXDEV: cross-device link not permitted, rename..."

          const mv = require('mv');


          mv(config.export + '/output.mp4', config.import + '/100_convert_effect_' + (new Date().getTime()) + '.mp4', function(renameError) {
            if ( renameError ) console.error('rename: ' + renameError);

            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ local: 'DONE' }));
            res.end();
          });
        }).save(config.export + '/output.mp4');


    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});


appe.post('/convertAll', function(req, res) {
  if(req.body.data) {
    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

      fs.writeFile(path.join(__dirname, 'import/' + req.body.data.youtubeOriginal + '.png'), base64Data, 'base64', function(err) {
        //console.log(err);
      });

      ffmpeg(path.join(__dirname, 'import/' + req.body.data.youtubeOriginal)).outputOptions([
        '-metadata',
        'artist=' + req.body.data.youtubeTitle,
        '-profile:v',
        'baseline',
        '-level',
        '3.0',
        '-movflags',
        'faststart',
        '-b:v',
        req.body.data.videoBitrate,
        '-b:a',
        req.body.data.audioBitrate,
        '-f',
        'mp4',
        '-t',
        '180'
      ])
        .on('progress', function(progress) {
          io.sockets.emit('convertPosition', progress.percent.toFixed(1));
        })
        .on('error', function(err) {
          console.log('An error occurred: ' + err);
        })
        .on('end', function(stdout, stderr) {
          console.log('FF DONE!');
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);
          io.sockets.emit('convertPosition', 'done');


          fs.rename(path.join(__dirname, 'export/output.mp4'), path.join(__dirname, 'export/' + req.body.data.youtubeOriginal + '.mp4'), function(renameError) {
            if ( renameError ) console.error('rename: ' + renameError);

            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ local: 'DONE' }));
            res.end();
          });
        }).save(path.join(__dirname, 'export/output.mp4'));


    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});

appe.post('/convertAudio', function(req, res) {
  if(req.body.data) {
    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

      fs.writeFile(path.join(__dirname, 'upload/' + req.body.data.youtubeOriginal + '.png'), base64Data, 'base64', function(err) {
        //console.log(err);
      });

      var tags = req.body.data.youtubeTags;

      if (typeof tags === 'undefined') {
        var myStr = "";
      } else {
        var myStr = tags.toString();
      }


      var tagsString = myStr.replace(/,/g, " ");

      ffmpeg(path.join(__dirname, 'upload/local/' + req.body.data.youtubeOriginal)).outputOptions([
        '-vn',
        '-b:a 256k'
      ])
        .on('progress', function(progress) {
          io.sockets.emit('convertPosition', progress.percent.toFixed(1));

        })
        .on('error', function(err) {
          console.log('An error occurred: ' + err.message);
        })
        .on('end', function(stdout, stderr) {
          console.log('FF DONE!');
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);
          io.sockets.emit('convertPosition', 'done');


          if (typeof req.body.data.youtubeAlbum === 'undefined') {
            req.body.data.youtubeAlbum = "";
          }

          if (typeof req.body.data.youtubeGenre === 'undefined') {
            req.body.data.youtubeAlbum = "";
          }

          var data = {
            artist: req.body.data.youtubeArtist,
            title: req.body.data.youtubeTitle,
            album_artist: tagsString,
            date: req.body.data.youtubeYear,
            album: req.body.data.youtubeAlbum,
            label: req.body.data.youtubeID,
            genre: req.body.data.youtubeGenre
          };

          var options = {
            attachments: [path.join(__dirname, 'upload/' + req.body.data.youtubeOriginal + '.png')]
          };

          ffmetadata.write(path.join(__dirname, 'upload/output.mp3'), data, options, function(err) {
            if (err) console.error("Error writing metadata", err);
            else {
              console.log('META DONE!');

              fs.rename(path.join(__dirname, 'upload/output.mp3'), path.join(__dirname, 'upload/' + req.body.data.youtubeOriginal + '.mp3'), function(renameError) {
                if ( renameError ) console.error('rename: ' + renameError);

                res.status(200);
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ local: 'DONE' }));
                res.end();
              });
            }
          });
        }).save(path.join(__dirname, 'upload/output.mp3'));


    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});


appe.post('/convertPSP', function(req, res) {
  if(req.body.data) {
    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var filename = req.body.data.youtubeOriginal.replace(/^.*[\\\/]/, '');

      ffmpeg(path.join(__dirname, 'upload/local/' + filename)).outputOptions([
        '-flags',
        '+bitexact',
        '-vcodec',
        'libx264',
        '-profile:v',
        'baseline',
        '-level',
        '3.0',
        '-s',
        '480x272',
        '-r',
        '29.97',
        '-b:v',
        '999k',
        '-acodec',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-f',
        'psp',
        '-strict',
        '-2'
      ])
        .on('progress', function(progress) {
          io.sockets.emit('convertPosition', progress.percent.toFixed(1));
        })
        .on('error', function(err) {
          console.log('An error occurred: ' + err);
        })
        .on('end', function(stdout, stderr) {
          console.log('FF DONE!');
          YTFFactive = false;
          io.sockets.emit('YTFFactive', false);
          io.sockets.emit('convertPosition', 'done');

          fs.rename(path.join(__dirname, 'upload/output.mp4'), path.join(__dirname, 'upload/psp.mp4'), function(renameError) {
            if ( renameError ) console.error('rename: ' + renameError);

            ffmpeg(path.join(__dirname, 'upload/psp.mp4')).outputOptions([
              '-f',
              'image2',
              '-ss',
              '5',
              '-vframes',
              '1',
              '-s',
              '160x120'
            ])
              .on('progress', function(progress) {

              })
              .on('error', function(err) {
                console.log('An error occurred: ' + err);
              })
              .on('end', function(stdout, stderr) {

                res.status(200);
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ local: 'DONE' }));
                res.end();

              }).save(path.join(__dirname, 'upload/psp.THM'));
          });
        }).save(path.join(__dirname, 'upload/output.mp4'));

    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});

appe.post('/downloadAudio', function(req, res) {
  if(req.body.data) {
    const url = 'https://www.youtube.com/watch?v=' + req.body.data.youtubeID;

    if(!YTFFactive) {
      let size = 0;
      let pos = 0;
      let progress = 0;
      YTFFactive = true;
      io.sockets.emit('YTFFactive', true);

      var tags = req.body.data.youtubeTags;

      if (typeof tags === 'undefined') {
        var myStr = "";
      } else {
        var myStr = tags.toString();
      }


      var tagsString = myStr.replace(/,/g, " ");

      const video = youtubedl(url,
        // Optional arguments passed to youtube-dl.
        ['--no-continue', '-o', path.join(__dirname, 'ytdl/temp.mp4'), '--format', 'best[ext=mp4]'],
        // Additional options can be given for calling `child_process.execFile()`.
        { cwd: __dirname });

// Will be called when the download starts.
      video.on('info', function(info) {
        size = info.size;
      });

      video.on('error', function(info) {
        console.error(info);
      });

      video.on('data', function(chunk) {
        pos += chunk.length;
        if (size) {
          progress = (pos / size * 100).toFixed(1);
          io.sockets.emit('downloadPosition', progress);
          //console.log("DL: " + progress  + '%');
        }
      });
      video.on('end', function(info) {
        var base64Data = req.body.data.imgCover.replace(/^data:image\/png;base64,/, "");

        fs.writeFile(path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.png'), base64Data, 'base64', function(err) {
          console.log(err);
        });

        ffmpeg(path.join(__dirname, 'ytdl/temp.mp4')).outputOptions([
          '-vn',
          '-b:a 256k'
        ])
          .on('progress', function(progress) {
            io.sockets.emit('convertPosition', progress.percent.toFixed(1));

          })
          .on('error', function(err) {
            console.log('An error occurred: ' + err.message);
          })
          .on('end', function(stdout, stderr) {
            console.log('FF DONE!');
            YTFFactive = false;
            io.sockets.emit('YTFFactive', false);
            io.sockets.emit('convertPosition', 'done');


            if (typeof req.body.data.youtubeAlbum === 'undefined') {
              req.body.data.youtubeAlbum = "";
            }

            if (typeof req.body.data.youtubeGenre === 'undefined') {
              req.body.data.youtubeAlbum = "";
            }

            var data = {
              artist: req.body.data.youtubeArtist,
              title: req.body.data.youtubeTitle,
              album_artist: tagsString,
              date: req.body.data.youtubeYear,
              album: req.body.data.youtubeAlbum,
              label: req.body.data.youtubeID,
              genre: req.body.data.youtubeGenre
            };

            var options = {
              attachments: [path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.png')]
            };

            ffmetadata.write(path.join(__dirname, 'upload/output.mp3'), data, options, function(err) {
              if (err) console.error("Error writing metadata", err);
              else {
                console.log('META DONE!');

                fs.rename(path.join(__dirname, 'upload/output.mp3'), path.join(__dirname, 'upload/' + req.body.data.youtubeID + '.mp3'), function(renameError) {
                  if ( renameError ) console.error('rename: ' + renameError);

                  res.status(200);
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({ local: 'DONE' }));
                  res.end();
                });
              }
            });
          }).save(path.join(__dirname, 'upload/output.mp3'));
      });

      video.pipe(fs.createWriteStream(path.join(__dirname, 'ytdl/temp.mp4')))
    } else {
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ local: 'ACTIVE!!!' }));
      res.end();
    }
  }
});

// RENDER ALL COLLECTIONS IN DATABASE
appe.get("/ffmpeg", (req, res) => {

  var pathToMovie = './demo.avi';

  res.status(204);

  var proc = ffmpeg(pathToMovie)

    .preset('flashvideo')

    .on('end', function () {

      console.log('Stream Done');

    })

    .pipe(res);


});
*/

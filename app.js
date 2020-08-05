var express = require('express');
var app = express();
var fs = require('fs');
var exphbs = require('express-handlebars');
var fileUpload = require('express-fileupload');
var http = require('http').Server(app);
var path = require('path');
var dotenv = require('dotenv');
var bodyParser = require('body-parser');
var { BlobServiceClient } = require('@azure/storage-blob');
var Client = require('azure-iothub').Client;

dotenv.config();
const iotHubConnectionString = process.env.IOTCONNECTION;
const iotDeviceName = process.env.IOTDEVICENAME;
const storageConnectionString = process.env.BLOBCONNECTION;
const blobContainerName = process.env.BLOBCONTAINERNAME;
const port = process.env.PORT || 3000;

const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
const containerClient = blobServiceClient.getContainerClient(blobContainerName); // blob is my container name
// const client = Client.fromConnectionString(iotHubConnectionString);

app.use(fileUpload({ createParentPath: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use('/public', express.static('public'));

app.get('/', (req, res) => {
  res.render('home');
});

app.post('/update', async (req, res) => {
  try {
    if (!req.files) {
      res.send({
        status: false,
        message: 'No file uploaded'
      });
    } else {
      let file = req.files.update;
      const staticFileName = 'device.bin';
      // using staticFileName instead of file.name
      // that or send the device the name of the url with every direct method
      filepath = path.join('./uploads/', staticFileName);
      file.mv(filepath); // saves file locally
      const blockBlobClient = containerClient.getBlockBlobClient(staticFileName);
      await blockBlobClient.uploadFile(filepath);

      // const data = {
      //   'methodName': 'update',
      //   'responseTimeoutInSeconds': 60,
      //   'payload': {}
      // };
      // client.invokeDeviceMethod(iotDeviceName, data, (err, result) => {
      //   if (err && !(err instanceof SyntaxError)) {
      //     console.error(err);
      //   } else {
      //     console.log('successfully invoked device method');
      //   }
      // });
      
      fs.unlink(filepath, err => {
        if (err) { console.error(err); }
      });

      res.send({
        status: true,
        message: 'file uploaded',
        data: {
          name: file.name,
          mimetype: file.mimetype,
          size: file.size
        }
      });
    }
  } catch(err) {
    res.status(400).send(err);
  }
});

http.listen(port, () => {
  console.log(`listening on port ${port}`);
});

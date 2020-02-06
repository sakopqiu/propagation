console.log('starting server');
const http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    mime = require('mime');
const fileMap = new Map();
const Readable = require("stream").Readable;
const port = process.env.PORT || 5000; // 前端代码端口

let counter = 0;

function writeContent(pathName, response) {
    const ext = path.extname(pathName);

    const fileName = ext ? pathName : '/index.html';
    if (fileName.indexOf('index.html') !== -1) {
        counter++;
    }

    let fileContent = fileMap.get(pathName);
    if (!fileContent) {
        const p = path.resolve(__dirname, './build' + fileName);
        if (!fs.existsSync(p)) {
            response.writeHead(404, {'content-type': 'text-plain'});
            response.end('Resource not found');
            return;
        }
        fileContent = fs.readFileSync(p);
        console.log(`fetch ${fileName}`.green);
        fileMap.set(pathName, fileContent);
    } else {
        console.log(`use cache ${fileName}`.cyan);
    }
    const stream = new Readable();
    stream.push(fileContent);
    stream.push(null);
    response.writeHead(200, {'content-type': mime.getType(ext) || 'text/html'});
    stream.pipe(response);
}

let server = http.createServer((request, response) => {
    const pathName = url.parse(request.url).pathname;
    if (request.url.indexOf('/api/count') !== -1) {
        response.writeHead(200, {'content-type': 'application/json'});
        response.end(JSON.stringify({counter}));
        return;
    }
    writeContent(pathName, response);
});

console.log(`listening on ${port}`);
server.listen(port);
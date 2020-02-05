const http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    mime = require('mime');
const fileMap = new Map();
const Readable = require("stream").Readable;
const port = process.env.PORT || 3000; // 前端代码端口

function writeContent(pathName, response) {
    const ext = path.extname(pathName);

    const fileName = ext ? pathName : '/index.html';

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
    writeContent(pathName, response);
});

console.log(`listening on ${port}`);
server.listen(port);
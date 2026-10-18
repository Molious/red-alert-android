import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname!=='/'&&pathname!=='/foundation.html'&&!pathname.startsWith('/src/lib/foundation/'))throw Error('Not found');const file=path.resolve(root,'.'+(pathname==='/'?'/foundation.html':pathname));if(!file.startsWith(root+path.sep))throw Error('Not found');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Foundation simulator: http://127.0.0.1:4173'));


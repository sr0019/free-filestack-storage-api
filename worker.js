// Cloudflare Worker Script

const API_KEY = 'AngQm42YPQvqLYiPExD1Az';
const your_worker_url = 'up1.sr00.workers.dev';

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>File Upload</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <style>
        * {
            box-sizing: border-box;
        }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            background: linear-gradient(135deg, #ffffff 0%, #fff0b3 100%);
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #333;
        }
        .container {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            padding: 40px 20px;
            border-radius: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
            width: 100%;
            max-width: 500px;
            text-align: center;
        }
        .hero-text {
            font-size: clamp(22px, 5vw, 26px);
            font-weight: 800;
            margin-bottom: 8px;
            color: #b38f00;
            letter-spacing: -0.5px;
        }
        .sub-text {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            margin-bottom: 25px;
            font-weight: 600;
        }
        .support-text {
            font-size: 13px;
            font-weight: 600;
            color: #555;
            margin-bottom: 25px;
            background: #fff;
            padding: 10px 20px;
            border-radius: 20px;
            display: inline-block;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            border: 1px solid #f0f0f0;
        }
        .upload-area {
            margin-bottom: 20px;
        }
        input[type="file"] {
            display: block;
            width: 100%;
            padding: 15px;
            border: 2px dashed #d9b300;
            border-radius: 16px;
            background: #fffdf5;
            cursor: pointer;
            font-size: 14px;
            color: #555;
            transition: all 0.2s;
        }
        input[type="file"]:hover {
            background: #fff9d6;
        }
        button { 
            width: 100%;
            padding: 16px; 
            cursor: pointer; 
            background: linear-gradient(90deg, #ffd700, #ffc800);
            border: none;
            border-radius: 16px;
            font-weight: 700;
            font-size: 16px;
            color: #333;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
        }
        button:disabled {
            background: #e0e0e0;
            box-shadow: none;
            cursor: not-allowed;
            color: #999;
        }
        .progress-container { 
            margin-top: 25px; 
            display: none; 
            width: 100%;
        }
        progress { 
            width: 100%; 
            height: 14px; 
            border-radius: 7px; 
            overflow: hidden; 
            appearance: none;
            border: none;
        }
        progress::-webkit-progress-bar { background-color: #f0f0f0; }
        progress::-webkit-progress-value { 
            background: linear-gradient(90deg, #ffcc00, #ffaa00); 
            border-radius: 7px;
        }
        progress::-moz-progress-bar { 
            background: linear-gradient(90deg, #ffcc00, #ffaa00); 
            border-radius: 7px;
        }
        .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
        }
        #statusText { color: #888; }
        #progressText { color: #b38f00; font-size: 16px;}
        
        #resultContainer {
            display: none;
            margin-top: 25px;
            animation: fadeIn 0.5s ease;
        }
        .final-link {
            display: block;
            padding: 16px;
            background: #fffbe6;
            border: 2px solid #ffe680;
            border-radius: 16px;
            color: #b38f00;
            font-weight: 700;
            text-decoration: none;
            word-break: break-all;
            font-size: 14px;
            transition: all 0.2s;
        }
        .final-link:hover {
            background: #fff9d6;
            transform: scale(1.02);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero-text">KEEP FILES FOREVER</div>
        <div class="sub-text">UPLOADED FILES WILL ALWAYS BE ACCESSIBLE THROUGH LINK</div>
        
        <div class="support-text">📁 All file types, any size supported</div>

        <div class="upload-area" id="uploadArea">
            <input type="file" id="fileInput">
        </div>
        
        <button onclick="startUpload()" id="uploadBtn">Start Upload</button>
        
        <div class="progress-container" id="progressContainer">
            <div class="status-row">
                <span id="statusText">Initializing...</span>
                <span id="progressText">0%</span>
            </div>
            <progress id="progressBar" value="0" max="100"></progress>
        </div>

        <div id="resultContainer"></div>
    </div>

    <script>
        const CHUNK_SIZE = 10485760; // 10 MB chunks
        const MAX_CONCURRENCY = 3;
        const MAX_RETRIES = 3;

        function updateStatus(msg) {
            document.getElementById('statusText').innerText = msg;
            console.log(msg); 
        }

        function getBase64MD5(arrayBuffer) {
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
            const md5 = CryptoJS.MD5(wordArray);
            return CryptoJS.enc.Base64.stringify(md5);
        }

        function requestXHR(method, url, headers = {}, body = null, onProgress = null) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open(method, url, true);

                for (const [key, value] of Object.entries(headers)) {
                    xhr.setRequestHeader(key, value);
                }

                if (onProgress && xhr.upload) {
                    xhr.upload.addEventListener('progress', onProgress);
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let responseData = xhr.responseText;
                        try { responseData = JSON.parse(xhr.responseText); } catch (e) {}

                        resolve({
                            status: xhr.status,
                            data: responseData,
                            getResponseHeader: (header) => xhr.getResponseHeader(header)
                        });
                    } else {
                        reject(new Error(\`HTTP \${xhr.status}: \${xhr.responseText}\`));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error occurred'));
                xhr.send(body);
            });
        }

        async function startUpload() {
            const fileInput = document.getElementById('fileInput');
            if (!fileInput.files.length) return alert('Please select a file first.');
            
            const file = fileInput.files[0];
            const uploadBtn = document.getElementById('uploadBtn');
            const progressContainer = document.getElementById('progressContainer');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const uploadArea = document.getElementById('uploadArea');
            const resultContainer = document.getElementById('resultContainer');
            
            uploadBtn.style.display = 'none';
            uploadArea.style.display = 'none';
            resultContainer.style.display = 'none';
            progressContainer.style.display = 'block';
            
            progressBar.max = file.size;
            progressBar.value = 0;
            progressText.innerText = '0%';
            updateStatus('Starting upload...');

            try {
                const safeFilename = file.name.replace(/[^a-zA-Z0-9.\\-_]/g, '_');

                const startRes = await requestXHR('POST', '/api/start', { 'Content-Type': 'application/json' }, JSON.stringify({
                    filename: safeFilename,
                    mimetype: file.type || 'application/octet-stream',
                    size: file.size 
                }));
                
                const startData = startRes.data;
                if (startData.error) throw new Error(JSON.stringify(startData.error));
                
                updateStatus('Uploading...');

                const parts = [];
                const totalParts = Math.ceil(file.size / CHUNK_SIZE);
                let chunkProgress = new Array(totalParts).fill(0);

                const updateGlobalProgress = () => {
                    const totalUploaded = chunkProgress.reduce((a, b) => a + b, 0);
                    const percent = Math.min(100, Math.round((totalUploaded / file.size) * 100));
                    progressBar.value = totalUploaded;
                    progressText.innerText = \`\${percent}%\`;
                };

                const uploadTasks = [];
                for (let i = 0; i < totalParts; i++) {
                    uploadTasks.push(async () => {
                        const partNumber = i + 1;
                        const start = i * CHUNK_SIZE;
                        const end = Math.min(start + CHUNK_SIZE, file.size);
                        const chunk = file.slice(start, end);
                        const currentChunkSize = chunk.size; 

                        const arrayBuffer = await chunk.arrayBuffer();
                        const md5 = getBase64MD5(arrayBuffer);

                        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                            try {
                                const uploadRes = await requestXHR('POST', '/api/upload', { 'Content-Type': 'application/json' }, JSON.stringify({
                                    md5: md5,
                                    part: partNumber,
                                    region: startData.region,
                                    size: currentChunkSize,
                                    upload_id: startData.upload_id,
                                    uri: startData.uri,
                                    location_url: startData.location_url
                                }));
                                
                                const uploadData = uploadRes.data;

                                const onProgress = (event) => {
                                    if (event.lengthComputable) {
                                        chunkProgress[i] = event.loaded;
                                        updateGlobalProgress();
                                    }
                                };

                                const s3Res = await requestXHR('PUT', uploadData.url, uploadData.headers, arrayBuffer, onProgress);
                                const etag = s3Res.getResponseHeader('ETag');
                                
                                parts.push({ part_number: partNumber, etag: etag });
                                chunkProgress[i] = currentChunkSize; 
                                updateGlobalProgress();
                                return; 

                            } catch (err) {
                                if (attempt === MAX_RETRIES) throw new Error(\`Part \${partNumber} failed.\`);
                                console.warn(\`Retrying part \${partNumber} (Attempt \${attempt + 1})...\`);
                            }
                        }
                    });
                }

                const executing = new Set();
                for (const task of uploadTasks) {
                    const p = Promise.resolve().then(() => task());
                    executing.add(p);
                    const clean = () => executing.delete(p);
                    p.then(clean).catch(clean);
                    if (executing.size >= MAX_CONCURRENCY) {
                        await Promise.race(executing);
                    }
                }
                await Promise.all(executing);

                updateStatus('Finalizing...');
                parts.sort((a, b) => a.part_number - b.part_number); 

                // Retry logic specifically for the Completion phase
                let completeData = null;
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        const completeRes = await requestXHR('POST', '/api/complete', { 'Content-Type': 'application/json' }, JSON.stringify({
                            filename: safeFilename,
                            mimetype: file.type || 'application/octet-stream',
                            size: file.size, 
                            region: startData.region,
                            upload_id: startData.upload_id,
                            uri: startData.uri,
                            location_url: startData.location_url,
                            parts: parts
                        }));

                        completeData = completeRes.data;
                        if (completeData.error) throw new Error(JSON.stringify(completeData.error));
                        break; // Success, exit retry loop
                    } catch (err) {
                        if (attempt === MAX_RETRIES) throw new Error('Finalization failed after multiple attempts.');
                        console.warn(\`Retrying completion (Attempt \${attempt + 1})...\`);
                        updateStatus(\`Finalizing... (Attempt \${attempt + 1})\`);
                        await new Promise(r => setTimeout(r, 1000)); // Brief delay before retrying completion
                    }
                }

                // Success State
                progressContainer.style.display = 'none';
                resultContainer.style.display = 'block';
                resultContainer.innerHTML = \`
                    <div style="font-size: 20px; margin-bottom: 15px;">🎉 Upload Complete!</div>
                    <a class="final-link" href="\${completeData.url}" target="_blank">🔗 \${completeData.url}</a>
                    <button style="margin-top: 20px; padding: 12px; font-size: 14px;" onclick="window.location.reload()">Upload Another File</button>
                \`;

            } catch (error) {
                updateStatus('Upload Failed');
                document.getElementById('statusText').style.color = '#e74c3c';
                uploadBtn.style.display = 'block';
                uploadBtn.innerText = 'Try Again';
                uploadArea.style.display = 'block';
                console.error(error);
            }
        }
    </script>
</body>
</html>
`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Serve Frontend
        if (request.method === 'GET' && path === '/') {
            return new Response(HTML_CONTENT, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // POST /api/start
        if (request.method === 'POST' && path === '/api/start') {
            try {
                let body = await request.json();
                
                const MAX_SIZE = 900 * 1024 * 1024;
                if (body.size > MAX_SIZE) {
                    body.size = MAX_SIZE;
                }

                const payload = {
                    apikey: API_KEY,
                    filename: body.filename,
                    mimetype: body.mimetype,
                    size: body.size,
                    store: { location: 's3' }
                };

                const fsRes = await fetch('https://upload.filestackapi.com/multipart/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await fsRes.json();
                return new Response(JSON.stringify(data), {
                    status: fsRes.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500 });
            }
        }

        // POST /api/upload
        if (request.method === 'POST' && path === '/api/upload') {
            try {
                let payload = await request.json();
                const location_url = payload.location_url;
                delete payload.location_url; 
                
                payload.apikey = API_KEY;
                payload.store = { location: 's3' };

                const fsRes = await fetch(`https://${location_url}/multipart/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await fsRes.json();
                return new Response(JSON.stringify(data), {
                    status: fsRes.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500 });
            }
        }

        // POST /api/complete
        if (request.method === 'POST' && path === '/api/complete') {
            try {
                let payload = await request.json();
                const location_url = payload.location_url;
                delete payload.location_url;

                payload.apikey = API_KEY;
                payload.store = { location: 's3' };

                const fsRes = await fetch(`https://${location_url}/multipart/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await fsRes.json();
                
                if (data.url) {
                    const fileId = data.url.split('/').pop();
                    data.url = `https://${your_worker_url}/file/${fileId}`;  // put your worker url here
                }

                return new Response(JSON.stringify(data), {
                    status: fsRes.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500 });
            }
        }

        // GET /file/:id Route 
        if (request.method === 'GET' && path.startsWith('/file/')) {
            const id = path.split('/')[2];
            const fsUrl = `https://cdn.filestackcontent.com/${id}`;
            
            let filename = "your file";
            let sizeStr = "Unknown size";

            try {
                const metaRes = await fetch(`${fsUrl}/metadata`);
                if (metaRes.ok) {
                    const metaData = await metaRes.json();
                    if (metaData.filename) filename = metaData.filename;
                    if (metaData.size) {
                        sizeStr = (metaData.size / 1024 / 1024).toFixed(2) + " MB";
                    }
                }
            } catch (e) {
                // Ignore
            }

            // Injected meta tag below strictly removes the Referer header
            const promptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="referrer" content="no-referrer">
                <title>Download</title>
                <style>
                    body { font-family: 'Segoe UI', system-ui, sans-serif; text-align: center; padding-top: 50px; background: #fffbe6; color: #333; }
                </style>
            </head>
            <body>
                <h2>Processing Download...</h2>
                <script>
                    if (confirm("Do you want to download '${filename}' (${sizeStr})?")) {
                        window.location.href = "${fsUrl}";
                    } else {
                        document.body.innerHTML = "<h2>Download Cancelled.</h2>";
                    }
                </script>
            </body>
            </html>
            `;

            return new Response(promptHtml, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new Response('Not Found', { status: 404 });
    }
};

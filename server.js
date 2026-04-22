const express = require('express');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// CONFIGURATION
const API_KEY = 'AngQm42YPQvqLYiPExD1Az';
const YOUR_DOMAIN = `http://localhost:${PORT}`; 

app.use(bodyParser.json());
app.use(express.static('public'));

// Serve the Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST /api/start
app.post('/api/start', async (req, res) => {
    try {
        const { filename, mimetype, size } = req.body;
        const payload = {
            apikey: API_KEY,
            filename,
            mimetype,
            size: Math.min(size, 900 * 1024 * 1024), // 900MB Cap. This is not an uploading size limit, its just to trick filestack for signed url 
            store: { location: 's3' }
        };

        const response = await axios.post('https://upload.filestackapi.com/multipart/start', payload);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/upload
app.post('/api/upload', async (req, res) => {
    try {
        const { location_url, ...payload } = req.body;
        payload.apikey = API_KEY;
        payload.store = { location: 's3' };

        const response = await axios.post(`https://${location_url}/multipart/upload`, payload);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/complete
app.post('/api/complete', async (req, res) => {
    try {
        const { location_url, ...payload } = req.body;
        payload.apikey = API_KEY;
        payload.store = { location: 's3' };

        const response = await axios.post(`https://${location_url}/multipart/complete`, payload);
        const data = response.data;

        if (data.url) {
            const fileId = data.url.split('/').pop();
            data.url = `${YOUR_DOMAIN}/file/${fileId}`;
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /file/:id - The Download Interface
app.get('/file/:id', async (req, res) => {
    const id = req.params.id;
    const fsUrl = `https://cdn.filestackcontent.com/${id}`;
    
    let filename = "your file";
    let sizeStr = "Unknown size";

    try {
        const metaRes = await axios.get(`${fsUrl}/metadata`);
        filename = metaRes.data.filename || filename;
        if (metaRes.data.size) {
            sizeStr = (metaRes.data.size / 1024 / 1024).toFixed(2) + " MB";
        }
    } catch (e) {}

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="referrer" content="no-referrer">
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f4f7f6; margin: 0; }
                .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
                .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Ready to Download</h2>
                <p><strong>File:</strong> ${filename}</p>
                <p><strong>Size:</strong> ${sizeStr}</p>
                <a href="${fsUrl}" class="btn">Download Now</a>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

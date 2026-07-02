const http = require('node:http');

const email = process.argv[2] || process.env.E2E_RESET_EMAIL || 'test@example.com';
const newPassword = process.argv[3] || process.env.E2E_RESET_PASSWORD;

if (!newPassword) {
    console.error('Usage: node e2e-reset.js [email] <password>  OR  set E2E_RESET_PASSWORD env var');
    process.exit(1);
}

function post(path, body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname: 'localhost',
            port: 5000,
            path,
            method: 'POST',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        };
        const req = http.request(opts, (res) => {
            let b = '';
            res.on('data', (c) => (b += c));
            res.on('end', () => {
                let j = null;
                try {
                    j = JSON.parse(b);
                } catch (error) { /* JSON parse may fail for non-JSON responses */ console.debug('Non-JSON response:', error.message); }
                resolve({ status: res.statusCode, json: j, raw: b });
            });
        });
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'Request timed out' }); });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        req.write(data);
        req.end();
    });
}

(async () => {
    console.log('--- Forgot Password ---');
    console.log('Email:', email);
    const f = await post('/api/auth/forgot-password', { email });
    console.log('Status:', f.status);
    console.log('Response:', f.json ?? f.raw);

    if (!f.json?.resetToken) {
        console.log('No resetToken returned. Check inbox for the code and run reset separately.');
        process.exit(0);
    }

    const token = f.json.resetToken;
    console.log('Using resetToken:', token);

    console.log('\n--- Reset Password ---');
    const r = await post('/api/auth/reset-password', {
        email,
        resetToken: token,
        newPassword,
    });
    console.log('Status:', r.status);
    console.log('Response:', r.json || r.raw);
})();



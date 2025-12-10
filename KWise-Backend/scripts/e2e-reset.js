const http = require('http');

const email = process.argv[2] || 'ludwigrivera13@gmail.com';
const newPassword = process.argv[3] || 'NewPassw0rd!';

function post(path, body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname: 'localhost',
            port: 5000,
            path,
            method: 'POST',
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
                } catch (_) { }
                resolve({ status: res.statusCode, json: j, raw: b });
            });
        });
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
    console.log('Response:', f.json || f.raw);

    if (!f.json || !f.json.resetToken) {
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



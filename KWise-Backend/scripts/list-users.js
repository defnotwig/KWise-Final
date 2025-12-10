require('dotenv').config();
const db = require('../config/db');

(async () => {
    try {
        const { rows } = await db.query(
            `SELECT id, name, email, role, reference_email, password, created_at, updated_at
			 FROM users
			 ORDER BY id ASC`
        );
        const safe = rows.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            reference_email: u.reference_email,
            password_hash_preview: u.password ? String(u.password).slice(0, 10) + '…' : null,
            has_password: !!u.password,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }));
        console.log(JSON.stringify({ count: safe.length, users: safe }, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Error listing users:', e.message);
        process.exit(1);
    }
})();

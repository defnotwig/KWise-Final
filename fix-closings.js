const fs = require('node:fs');
const p = String.raw`C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\K-Wise\src\pages\Settings\Settings.js`;
let c = fs.readFileSync(p, 'utf8');
const before = (c.match(/ {4}\)\}\n {4}\);/g) || []).length;
c = c.replaceAll(/ {8}<\/div>\n {4}\)\}\n {4}\);/g, '        </div>\n    );');
const after = (c.match(/ {4}\)\}\n {4}\);/g) || []).length;
fs.writeFileSync(p, c);
console.log('Fixed: ' + before + ' -> ' + after + ' occurrences');

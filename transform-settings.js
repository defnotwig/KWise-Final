/**
 * Transformation script: Reduce Cognitive Complexity in Settings.js
 * Extracts inline tab JSX into render functions and uses data-driven tab rendering.
 */
const fs = require('node:fs');
const filePath = String.raw`C:\Users\Ludwig Rivera\Downloads\K-Wise Final 2\K-Wise\src\pages\Settings\Settings.js`;
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log(`Read ${lines.length} lines from Settings.js`);

// ======= HELPER: De-indent lines by removing N leading spaces =======
function extractAndDeindent(allLines, start, end, deindentSpaces) {
    return allLines.slice(start - 1, end).map(line => {
        if (line.trim() === '') return '';
        const leading = (line.match(/^(\s*)/) || ['', ''])[1].length;
        return ' '.repeat(Math.max(0, leading - deindentSpaces)) + line.trimStart();
    });
}

// ======= STEP 1: Build render functions from inline tab blocks =======
// Each block: inner JSX (<div className="settings-section">...</div>)
// Line numbers are 1-indexed from the ORIGINAL file
const blocks = [
    { name: 'renderAppearanceTab', start: 1029, end: 1097 },
    { name: 'renderSystemTab', start: 1105, end: 1182 },
    { name: 'renderDeveloperTab', start: 1189, end: 1247 },
    { name: 'renderMonitoringTab', start: 1251, end: 1362 },
    { name: 'renderEmailTab', start: 1366, end: 1458 },
    { name: 'renderBackupTab', start: 1462, end: 1569 },
    { name: 'renderPerformanceTab', start: 1573, end: 1694 },
    { name: 'renderPrinterTab', start: 1698, end: 2040 },
];

// Verify content at expected positions
console.log('\nVerifying line positions:');
console.log(`Line 891: "${lines[890].trim()}"`);
console.log(`Line 898: "${lines[897].trim()}"`);
console.log(`Line 927: "${lines[926].trim()}"`);
console.log(`Line 1019: "${lines[1018].trim()}"`);
console.log(`Line 1027: "${lines[1026].trim()}"`);
console.log(`Line 1028: "${lines[1027].trim()}"`);
console.log(`Line 2040: "${lines[2039].trim()}"`);
console.log(`Line 2041: "${lines[2040].trim()}"`);
console.log(`Line 2042: "${lines[2041].trim()}"`);

// Verify expected content
const checks = [
    [891, "let connectButtonLabel"],
    [898, "return ("],
    [927, '<div className="settings-tabs">'],
    [1019, "</div>"],
    [1027, "{/* Appearance Tab"],
    [2040, ")}"],
    [2042, '<div className="form-actions">'],
];

let allChecksPass = true;
for (const [lineNum, expected] of checks) {
    if (!lines[lineNum - 1].includes(expected)) {
        console.error(`MISMATCH at line ${lineNum}: expected "${expected}", got "${lines[lineNum - 1].trim()}"`);
        allChecksPass = false;
    }
}
if (!allChecksPass) {
    console.error('Line position checks failed! Aborting.');
    process.exit(1);
}
console.log('All line position checks passed!\n');

// Build render function lines
let newFunctions = [];
for (const block of blocks) {
    const deindented = extractAndDeindent(lines, block.start, block.end, 16);
    newFunctions.push(
        `    const ${block.name} = () => (`,
        ...deindented,
        '    );',
        ''
    );
}
console.log(`Built ${blocks.length} render functions (${newFunctions.length} lines)`);

// ======= STEP 2: Build TAB_CONFIG and TAB_RENDERERS =======
const tabConfigLines = [
    '    const TAB_CONFIG = [',
    "        { key: 'appearance', label: t('appearance'), visible: canEditAppearanceSettings() },",
    "        { key: 'account', label: 'Account Security', visible: canEditAccountSecuritySettings() },",
    "        { key: 'system', label: t('system'), visible: canEditSystemSettings() || canEditOperationalSettings() },",
    "        { key: 'security', label: t('security'), visible: canEditSecuritySettings() },",
    "        { key: 'developer', label: 'Developer', visible: canEditDeveloperSettings() },",
    "        { key: 'monitoring', label: <><FiMonitor /> Monitoring</>, visible: canViewMonitoring() },",
    "        { key: 'email', label: <><FiMail /> Email</>, visible: canEditEmailSettings() },",
    "        { key: 'backup', label: <><FiDatabase /> Backup</>, visible: canEditBackupSettings() },",
    "        { key: 'performance', label: <><FiActivity /> Performance</>, visible: canEditPerformanceSettings() },",
    "        { key: 'printer', label: <><FiPrinter /> Thermal Printer</>, visible: currentUser?.role === 'superadmin' || currentUser?.role === 'admin' },",
    '    ];',
    '',
    '    const TAB_RENDERERS = {',
    '        appearance: renderAppearanceTab,',
    '        account: renderAccountTab,',
    '        system: renderSystemTab,',
    '        security: renderSecurityTab,',
    '        developer: renderDeveloperTab,',
    '        monitoring: renderMonitoringTab,',
    '        email: renderEmailTab,',
    '        backup: renderBackupTab,',
    '        performance: renderPerformanceTab,',
    '        printer: renderPrinterTab,',
    '    };',
    '',
];

// ======= STEP 3: Build new tab bar =======
const newTabBar = [
    '            <div className="settings-tabs">',
    '                {TAB_CONFIG.filter(tab => tab.visible).map(tab => (',
    '                    <button type="button"',
    '                        key={tab.key}',
    "                        className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}",
    '                        onClick={() => setActiveTab(tab.key)}',
    '                    >',
    '                        {tab.label}',
    '                    </button>',
    '                ))}',
    "                {(currentUser?.role === 'superadmin' || currentUser?.role === 'admin') && (",
    '                    <button type="button"',
    "                        className={`settings-tab ${activeTab === 'ip-access' ? 'active' : ''}`}",
    '                        onClick={() => {',
    "                            globalThis.location.href = '/admin/ip-access-control';",
    '                        }}',
    '                    >',
    '                        <FiShield /> IP Access Control',
    '                    </button>',
    '                )}',
    '            </div>',
];

// ======= STEP 4: New tab content (single lookup) =======
const newTabContent = [
    '                    {TAB_RENDERERS[activeTab]?.()}',
    '',
];

// ======= APPLY ALL CHANGES (backwards to preserve line numbers) =======

// 1. Replace tab content: lines 1027-2041 (1-indexed, inclusive)
const contentStart = 1027 - 1; // 0-indexed: 1026
const contentCount = 2041 - 1027 + 1; // 1015 lines
lines.splice(contentStart, contentCount, ...newTabContent);
console.log(`Replaced ${contentCount} content lines with ${newTabContent.length} lines`);

// 2. Replace tab bar: lines 927-1019 (1-indexed, inclusive)
const tabBarStart = 927 - 1; // 0-indexed: 926
const tabBarCount = 1019 - 927 + 1; // 93 lines
lines.splice(tabBarStart, tabBarCount, ...newTabBar);
console.log(`Replaced ${tabBarCount} tab bar lines with ${newTabBar.length} lines`);

// 3. Insert TAB_CONFIG before "return (" at line 898 (1-indexed)
lines.splice(898 - 1, 0, ...tabConfigLines);
console.log(`Inserted ${tabConfigLines.length} TAB_CONFIG lines at position 898`);

// 4. Insert render functions before "let connectButtonLabel" at line 891 (1-indexed)
lines.splice(891 - 1, 0, ...newFunctions);
console.log(`Inserted ${newFunctions.length} render function lines at position 891`);

// Write the file
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\nWrote ${lines.length} lines to Settings.js`);
console.log('Transformation complete!');

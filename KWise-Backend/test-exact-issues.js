/**
 * Test script to identify exact critical issues for user's build
 */
const http = require('http');

const data = JSON.stringify({
  components: {
    cpu: { id: 35, name: 'AMD RYZEN 3 3200G', specifications: { socket: 'AM4', tdp: 65 } },
    cooling: { id: 714, name: 'DEEPCOOL AMD AM3/AM4', specifications: { compatible_sockets: ['AM4', 'AM5'] } },
    motherboard: { id: 109, name: 'AORUS ELITE B550M AX', specifications: { socket: 'AM4', memory_type: 'DDR4' } },
    gpu: { id: 444, name: 'RTX4070 IGAME ULTRA W OC', specifications: {}, dimensions: { power_connectors: '1x 16-pin (12VHPWR)' } },
    case: { id: 607, name: 'DARKFLASH DB330M', specifications: { supported_form_factors: 'ATX,Micro-ATX,Mini-ITX' } },
    psu: { id: 529, name: '750W MSI MAG A750BN', specifications: { pcie_connectors: '2 x 6+2 pin connectors | 1 x 16-pin 12VHPWR', has_12vhpwr_connector: false } },
    ram: { id: 204, name: '16GB T-Force DarkZa', specifications: { memory_type: 'DDR4' } },
    storage: { id: 323, name: '250GB Western Digital', specifications: { interface: 'SATA III' } }
  },
  pageName: 'PC-Customized',
  comprehensive: true
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/compatibility/advanced/full-build',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(body);
      console.log('\n=== VALIDATION RESULT ===');
      console.log('Overall Status:', result.data?.overall_status);
      console.log('Overall Message:', result.data?.overall_message);
      
      console.log('\n=== ALL ISSUES (Critical) ===');
      if (result.data?.all_issues && result.data.all_issues.length > 0) {
        result.data.all_issues.forEach((issue, i) => {
          console.log(`  ${i+1}. [${issue.layer || 'unknown'}] ${issue.message}`);
        });
      } else {
        console.log('  No critical issues found!');
      }
      
      console.log('\n=== LAYERS STATUS ===');
      if (result.data?.layers) {
        Object.entries(result.data.layers).forEach(([layerName, layer]) => {
          console.log(`\n  ${layerName}:`);
          console.log(`    Status: ${layer.status || 'N/A'}`);
          console.log(`    Compatible: ${layer.compatible}`);
          if (layer.critical_issues && layer.critical_issues.length > 0) {
            console.log(`    Critical Issues (${layer.critical_issues.length}):`);
            layer.critical_issues.forEach((issue, i) => {
              console.log(`      ${i+1}. ${issue.message}`);
            });
          }
        });
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw response:', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Connection Error:', e.message));
req.write(data);
req.end();

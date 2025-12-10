# 🚀 BRUTAL STRESS TEST - QUICK START GUIDE

## Prerequisites

### 1. Install Ollama
```bash
# Download and install from https://ollama.ai
# Or use package manager
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Download DeepSeek-R1 Model
```bash
# Download the 1.5B model (recommended for speed)
ollama pull deepseek-r1:1.5b

# Or use the 7B model (more accurate but slower)
ollama pull deepseek-r1:7b
```

### 3. Start Ollama Service
```bash
ollama serve
```

### 4. Start K-Wise Backend
```bash
cd KWise-Backend
npm start
```

## Running Tests

### Basic Usage

```bash
# Run all implemented test sections (currently 1-2)
npm run test:brutal

# Run specific section
npm run test:brutal:section1   # PC-Parts page tests
npm run test:brutal:section2   # Product page tests

# Run with verbose output and AI debugging
npm run test:brutal:verbose

# Run multiple sections
node brutal-test-runner.js --section=1,2

# Run without stopping on catastrophic failures
npm run test:brutal:no-stop

# Quick test (no report generation)
npm run test:brutal:quick
```

### Understanding Results

#### Rating Scale (0-5.0)
- **5.0 - PERFECT:** Zero failures, all performance targets met
- **4.5-4.9 - EXCELLENT:** Minor issues only, meets standards
- **3.5-4.4 - GOOD:** Some failures but no critical issues
- **2.5-3.4 - ACCEPTABLE:** Multiple failures, needs improvement
- **0-2.4 - POOR:** Critical or catastrophic failures

#### Failure Severity
- 🔴 **CATASTROPHIC:** Incompatible parts shown as compatible (INSTANT FAIL)
- 🟠 **CRITICAL:** Missing validation, wrong calculations (MUST FIX)
- 🟡 **STANDARD:** Issues that should be fixed (RECOMMENDED)
- ⚪ **MINOR:** Small improvements (OPTIONAL)

#### Performance Targets
Each test has two thresholds:
- **Target:** Ideal response time (green)
- **Max:** Maximum acceptable time (yellow)
- **Over Max:** Unacceptable (red)

## Test Sections Available

### ✅ Section 1: PC-Parts Page (20 Traps)
Tests progressive component filtering and compatibility checks.

**Key Tests:**
- Initial CPU selection → motherboard/cooler/RAM filtering
- Motherboard added → RAM type filtering (DDR4/DDR5)
- GPU added → power budget, clearance validation
- RAM added → capacity, speed, clearance checks
- Full build → 28-pair comprehensive validation

**Run:** `npm run test:brutal:section1`

### ✅ Section 2: Product Page (8 Traps)
Tests "Compatible With" section on product pages.

**Key Tests:**
- CPU page → compatible motherboards, coolers, RAM
- GPU page → compatible CPUs (tier matching), PSUs, cases

**Run:** `npm run test:brutal:section2`

### 🚧 Sections 3-13 (Coming Soon)
Additional sections covering:
- Order summaries
- Step-by-step builder
- AI build generation
- Upgrade analysis
- Edge cases
- Concurrent load testing

## Interpreting Reports

### Console Output
Real-time test execution with immediate pass/fail indicators:
```
🔍 TRAP 1: AMD motherboard for Intel CPU should NEVER show
✅ TRAP 1 PASSED: AMD motherboard for Intel CPU should NEVER show
```

### Generated Files
Located in `./results/`:

1. **`brutal-test-results-[timestamp].json`**
   - Complete test data
   - All trap results
   - Performance metrics
   - AI response logs

2. **`brutal-test-report-[timestamp].md`**
   - Human-readable markdown
   - Detailed test breakdown
   - Configuration used

3. **`brutal-test-summary-[timestamp].txt`**
   - Quick reference text file
   - Pass/fail summary
   - Rating and statistics

## Common Issues

### Ollama Not Running
```
❌ Ollama service: NOT AVAILABLE
   Please start Ollama: ollama serve
```
**Fix:** Start Ollama in a separate terminal: `ollama serve`

### Backend Not Running
```
❌ K-Wise backend: NOT AVAILABLE
```
**Fix:** Start backend: `cd KWise-Backend && npm start`

### Model Not Downloaded
```
Error: model 'deepseek-r1:1.5b' not found
```
**Fix:** Download model: `ollama pull deepseek-r1:1.5b`

### Slow AI Responses (>5 seconds)
**Cause:** Model cold start or hardware limitations

**Fixes:**
1. Use smaller model: Edit `config/brutal-test-config.js`, change to `deepseek-r1:1.5b`
2. Increase GPU memory allocation
3. Warm up model: Run a test query first

### Database Rules Not Loaded
```
⚠️  Compatibility rules: 0 (minimum 3000 required)
```
**Fix:** Run database migrations:
```bash
cd KWise-Backend
node scripts/load-compatibility-rules.js
```

## Configuration

Edit `config/brutal-test-config.js` to customize:

```javascript
module.exports = {
    // AI Model
    ai: {
        model: 'deepseek-r1:1.5b',  // Change model
        temperature: 0.1,            // Lower = more deterministic
        timeout: 30000               // Increase if timeouts occur
    },

    // Performance Targets
    performance: {
        singleComponentFilter: {
            target: 50,   // ms
            max: 100      // ms
        }
        // ... more thresholds
    },

    // Load Testing
    load: {
        concurrentUsers: 50,  // Adjust based on server capacity
        testDuration: 60000   // ms
    }
};
```

## Development

### Adding New Trap Tests

1. Create new trap in appropriate section file:
```javascript
const trapX = await testHelpers.testTrap(
    X,
    'Description of what should/shouldn't happen',
    async () => {
        // Test logic here
        return {
            passed: true/false,
            severity: config.severity.CATASTROPHIC,
            details: 'Explanation'
        };
    }
);
```

2. Add trap to section results array
3. Update documentation

### Creating New Test Sections

1. Create new file: `tests/section-X-name.test.js`
2. Follow existing section structure
3. Add to `brutal-test-runner.js`:
```javascript
case X:
    const sectionX = new SectionXTests();
    return await sectionX.runAll();
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Brutal Stress Tests
  run: |
    ollama serve &
    npm run test:brutal
  continue-on-error: false  # Fail CI if tests fail
```

### Exit Codes
- `0`: All tests passed (rating ≥4.5, no catastrophic/critical)
- `1`: Tests failed (catastrophic, critical, or rating <4.5)

## Performance Benchmarking

### Expected Response Times
- Single component filter: <100ms
- 2-component chained: <150ms
- 4-component chained: <300ms
- Full 8-component validation: <1000ms
- AI build generation: <3000ms

### Concurrent Load Testing (Section 9)
Simulates 50 simultaneous users building PCs:
- Max 20% response time degradation acceptable
- <0.1% error rate
- No race conditions or cache conflicts

## Support

### Documentation
- Full protocol: See `README.md` in project root
- Test specifications: User-provided 168-trap protocol
- API reference: `KWise-Backend/API_DOCUMENTATION.md`

### Troubleshooting
1. Check prerequisites are met
2. Review console output for specific errors
3. Examine generated JSON report for details
4. Enable verbose mode: `--verbose --ai-debug`

## Target Standard

**🎯 ZERO TOLERANCE POLICY**

The goal is **5.0/5.0** with:
- ✅ 100% trap test pass rate
- ✅ Zero catastrophic failures
- ✅ Zero critical failures
- ✅ 95%+ tests meet performance targets
- ✅ AI validation accuracy ±2%

**Anything less requires fixes before production deployment.**


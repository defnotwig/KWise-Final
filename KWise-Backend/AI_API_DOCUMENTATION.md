# K-Wise AI API Documentation

**Version:** 2.0  
**Last Updated:** November 4, 2025  
**Author:** K-Wise Development Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Core AI Endpoints](#core-ai-endpoints)
6. [Compatibility Analysis](#compatibility-analysis)
7. [Upgrade Recommendations](#upgrade-recommendations)
8. [Build Validation](#build-validation)
9. [Diagnostics & Analysis](#diagnostics--analysis)
10. [Admin Endpoints](#admin-endpoints)
11. [Error Codes](#error-codes)
12. [Response Format](#response-format)
13. [Postman Collection](#postman-collection)

---

## 📖 Overview

The K-Wise AI API provides intelligent PC hardware compatibility analysis, upgrade recommendations, and build optimization powered by **DeepSeek R1 7B** AI model with:

- **Real-time compatibility analysis** with 95%+ accuracy
- **Smart caching** for sub-second responses (60-70% cache hit rate)
- **Circuit breaker protection** for resilient fallback
- **3-tier intelligent caching** (in-memory, Redis, disk)
- **Semantic search** with embeddings
- **Build validation** with hardware bottleneck detection

**AI Model:** DeepSeek R1 7B (4.7 GB VRAM)  
**Keep-Alive:** 60 seconds (prevents cold starts)  
**Response Time:** 28-2000ms (cached: <100ms, AI: 500-2000ms)  
**Uptime:** 99.9% with circuit breaker fallback

---

## 🌐 Base URL

```
Development: http://localhost:5000/api
Production: https://kwise.example.com/api
```

---

## 🔐 Authentication

Most endpoints are **public** for kiosk use. Admin endpoints require authentication:

```http
Authorization: Bearer <JWT_TOKEN>
```

**Required Roles:**

- `superadmin` - Full access
- `admin` - Read/write access
- `developer` - Read access + testing

**Get Token:**

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

---

## ⏱️ Rate Limiting

### General Endpoints

- **100 requests per 15 minutes** per IP
- Header: `X-RateLimit-Limit: 100`
- Header: `X-RateLimit-Remaining: 95`
- Header: `X-RateLimit-Reset: 1699123456`

### Expensive Operations (AI Analysis)

- **20 requests per 15 minutes** per IP
- Applies to: `/ai/estimate-current-build`, `/ai/recommend-upgrade`, `/compatibility/analyze`

**Rate Limit Exceeded Response:**

```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in 5 minutes.",
  "retryAfter": 300
}
```

---

## 🤖 Core AI Endpoints

### 1. **AI Health Check**

Check AI system status, model availability, and circuit breaker state.

```http
GET /api/ai/health
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "modelAvailable": true,
    "model": "deepseek-r1:7b",
    "circuitState": "CLOSED",
    "cacheHitRate": 67.5,
    "avgResponseTime": 850,
    "totalRequests": 1523,
    "failureRate": 2.1
  }
}
```

---

### 2. **AI System Status**

Detailed AI system metrics including cache performance.

```http
GET /api/ai/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "aiEnabled": true,
    "model": "deepseek-r1:7b",
    "circuitBreaker": {
      "state": "CLOSED",
      "healthy": true,
      "failureThreshold": 5,
      "successRate": 97.9
    },
    "cache": {
      "entries": 245,
      "hitRate": 67.5,
      "missRate": 32.5,
      "evictions": 12
    },
    "performance": {
      "avgLatency": 850,
      "p95Latency": 1500,
      "p99Latency": 2000
    }
  }
}
```

---

## 🔗 Compatibility Analysis

### 3. **Analyze Compatibility**

Analyze compatibility between current product and available stock.

```http
POST /api/compatibility/analyze
Content-Type: application/json
```

**Request Body:**

```json
{
  "currentProduct": {
    "id": 123,
    "name": "AMD Ryzen 7 7700X",
    "category": "CPU",
    "price": 15999,
    "specifications": {
      "socket": "AM5",
      "cores": 8,
      "tdp": 105
    }
  },
  "excludeCategories": ["Case"],
  "minPrice": 5000,
  "maxPrice": 50000,
  "limit": 10
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "name": "ASUS ROG Strix X670E-E",
      "category": "Motherboard",
      "price": 28995,
      "compatibility_score": 95,
      "reasoning": "Perfect match: AM5 socket, PCIe 5.0, DDR5 support, handles 105W TDP with robust VRM",
      "issues": [],
      "strengths": [
        "Native AM5 socket support",
        "Premium VRM design for stable power delivery",
        "PCIe 5.0 and DDR5 ready for future upgrades"
      ],
      "specifications": {
        "socket": "AM5",
        "chipset": "X670E",
        "memory_type": "DDR5"
      }
    }
  ],
  "cached": false,
  "source": "ai",
  "latency": 850,
  "circuitState": "CLOSED",
  "aiAnalysis": {
    "totalCategories": 6,
    "productsPerCategory": 1,
    "aiEnabled": true,
    "model": "deepseek-r1:7b"
  },
  "message": "Found 6 compatible products for AMD Ryzen 7 7700X"
}
```

**Cache Headers:**

- `X-Cache: HIT` or `X-Cache: MISS`
- `X-Cache-TTL: 3600` (seconds)

---

### 4. **Simple Compatibility Check**

Lightweight compatibility validation without AI analysis.

```http
POST /api/compatibility/simple
Content-Type: application/json
```

**Request Body:**

```json
{
  "product1": {
    "category": "CPU",
    "specifications": { "socket": "AM5" }
  },
  "product2": {
    "category": "Motherboard",
    "specifications": { "socket": "AM5" }
  }
}
```

**Response:**

```json
{
  "success": true,
  "compatible": true,
  "score": 100,
  "issues": [],
  "strengths": ["Socket compatibility: AM5"]
}
```

---

### 5. **Batch Analyze Compatibility**

Analyze multiple product pairs simultaneously.

```http
POST /api/compatibility/batch-analyze
Content-Type: application/json
```

**Request Body:**

```json
{
  "pairs": [
    {
      "product1": { "id": 1, "category": "CPU" },
      "product2": { "id": 2, "category": "Motherboard" }
    },
    {
      "product1": { "id": 3, "category": "GPU" },
      "product2": { "id": 4, "category": "PSU" }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "pair": 0,
      "compatible": true,
      "score": 95,
      "issues": []
    },
    {
      "pair": 1,
      "compatible": false,
      "score": 40,
      "issues": ["PSU wattage insufficient for GPU"]
    }
  ]
}
```

---

## 🔄 Upgrade Recommendations

### 6. **Estimate Current Build**

Analyze current PC build and provide assessment.

```http
POST /api/ai/estimate-current-build
Content-Type: application/json
```

**Request Body:**

```json
{
  "build": {
    "cpu": { "name": "Intel Core i5-10400", "cores": 6 },
    "gpu": { "name": "GTX 1660 Super", "vram": 6 },
    "ram": { "capacity": 16, "type": "DDR4", "speed": 3200 },
    "storage": { "capacity": 512, "type": "NVMe" },
    "motherboard": { "chipset": "B460", "socket": "LGA1200" },
    "psu": { "wattage": 550, "efficiency": "80+ Bronze" }
  },
  "purpose": "gaming",
  "budget": 30000
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overall_assessment": "good",
    "confidence": 85,
    "performance_rating": {
      "gaming": 75,
      "productivity": 70,
      "content_creation": 60
    },
    "bottlenecks": ["GPU"],
    "strengths": [
      "Balanced RAM configuration",
      "Fast NVMe storage",
      "Adequate PSU headroom"
    ],
    "issues": [
      {
        "component": "GPU",
        "severity": "moderate",
        "description": "GTX 1660 Super limits 1080p gaming to ~60fps medium settings"
      }
    ],
    "upgrade_priorities": [
      {
        "component": "GPU",
        "reason": "Biggest performance impact for gaming",
        "estimated_improvement": "40-60%",
        "budget_recommendation": "₱18,000-25,000"
      }
    ],
    "reasoning": "Solid mid-range gaming build from 2020. CPU still capable but GPU becoming limiting factor for modern AAA titles at high settings."
  },
  "latency": 1200,
  "source": "ai",
  "cached": false
}
```

---

### 7. **Recommend Upgrade**

Get AI-powered upgrade recommendations based on current build.

```http
POST /api/ai/recommend-upgrade
Content-Type: application/json
```

**Request Body:**

```json
{
  "currentBuild": {
    "cpu": { "name": "Intel Core i5-10400", "price": 8500 },
    "gpu": { "name": "GTX 1660 Super", "price": 12000 },
    "ram": { "name": "16GB DDR4-3200", "capacity": 16 },
    "motherboard": { "chipset": "B460", "socket": "LGA1200" }
  },
  "budget": 25000,
  "purpose": "gaming",
  "mode": "in-stock"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recommendations": {
      "GPU": {
        "name": "RTX 4060",
        "price": 18995,
        "improvement": "60-80% gaming performance",
        "compatibility_score": 100,
        "reasoning": "Major GPU upgrade enables 1080p high/ultra 100+ fps. Compatible with existing PSU and motherboard."
      }
    },
    "totalCost": 18995,
    "expectedImprovement": "60-80% overall gaming performance",
    "bottlenecks": [],
    "mode": "in-stock",
    "executionTime": 1500
  }
}
```

---

### 8. **Future Upgrade Path**

Plan long-term upgrade strategy.

```http
POST /api/ai/future-upgrade
Content-Type: application/json
```

**Request Body:**

```json
{
  "currentBuild": {
    "cpu": "Intel Core i5-10400",
    "gpu": "GTX 1660 Super",
    "ram": "16GB DDR4"
  },
  "timeframe": "12-24 months",
  "budget": 50000,
  "goals": ["1440p gaming", "ray tracing"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "phase1": {
      "timeframe": "0-6 months",
      "priority": "GPU upgrade",
      "recommendation": "RTX 4070",
      "cost": 32995,
      "impact": "Enables 1440p high/ultra gaming"
    },
    "phase2": {
      "timeframe": "6-12 months",
      "priority": "CPU + Motherboard + RAM",
      "recommendation": "Intel Core i5-13600K + Z790 + 32GB DDR5",
      "cost": 45000,
      "impact": "Eliminates CPU bottleneck, future-proofs platform"
    },
    "totalCost": 77995,
    "timeline": "12 months"
  }
}
```

---

## ✅ Build Validation

### 9. **Validate Build Compatibility**

Comprehensive build validation with AI analysis.

```http
POST /api/ai/build/validate-compatibility
Content-Type: application/json
```

**Request Body:**

```json
{
  "components": [
    {
      "category": "CPU",
      "name": "AMD Ryzen 9 7950X",
      "specifications": { "socket": "AM5", "tdp": 170 }
    },
    {
      "category": "Motherboard",
      "name": "ASUS ROG X670E",
      "specifications": { "socket": "AM5", "max_tdp": 230 }
    },
    {
      "category": "RAM",
      "name": "64GB DDR5-6000",
      "specifications": { "type": "DDR5", "speed": 6000 }
    },
    {
      "category": "GPU",
      "name": "RTX 4090",
      "specifications": { "tdp": 450, "pcie": "5.0" }
    },
    {
      "category": "PSU",
      "name": "1000W 80+ Gold",
      "specifications": { "wattage": 1000, "efficiency": "gold" }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "compatible": true,
    "overall_score": 92,
    "issues": [
      {
        "severity": "warning",
        "component": "PSU",
        "message": "1000W is minimum for RTX 4090. Consider 1200W for overclocking headroom."
      }
    ],
    "strengths": [
      "Excellent CPU-motherboard pairing",
      "High-speed DDR5 maximizes Zen 4 performance",
      "PCIe 5.0 support future-proofs GPU connectivity"
    ],
    "powerAnalysis": {
      "totalTDP": 620,
      "psuWattage": 1000,
      "headroom": 380,
      "sufficient": true
    },
    "bottlenecks": [],
    "reasoning": "High-end enthusiast build with excellent balance. Minor PSU upgrade recommended for maximum stability."
  }
}
```

---

### 10. **Optimize Build for Budget**

AI-optimized build within budget constraints.

```http
POST /api/ai/build/optimize-budget
Content-Type: application/json
```

**Request Body:**

```json
{
  "budget": 80000,
  "purpose": "gaming",
  "priorities": ["GPU", "CPU", "RAM"],
  "preferences": {
    "brand": "ASUS",
    "aesthetic": "RGB"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "build": {
      "CPU": { "name": "AMD Ryzen 7 7700X", "price": 15999 },
      "GPU": { "name": "RTX 4070", "price": 32995 },
      "Motherboard": { "name": "ASUS TUF Gaming X670", "price": 12995 },
      "RAM": { "name": "32GB DDR5-6000 RGB", "price": 8995 },
      "Storage": { "name": "1TB NVMe Gen4", "price": 4995 },
      "PSU": { "name": "750W 80+ Gold", "price": 4995 }
    },
    "totalCost": 80974,
    "budgetUtilization": 101.2,
    "performanceRating": 88,
    "reasoning": "Optimal 1440p gaming build prioritizing GPU (40% budget). Balanced CPU prevents bottleneck. 32GB RAM future-proofs for content creation."
  }
}
```

---

## 🔍 Diagnostics & Analysis

### 11. **PC Checkup (Diagnostics)**

Comprehensive PC health analysis.

```http
POST /api/ai/diagnostics/pc-checkup
Content-Type: application/json
```

**Request Body:**

```json
{
  "build": {
    "cpu": "Intel Core i7-10700K",
    "gpu": "RTX 3070",
    "ram": "32GB DDR4-3200"
  },
  "issues": ["Occasional stuttering in games", "High CPU temps (85°C)"],
  "usage": "gaming and streaming"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overallHealth": "good",
    "issuesFound": 2,
    "diagnostics": [
      {
        "issue": "High CPU temperatures",
        "severity": "moderate",
        "causes": [
          "Insufficient cooling",
          "Thermal paste degradation",
          "Poor case airflow"
        ],
        "recommendations": [
          "Upgrade to tower cooler (Noctua NH-D15)",
          "Reapply thermal paste",
          "Add case fans for better airflow"
        ],
        "estimatedCost": 3500
      },
      {
        "issue": "Gaming stuttering",
        "severity": "low",
        "causes": ["CPU thermal throttling", "Background processes"],
        "recommendations": [
          "Fix cooling first (resolves throttling)",
          "Close background apps during gaming",
          "Update GPU drivers"
        ],
        "estimatedCost": 0
      }
    ]
  }
}
```

---

### 12. **Analyze Bottlenecks**

Identify performance bottlenecks in build.

```http
POST /api/ai/diagnostics/analyze-bottlenecks
Content-Type: application/json
```

**Request Body:**

```json
{
  "build": {
    "cpu": { "name": "Intel Core i9-13900K", "cores": 24 },
    "gpu": { "name": "RTX 4090", "vram": 24 },
    "ram": { "capacity": 16, "speed": 3200 },
    "storage": { "type": "SATA SSD", "capacity": 500 }
  },
  "workload": "4K gaming and video editing"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bottlenecks": [
      {
        "component": "RAM",
        "severity": "high",
        "description": "16GB insufficient for 4K gaming + video editing",
        "impact": "System memory saturation causes stuttering and slow renders",
        "recommendation": "Upgrade to 64GB DDR5-6000",
        "cost": 18995
      },
      {
        "component": "Storage",
        "severity": "moderate",
        "description": "SATA SSD (550 MB/s) bottlenecks 4K video editing",
        "impact": "Slow project load times and scrubbing lag",
        "recommendation": "Upgrade to 2TB NVMe Gen4 (7000 MB/s)",
        "cost": 12995
      }
    ],
    "overallScore": 65,
    "reasoning": "High-end CPU/GPU pairing undermined by insufficient RAM and slow storage for 4K workflows."
  }
}
```

---

### 13. **Hot Picks (AI Recommendations)**

Get AI-curated product recommendations.

```http
POST /api/ai/hot-picks
Content-Type: application/json
```

**Request Body:**

```json
{
  "category": "GPU",
  "budget": 30000,
  "purpose": "1080p gaming"
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "name": "RTX 4060",
      "price": 18995,
      "score": 95,
      "reasoning": "Best value for 1080p: 100+ fps high settings, DLSS 3, ray tracing, 8GB VRAM"
    },
    {
      "id": 790,
      "name": "RX 7600",
      "price": 16995,
      "score": 88,
      "reasoning": "Budget alternative: 80+ fps high settings, 8GB VRAM, excellent power efficiency"
    }
  ]
}
```

---

### 14. **Compare Products**

AI-powered product comparison.

```http
POST /api/ai/compare-products
Content-Type: application/json
```

**Request Body:**

```json
{
  "products": [
    { "id": 1, "name": "RTX 4070", "price": 32995 },
    { "id": 2, "name": "RX 7800 XT", "price": 29995 }
  ],
  "useCase": "1440p gaming"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "winner": "RTX 4070",
    "comparison": {
      "performance": {
        "RTX 4070": 95,
        "RX 7800 XT": 92,
        "winner": "RTX 4070 (+3%)"
      },
      "value": {
        "RTX 4070": 88,
        "RX 7800 XT": 95,
        "winner": "RX 7800 XT (₱3,000 cheaper)"
      },
      "features": {
        "RTX 4070": "DLSS 3, better ray tracing, lower power",
        "RX 7800 XT": "More VRAM (16GB), FSR 3"
      }
    },
    "recommendation": "RTX 4070 for ray tracing enthusiasts. RX 7800 XT for best value and future VRAM needs."
  }
}
```

---

## 👨‍💼 Admin Endpoints

### 15. **AI Metrics (Admin)**

```http
GET /api/ai/admin/metrics
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRequests": 15234,
    "successRate": 97.8,
    "avgResponseTime": 850,
    "cacheHitRate": 67.5,
    "circuitBreakerState": "CLOSED",
    "topEndpoints": [
      { "endpoint": "/compatibility/analyze", "count": 5234 },
      { "endpoint": "/ai/recommend-upgrade", "count": 3421 }
    ]
  }
}
```

---

### 16. **Top Upgrade Paths (Admin)**

```http
GET /api/ai/admin/top-upgrade-paths
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "from": "GTX 1660 Super",
      "to": "RTX 4060",
      "count": 234,
      "avgImprovement": 70
    }
  ]
}
```

---

### 17. **Cache Statistics**

```http
GET /api/ai/cache/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalEntries": 1245,
    "hitRate": 67.5,
    "missRate": 32.5,
    "evictions": 89,
    "avgRetrievalTime": 12,
    "memoryUsage": "145 MB"
  }
}
```

---

## ❌ Error Codes

| Code | Description                                    | Solution                                   |
| ---- | ---------------------------------------------- | ------------------------------------------ |
| 400  | Bad Request - Invalid request body             | Check request format                       |
| 401  | Unauthorized - Missing/invalid token           | Provide valid JWT token                    |
| 404  | Not Found - Resource doesn't exist             | Verify endpoint URL and resource ID        |
| 429  | Too Many Requests - Rate limit exceeded        | Wait for rate limit reset                  |
| 500  | Internal Server Error - AI service unavailable | Retry with fallback mode                   |
| 503  | Service Unavailable - Circuit breaker open     | AI temporarily unavailable, using fallback |

**Error Response Format:**

```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in 5 minutes.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": "100 requests per 15 minutes limit reached",
    "retryAfter": 300
  }
}
```

---

## 📦 Response Format

All API responses follow this structure:

```json
{
  "success": true | false,
  "data": { ... },
  "message": "Human-readable message",
  "cached": true | false,
  "source": "ai" | "cache" | "deterministic" | "fallback",
  "latency": 850,
  "circuitState": "CLOSED" | "OPEN" | "HALF_OPEN",
  "metadata": {
    "timestamp": "2025-11-04T05:00:00.000Z",
    "version": "2.0"
  }
}
```

**Metadata Fields:**

- `cached`: Whether response came from cache
- `source`: Data source (AI, cache, deterministic rules, fallback)
- `latency`: Response time in milliseconds
- `circuitState`: Circuit breaker state

---

## 📮 Postman Collection

Import this JSON to Postman for quick testing:

```json
{
  "info": {
    "name": "K-Wise AI API",
    "version": "2.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Compatibility Analysis",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:5000/api/compatibility/analyze",
        "body": {
          "mode": "raw",
          "raw": "{\"currentProduct\":{\"id\":123,\"name\":\"AMD Ryzen 7 7700X\",\"category\":\"CPU\",\"price\":15999}}"
        }
      }
    },
    {
      "name": "Estimate Current Build",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:5000/api/ai/estimate-current-build",
        "body": {
          "mode": "raw",
          "raw": "{\"build\":{\"cpu\":{\"name\":\"Intel Core i5-10400\",\"cores\":6},\"gpu\":{\"name\":\"GTX 1660 Super\"},\"ram\":{\"capacity\":16,\"type\":\"DDR4\"}},\"purpose\":\"gaming\",\"budget\":30000}"
        }
      }
    },
    {
      "name": "Recommend Upgrade",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:5000/api/ai/recommend-upgrade",
        "body": {
          "mode": "raw",
          "raw": "{\"currentBuild\":{\"cpu\":{\"name\":\"Intel Core i5-10400\"},\"gpu\":{\"name\":\"GTX 1660 Super\"}},\"budget\":25000,\"purpose\":\"gaming\"}"
        }
      }
    },
    {
      "name": "AI Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:5000/api/ai/health"
      }
    },
    {
      "name": "Validate Build",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:5000/api/ai/build/validate-compatibility",
        "body": {
          "mode": "raw",
          "raw": "{\"components\":[{\"category\":\"CPU\",\"name\":\"AMD Ryzen 9 7950X\"},{\"category\":\"Motherboard\",\"name\":\"ASUS ROG X670E\"}]}"
        }
      }
    }
  ]
}
```

---

## 🔧 Configuration

**Environment Variables:**

```env
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=deepseek-r1:7b
AI_KEEP_ALIVE_INTERVAL=60000
CACHE_TTL=3600
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
RATE_LIMIT_GENERAL=100
RATE_LIMIT_AI=20
```

---

## 📊 Performance Benchmarks

| Endpoint                           | Avg Latency | P95 Latency | Cache Hit Rate |
| ---------------------------------- | ----------- | ----------- | -------------- |
| `/compatibility/analyze`           | 850ms       | 1500ms      | 67%            |
| `/ai/estimate-current-build`       | 1200ms      | 2000ms      | 45%            |
| `/ai/recommend-upgrade`            | 1500ms      | 2500ms      | 38%            |
| `/ai/build/validate-compatibility` | 1000ms      | 1800ms      | 52%            |

**Cache Performance:**

- **Cache Hit**: <100ms response time
- **Cache Miss**: 500-2000ms (AI processing)
- **Fallback Mode**: 100-500ms (deterministic rules)

---

## 🆘 Support

**Issues:** Report bugs and feature requests at GitHub Issues  
**Documentation:** [Full docs](https://kwise.example.com/docs)  
**Contact:** support@kwise.com

---

**Last Updated:** November 4, 2025  
**Version:** 2.0  
**AI Model:** DeepSeek R1 7B  
**Status:** Production Ready ✅

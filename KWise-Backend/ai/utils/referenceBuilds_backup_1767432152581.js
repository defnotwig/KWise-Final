/**
 * PC UPGRADE REFERENCE BUILDS SYSTEM
 * 
 * AUTO-GENERATED FROM DATABASE: 2025-11-15T09:53:57.330Z
 * 
 * This module contains 72 reference builds using ACTUAL products.
 * Each build references real product IDs, ensuring accurate suggestions.
 */

const REFERENCE_BUILDS = {
  "gaming_2021-2025_10000-25000": {
    "usage": "gaming",
    "yearRange": "2021-2025",
    "budgetRange": "10000-25000",
    "estimatedAge": 4,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 11,
        "name": "AMD RYZEN 5 8400F (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "avg_rating": 3,
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "last_updated": "2025-11-10T20:11:50.792195+08:00",
          "total_ratings": 1,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "satisfaction_score": 48,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-8400f-1757970960464.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 201,
        "name": "8GB Team Elite Plus DDR4 3200Mhz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "1199.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 8,
          "cas_latency": "CL22",
          "memory_type": "DDR4",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-team-elite-plus-ddr4-3200mhz-1758202322500.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 301,
        "name": "256GB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "1499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "SATA",
          "capacity": "256GB",
          "interface": "SATA",
          "read_speed": "520",
          "form_factor": "2.5\"",
          "write_speed": "450",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/240gb-t-force-vulcan-z-1758216251189.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 136,
        "name": "Test GIGABYTE B650M K Direct",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "159.99",
        "specs": {
          "socket": "AM5",
          "chipset": "B650",
          "max_ram": 128,
          "M2 Slots": "2",
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 3,
          "sata_ports": 4,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR5",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/test-gigabyte-b650m-k-direct.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 501,
        "name": "550w CORSAIR CX550 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "2995.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/550w-corsair-cx550-80-bronze-1758269565920.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 601,
        "name": "NZXT H510 Mid Tower Case (Black)",
        "brand": "NZXT",
        "category": "Case",
        "price": "1000.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "381mm",
          "tempered_glass": false,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/nzxt-h510-mid-tower-case-1758312262623.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 701,
        "name": "Single Color Fans RGB",
        "brand": "INPLAY",
        "category": "Cooling",
        "price": "150.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1200,
          "max_noise": 25,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/single-color-fans-rgb-1758015685164.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.318Z",
    "databaseProducts": true
  },
  "gaming_2021-2025_26000-50000": {
    "usage": "gaming",
    "yearRange": "2021-2025",
    "budgetRange": "26000-50000",
    "estimatedAge": 4,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 12,
        "name": "AMD RYZEN 5 7600 (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "10495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-7600-1757971070351.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 202,
        "name": "16GB Team Elite Plus DDR4 3200Mhz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2199.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL 22",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-ddr4-3200mhz-1758202737953.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 302,
        "name": "512GB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "2499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": null,
          "capacity": "512GB",
          "interface": "SATA",
          "read_speed": "540",
          "form_factor": "2.5\"",
          "write_speed": "470",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-t-force-vulcan-z-1758216468849.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 401,
        "name": "4GB RX550 RAMSTA *SINGLE FAN",
        "brand": "AMD",
        "category": "GPU",
        "price": "4995.00",
        "specs": {
          "tdp": 50,
          "fans": "Single Fan",
          "tier": "entry",
          "length": 170,
          "launched": "2017-04-19T16:00:00.000Z",
          "interface": "PCIe 3.0",
          "pcie_8pin": 0,
          "core_clock": 1100,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 1183,
          "memory_type": "GDDR5",
          "effective_clock": 7000,
          "memory_capacity": 4
        },
        "imageUrl": "/assets/parts/gpu/4gb-rx550-ramsta-single-fan-1758175506538.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 502,
        "name": "650w CORSAIR CX650 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "3485.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-corsair-cx650-80-bronze-1758269692122.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 602,
        "name": "POWERLOGIC SLIM (Black)",
        "brand": "POWERLOGIC",
        "category": "Case",
        "price": "1350.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower",
          "fans_included": 1,
          "max_gpu_length": "250mm",
          "tempered_glass": false,
          "max_cpu_cooler_height": "140mm"
        },
        "imageUrl": "/assets/parts/case/powerlogic-slim-black-1758312408833.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 702,
        "name": "Single Color Fans Red",
        "brand": "INPLAY",
        "category": "Cooling",
        "price": "150.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1200,
          "max_noise": 25,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/single-color-fans-red-1758015562808.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.318Z",
    "databaseProducts": true
  },
  "gaming_2021-2025_51000-75000": {
    "usage": "gaming",
    "yearRange": "2021-2025",
    "budgetRange": "51000-75000",
    "estimatedAge": 4,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 13,
        "name": "AMD RYZEN 7 8700F (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "11495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-8700f-1757971242831.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 203,
        "name": "16GB Kingston Fury Beast",
        "brand": "KINGSTON",
        "category": "RAM",
        "price": "2399.00",
        "specs": {
          "speed": 3200,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-kingston-fury-beast-ddr4-3200mhz-1758202948123.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 303,
        "name": "500GB SAMSUNG 870 EVO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "3199.00",
        "specs": {
          "cache": "512 MB",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "SATA",
          "read_speed": "560",
          "form_factor": "2.5\"",
          "write_speed": "530",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-870-evo-1758216632711.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 402,
        "name": "8GB RX580 XFX GTS XXX Edition *(DUALFAN)",
        "brand": "AMD",
        "category": "GPU",
        "price": "6995.00",
        "specs": {
          "tdp": 185,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2017-04-17T16:00:00.000Z",
          "interface": "PCIe 3.0",
          "pcie_8pin": 1,
          "core_clock": 1366,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 1380,
          "memory_type": "GDDR5",
          "effective_clock": 8000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx580-xfx-gts-xxx-edition-dualfan-1758175642305.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 503,
        "name": "750w CORSAIR CX750 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "3985.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-corsair-cx750-80-bronze-1758269787013.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 603,
        "name": "KEYTECH ROBIN LITE",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1480.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-lite-1758295759134.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 703,
        "name": "DEEPCOOL XFAN 120M BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "220.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1300,
          "max_noise": 21,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-xfan-120m-black-1758015025773.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.319Z",
    "databaseProducts": true
  },
  "gaming_2021-2025_76000-100000": {
    "usage": "gaming",
    "yearRange": "2021-2025",
    "budgetRange": "76000-100000",
    "estimatedAge": 4,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 14,
        "name": "AMD RYZEN 7 7700 (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "12750.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-7700-1757971509444.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 204,
        "name": "16GB T-Force DarkZa Kit (2x8GB) 3600MHz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2499.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-darkza-kit-2x8gb-3600mhz-1758203256313.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 304,
        "name": "1TB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3695.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "NVMe",
          "capacity": "1TB",
          "interface": "M.2 PCIe 3.0 X4",
          "read_speed": "3200",
          "form_factor": "2.5\"",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-green-1758218370759.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 403,
        "name": "RX6600 GIGABYTE EAGLE",
        "brand": "AMD",
        "category": "GPU",
        "price": "13995.00",
        "specs": {
          "tdp": 132,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 282,
          "launched": "2021-10-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2044,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2491,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx6600-gigabyte-eagle-tri-fan-1758175978102.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 504,
        "name": "850w CORSAIR RM850e 80+ GOLD FM",
        "brand": "Corsair",
        "category": "PSU",
        "price": "8195.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "3 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-corsair-rm850e-80-gold-fm-1758282632567.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 604,
        "name": "KEYTECH ROBIN VIEW",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1480.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower",
          "fans_included": 2,
          "max_gpu_length": "270mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-view-1758308100657.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 704,
        "name": "DEEPCOOL RF120R 120M BLACK Red",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1500,
          "max_noise": 23,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-rf120r-120m-black-red-1758014538256.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.319Z",
    "databaseProducts": true
  },
  "gaming_2016-2020_10000-25000": {
    "usage": "gaming",
    "yearRange": "2016-2020",
    "budgetRange": "10000-25000",
    "estimatedAge": 9,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 15,
        "name": "AMD RYZEN 5 8600G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "12750.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-8600g-1757971615786.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 205,
        "name": "16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-tuf-2x8gb-3600mhz-black-1758203447554.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 305,
        "name": "500GB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2695.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3200",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-green-1758222133406.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 505,
        "name": "FSP Hydro M PRO 600W",
        "brand": "FSP",
        "category": "PSU",
        "price": "3750.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 600,
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/fsp-hydro-m-pro-600-1758295209505.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 605,
        "name": "INPLAY OPENVIEW V100",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1499.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/inplay-openview-v100-1758308368093.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 705,
        "name": "DEEPCOOL RF120B 120M BLACK Blue",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1500,
          "max_noise": 23,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-rf120b-120m-black-blue-1758014508895.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.319Z",
    "databaseProducts": true
  },
  "gaming_2016-2020_26000-50000": {
    "usage": "gaming",
    "yearRange": "2016-2020",
    "budgetRange": "26000-50000",
    "estimatedAge": 9,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 16,
        "name": "AMD RYZEN 7 8700G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "17830.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-8700g-1757971700136.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 206,
        "name": "16GB T-FORCE DELTA RGB (2x8GB) 3600MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3195.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL 18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-2x8gb-3600mhz-white-1758203652205.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 306,
        "name": "500GB WESTERN DIGITAL BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3295.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4",
          "read_speed": "5000",
          "form_factor": "2.5\"",
          "write_speed": "4500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-blue-1758217875548.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 404,
        "name": "RX7600XT GIGABYTE GAMING OC",
        "brand": "AMD",
        "category": "GPU",
        "price": "23995.00",
        "specs": {
          "tdp": 190,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 297,
          "launched": "2024-01-23T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2470,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2755,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16-rx7600xt-gigabyte-gaming-oc-tri-fan-1758176087822.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 506,
        "name": "700w FSP HYDRO M PRO 80+ BRONZE *SEMI MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "3650.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 700,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/700w-fsp-hydro-m-pro-80-bronze-semi-modular-1758294640216.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 606,
        "name": "1stPlayer MIKU 2",
        "brand": "",
        "category": "Case",
        "price": "1700.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX",
          "case_category": null,
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/1stplayer-miku-2-1758308639568.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 706,
        "name": "YGT 1258 (3in1) KIT w/Controller BLACK",
        "brand": "YGT",
        "category": "Cooling",
        "price": "850.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1800,
          "max_noise": 26,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/ygt-1258-3in1-kit-with-controller-black-1758015787930.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.320Z",
    "databaseProducts": true
  },
  "gaming_2016-2020_51000-75000": {
    "usage": "gaming",
    "yearRange": "2016-2020",
    "budgetRange": "51000-75000",
    "estimatedAge": 9,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 17,
        "name": "AMD RYZEN 7 9700X (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "23320.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-9700x-1757971806427.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 207,
        "name": "32GB T-Force DarkZa Kit",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3995.00",
        "specs": {
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 18",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-darkza-kit-2x16gb-3600mhz-1758203961871.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 307,
        "name": "1TB WESTERN DIGITAL BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "4799.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "M.2 PCIe 4.0 X4",
          "read_speed": "5150",
          "form_factor": "2.5\"",
          "write_speed": "4900",
          "nvme_support": true,
          "storage_type": "NVMe SSDnn"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-blue-1758220963348.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 405,
        "name": "RX7700XT GIGABYTE GAMING OC",
        "brand": "AMD",
        "category": "GPU",
        "price": "27995.00",
        "specs": {
          "tdp": 245,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 302,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2171,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2544,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rx7700xt-gigabyte-gaming-oc-tri-fan-1758176193279.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 507,
        "name": "800w FSP HYDRO M PRO 80+ BRONZE *SEMI MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "3750.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 800,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/800w-fsp-hydro-m-pro-80-bronze-semi-modular-1758294779894.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 607,
        "name": "DARKFLASH DB330M",
        "brand": "DARKFLASH",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "180mm"
        },
        "imageUrl": "/assets/parts/case/darkflash-db330m-1758312171953.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 707,
        "name": "INPLAY SEAVIEW (3in1) KIT w/Controller BLACK",
        "brand": "INPLAY",
        "category": "Cooling",
        "price": "1000.00",
        "specs": {
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/inplay-seaview-3in1-kit-with-controller-black-1758015178102.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.320Z",
    "databaseProducts": true
  },
  "gaming_2016-2020_76000-100000": {
    "usage": "gaming",
    "yearRange": "2016-2020",
    "budgetRange": "76000-100000",
    "estimatedAge": 9,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 18,
        "name": "AMD RYZEN 9 9900X (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "28630.00",
        "specs": {
          "tdp": 120,
          "tier": "elite",
          "cores": 12,
          "series": "Ryzen 9",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 24,
          "launched": "2024-02-19T16:00:00.000Z",
          "base_clock": 4.1,
          "lithography": 5,
          "turbo_clock": 5.7,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-9-9900x-1757971901972.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 208,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "4995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-2x16gb-3600mhz-black-1758206125005.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 308,
        "name": "500GB WESTERN DIGITAL BLACK",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7300",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-black-1758221969840.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 406,
        "name": "RX7800XT GIGABYTE GAMING OC",
        "brand": "AMD",
        "category": "GPU",
        "price": "33995.00",
        "specs": {
          "tdp": 263,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 320,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2124,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2430,
          "memory_type": "GDDR6",
          "effective_clock": 19200,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx7800xt-gigabyte-gaming-oc-tri-fan-1758176546745.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 508,
        "name": "FSP VITA GM 850W",
        "brand": "FSP",
        "category": "PSU",
        "price": "7300.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold,"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-850w-1758282834087.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 608,
        "name": "COOLMAN REYNA (White)",
        "brand": "COOLMAN",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/coolman-reyna-1758308823350.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 708,
        "name": "KEYTECH PRISM (3in1) KIT w/Controller BLACK/WHITE",
        "brand": "KEYTECH",
        "category": "Cooling",
        "price": "1000.00",
        "specs": {
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/keytech-prism-3in1-kit-with-controller-black-or-white-1758015278989.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.320Z",
    "databaseProducts": true
  },
  "gaming_2010-2015_10000-25000": {
    "usage": "gaming",
    "yearRange": "2010-2015",
    "budgetRange": "10000-25000",
    "estimatedAge": 15,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 19,
        "name": "AMD RYZEN 7 9800X3D",
        "brand": "AMD",
        "category": "CPU",
        "price": "32995.00",
        "specs": {
          "tdp": 120,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-9800x3d-1757971996565.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 209,
        "name": "32GB G.SKILL Trident Z RGB",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "5495.00",
        "specs": {
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-trident-z-rgb-2x16gb-3600mhz-1758206297401.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 309,
        "name": "1TB WESTERN DIGITAL BLACK",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "5499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7300",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-black-1758220804428.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 131,
        "name": "GIGABYTE GA-B650M-D3HP",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7695.00",
        "specs": {
          "socket": "AM5",
          "chipset": "B650",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-ga-b650m-d3hp-1763600807352.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 509,
        "name": "FSP VITA GM 850W (White)",
        "brand": "FSP",
        "category": "PSU",
        "price": "7495.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-850w-white-1758282923678.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 609,
        "name": "KEYTECH DARKVADER",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1199.00",
        "specs": {
          "color": "Black (Mesh)",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mini Tower",
          "fans_included": 2,
          "max_gpu_length": "260mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/keytech-darkvader-1758308974432.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 709,
        "name": "DEEPCOOL TF120S BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "495.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1500,
          "max_noise": 24,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-tf120s-black-1758014578243.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.320Z",
    "databaseProducts": true
  },
  "gaming_2010-2015_26000-50000": {
    "usage": "gaming",
    "yearRange": "2010-2015",
    "budgetRange": "26000-50000",
    "estimatedAge": 15,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 20,
        "name": "Intel Core i5 12400F (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "7480.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-12400f-1757972101082.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 210,
        "name": "16GB TEAM ELITE PLUS +",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL 22",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-3200-mhz-1758212058653.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 310,
        "name": "512GB TEAMGROUP MP33 PRO",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "2699.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "512GB",
          "interface": "PCIe Gen3",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "3000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-teamgroup-mp33-pro-1758219046209.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 123,
        "name": "ASUS PRIME H610M-K (DDR5)",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-h610m-k-ddr5-1763583069464.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 407,
        "name": "RX7700XT ASROCK STEEL LEGEND",
        "brand": "AMD",
        "category": "GPU",
        "price": "27995.00",
        "specs": {
          "tdp": 245,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 305,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2171,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2544,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rx7700xt-asrock-steel-legend-tri-fan-1758179830945.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 510,
        "name": "FSP VITA GM 1000W",
        "brand": "FSP",
        "category": "PSU",
        "price": "8500.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-1000w-1758283133413.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 610,
        "name": "INPLAY META A200 MESH (Black)",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1399.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "265mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "150mm"
        },
        "imageUrl": "/assets/parts/case/inplay-meta-a200-mesh-black-1758309117207.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 710,
        "name": "ARCTIC P12 PWM SINGLE WHITE",
        "brand": "ARCTIC",
        "category": "Cooling",
        "price": "495.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1800,
          "max_noise": 22,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/arctic-p12-pwm-single-white-1758014134888.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.320Z",
    "databaseProducts": true
  },
  "gaming_2010-2015_51000-75000": {
    "usage": "gaming",
    "yearRange": "2010-2015",
    "budgetRange": "51000-75000",
    "estimatedAge": 15,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 21,
        "name": "Intel Core i5 12400 (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-12400-1757972153603.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 211,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "7499.00",
        "specs": {
          "type": "DDR5",
          "speed": 6400,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-2x16gb-6400mhz-white-1758211631463.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 311,
        "name": "1TB XPG SX8200 PRO",
        "brand": "ADATA",
        "category": "Storage",
        "price": "4099.00",
        "specs": {
          "cache": "Dynamic SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "3000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-xpg-sx8200-pro-1758219361407.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 143,
        "name": "GIGABYTE B760M DS3H AX (DDR5) *12-14th GEN",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "6499.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "Intel B760",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b760m-ds3h-ax-ddr5-1758090767524.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 408,
        "name": "RTX3050 PALIT STORM",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "10495.00",
        "specs": {
          "tdp": 130,
          "fans": "Single Fan",
          "tier": "entry",
          "length": 170,
          "launched": "2022-01-26T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1552,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 1777,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 6
        },
        "imageUrl": "/assets/parts/gpu/6gb-rtx3050-palit-storm-single-fan-1758179663218.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 511,
        "name": "550w GIGABYTE P550SS 80+ SILVER",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "2395.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/550w-gigabyte-p550ss-80-silver-1758293790408.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 611,
        "name": "INPLAY META A200 MESH (White)",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1499.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "265mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "150mm"
        },
        "imageUrl": "/assets/parts/case/inplay-meta-a200-mesh-white-1758309232054.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 711,
        "name": "DEEPCOOL 140M TF140S 3 in 1 KIT BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "1200.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 1600,
          "max_noise": 25,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-140m-tf140s-3-in-1-kit-black-1758014221924.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.321Z",
    "databaseProducts": true
  },
  "gaming_2010-2015_76000-100000": {
    "usage": "gaming",
    "yearRange": "2010-2015",
    "budgetRange": "76000-100000",
    "estimatedAge": 15,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 22,
        "name": "Intel Core i7 12700F (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "15495.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 12,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 20,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.1,
          "lithography": 10,
          "turbo_clock": 4.9,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-12700f-1757973486075.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 212,
        "name": "16GB G.Skill Ripjaws (2x8GB) DDR4 3600MHz",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "2399.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-g.skill-ripjaws-2x8gb-ddr4-3600mhz-1758211996825.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 312,
        "name": "256GB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "1599.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 NVMe Gen3",
          "capacity": "256GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\"",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/256gb-adata-legend-710-1758219606720.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 12039,
        "name": "ASRock B760M Pro RS/D4",
        "brand": "ASRock",
        "category": "Motherboard",
        "price": "7999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asrock-b760m-pro-rs-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 409,
        "name": "RTX4060 GALAX 1-Click OC 2X",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "17795.00",
        "specs": {
          "tdp": 115,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-galax-1-click-oc-2x-dualfan-1758176660856.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 512,
        "name": "550w GIGABYTE P550SS ICE 80+ SILVER (*White )",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "2695.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/550w-gigabyte-p550ss-ice-80-silver-white--1758293933073.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 612,
        "name": "INPLAY METEOR 30 MESH",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1299.00",
        "specs": {
          "color": "Black or White (Mesh)",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "300mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/inplay-meteor-30-mesh-1758309509498.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 712,
        "name": "ARCTIC F12 Set of 5 (5pcs Fan)",
        "brand": "ARCTIC",
        "category": "Cooling",
        "price": "1489.00",
        "specs": {
          "height": null,
          "fanless": false,
          "max_rpm": 1350,
          "max_noise": 23,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/arctic-f12-set-of-5-5pcs-fan-1758014043305.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your gaming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.321Z",
    "databaseProducts": true
  },
  "work_2021-2025_10000-25000": {
    "usage": "work",
    "yearRange": "2021-2025",
    "budgetRange": "10000-25000",
    "estimatedAge": 4,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 23,
        "name": "Intel Core i5 14400F (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "9370.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-14400f-1757972245832.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 213,
        "name": "32GB T-Force Vulcan Z Kit (2x16GB) 3600MHz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL22",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-vulcan-z-kit-2x16gb-3600mhz-1758212202686.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 313,
        "name": "512GB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "2699.00",
        "specs": {
          "cache": "SLC (Single Level Caching) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "512GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-adata-legend-710-1758219705833.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 12039,
        "name": "ASRock B760M Pro RS/D4",
        "brand": "ASRock",
        "category": "Motherboard",
        "price": "7999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asrock-b760m-pro-rs-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 513,
        "name": "650w GIGABYTE P650G 80+ GOLD",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3985.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650g-80-gold-1758294290210.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 613,
        "name": "KEYTECH CUIRASS MESH",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1599.00",
        "specs": {
          "color": "Black or White (Mesh)",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "330mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/keytech-cuirass-mesh-1758309721025.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 713,
        "name": "Intel 1st - 11th Gen",
        "brand": "INTEL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "height": 60,
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 30,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/intel-1st---11th-gen-1758531476764.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.321Z",
    "databaseProducts": true
  },
  "work_2021-2025_26000-50000": {
    "usage": "work",
    "yearRange": "2021-2025",
    "budgetRange": "26000-50000",
    "estimatedAge": 4,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 24,
        "name": "Intel Core i7 14700F (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "19089.99",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 12,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 20,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.1,
          "lithography": 10,
          "turbo_clock": 4.9,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-14700f-1757972458993.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 214,
        "name": "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3395.00",
        "specs": {
          "type": "DDR5",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL28",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-1x16gb-6000mhz-black-1758207444566.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 314,
        "name": "1TB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "3699.00",
        "specs": {
          "cache": "SLC (Single Level Caching) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-adata-legend-710-1758219767488.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 12038,
        "name": "ASUS PRIME B760M-A WIFI D4",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "9999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-b760m-a-wifi-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 410,
        "name": "RTX4060 GIGABYTE EAGLE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "19995.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-gigabyte-eagle-tri-fan-1758176793477.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 514,
        "name": "850W AORUS ELITE PCIE5 80+ PLATINUM FULLY MODULAR",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "8450.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Platinum",
          "form_factor": "ATX",
          "pcie_connectors": "6 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Platinum, PCIe 5"
        },
        "imageUrl": "/assets/parts/psu/850w-aorus-elite-p850w-pcie5-80-platinum-fully-modular-psu-1758294439071.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 614,
        "name": "KEYTECH VISOR",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1699.00",
        "specs": {
          "color": "Black or White (Mesh)",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/keytech-visor-1758309870646.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 714,
        "name": "DEEPCOOL AMD AM3 / AM4",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "height": 60,
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 30,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-amd-1758010170075.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.321Z",
    "databaseProducts": true
  },
  "work_2021-2025_51000-75000": {
    "usage": "work",
    "yearRange": "2021-2025",
    "budgetRange": "51000-75000",
    "estimatedAge": 4,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 25,
        "name": "Intel Core ULTRA 5 245KF (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "19050.00",
        "specs": {
          "tdp": 105,
          "tier": "entry",
          "cores": 10,
          "series": "Core Ultra 5",
          "socket": "LGA1851",
          "max_ram": 128,
          "threads": 16,
          "launched": "2025-02-14T16:00:00.000Z",
          "base_clock": 3,
          "lithography": 10,
          "turbo_clock": 5.5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-ultra-5-245kf-1757973553414.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 215,
        "name": "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3495.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL38",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-1x16gb-6000mhz-white-1758207588963.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 315,
        "name": "1TB ADATA LEGEND 860",
        "brand": "ADATA",
        "category": "Storage",
        "price": "4195.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "6000",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "4000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-adata-legend-860-1758219893465.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 12052,
        "name": "MSI MAG B860 TOMAHAWK WIFI",
        "brand": "MSI",
        "category": "Motherboard",
        "price": "14999.00",
        "specs": {
          "rgb": true,
          "audio": "Realtek ALC897",
          "socket": "LGA1851",
          "chipset": "B860",
          "network": "2.5G Ethernet + Wi-Fi 6E",
          "features": [
            "DDR5 Support",
            "PCIe 5.0",
            "BIOS Flashback"
          ],
          "m2_slots": 3,
          "usb_ports": "1x USB-C 3.2 Gen 2x2, 6x USB 3.2 Gen 2, 4x USB 2.0",
          "SATA Ports": "4",
          "dimensions": "305mm x 244mm",
          "max_memory": "192GB",
          "pcie_slots": "1x PCIe 5.0 x16, 1x PCIe 4.0 x16",
          "sata_ports": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "memory_slots": 4,
          "memory_speed": "Up to 7800MHz"
        },
        "imageUrl": "https://example.com/b860-tomahawk.jpg",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 411,
        "name": "RTX4060 GIGABYTE EAGLE ICE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "20495.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-gigabyte-eagle-ice-tri-fan-white-1758176934288.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 517,
        "name": "500w Cougar STC500 80+",
        "brand": "Cougar",
        "category": "PSU",
        "price": "2280.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 500,
          "efficiency": "80+",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6-pin +2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+"
        },
        "imageUrl": "/assets/parts/psu/500w-cougar-stc500-80-1758269405947.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 615,
        "name": "1stPlayer TRILOBITE T5 MESH",
        "brand": "1STPLAYER",
        "category": "Case",
        "price": "1800.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "330mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/1stplayer-trilobite-t5-mesh-1758312058455.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 715,
        "name": "DEEPCOOL GAMMAX AG200",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "790.00",
        "specs": {
          "height": 125,
          "fanless": false,
          "max_rpm": 2200,
          "max_noise": 28,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-gamaxx-ag200-1758010297299.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.321Z",
    "databaseProducts": true
  },
  "work_2021-2025_76000-100000": {
    "usage": "work",
    "yearRange": "2021-2025",
    "budgetRange": "76000-100000",
    "estimatedAge": 4,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 26,
        "name": "Intel Core i3 8100 (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "7995.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 4,
          "series": "Core i3",
          "socket": "LGA1151",
          "max_ram": 64,
          "threads": 4,
          "launched": "2018-01-03T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 14,
          "turbo_clock": 4,
          "integrated_gpu": false,
          "max_supported_ram": 64,
          "multithreading_supported": false
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i3-8100-1757973373694.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 216,
        "name": "32GB G.Skill Ripjaws M5 Neo RGB (2x16GB) 6000MHz *BLACK",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "7250.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-ripjaws-m5-neo-rgb-2x16gb-6000mhz-black-1758212100911.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 316,
        "name": "2TB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "6995.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "2TB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-adata-legend-710-1758221033276.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 118,
        "name": "RAMSTA H310M",
        "brand": "RAMSTA",
        "category": "Motherboard",
        "price": "3499.00",
        "specs": {
          "socket": "LGA1151",
          "chipset": "H310",
          "max_ram": 64,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 3,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/ramsta-h310m-1763601021272.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 412,
        "name": "RTX4060Ti GIGABYTE EAGLE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "24999.00",
        "specs": {
          "tdp": 160,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 285,
          "launched": "2023-05-23T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2310,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2535,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060ti-gigabyte-eagle-tri-fan-1758177073084.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 518,
        "name": "750W YGT KY-750",
        "brand": "YGT",
        "category": "PSU",
        "price": "800.00",
        "specs": {
          "length": 55,
          "modular": false,
          "wattage": 750,
          "form_factor": "ATX",
          "pcie_connectors": "1x 6-pin",
          "sata_connectors": "2",
          "efficiency_rating": "Generic"
        },
        "imageUrl": "/assets/parts/psu/750w-ygt-ky-750-1758269193843.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 616,
        "name": "DARKFLASH DB330M MESH",
        "brand": "DARKFLASH",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "180mm"
        },
        "imageUrl": "/assets/parts/case/darkflash-db330m-mesh-1758309983502.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 716,
        "name": "DEEPCOOL GAMMAX AG300",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "960.00",
        "specs": {
          "height": 135,
          "fanless": false,
          "max_rpm": 2200,
          "max_noise": 28,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-gamaxx-ag300-1758010380686.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2016-2020_10000-25000": {
    "usage": "work",
    "yearRange": "2016-2020",
    "budgetRange": "10000-25000",
    "estimatedAge": 9,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 27,
        "name": "Intel Core i5 9400 (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "10495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-9400-1757973431371.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 217,
        "name": "32GB G.Skill Ripjaws M5 Neo RGB (2x16GB) 6000MHz *WHITE",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "7350.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-ripjaws-m5-neo-rgb-2x16gb-6000mhz-white-1758212156289.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 317,
        "name": "500GB SAMSUNG 980 NVME",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "3795.00",
        "specs": {
          "type": "NVMe SSD",
          "cache": "SLC (Single Level Caching 122GB) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3100",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "2600",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-980-nvme-1758220063443.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 12038,
        "name": "ASUS PRIME B760M-A WIFI D4",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "9999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-b760m-a-wifi-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 519,
        "name": "650w GIGABYTE P650SS 80+ SILVER (*BLACK)",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3495.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650ss-80-silver-black-1758294206082.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 617,
        "name": "KEYTECH ROBIN CUBE",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Dual Chamber Cube Case)",
          "fans_included": 3,
          "max_gpu_length": "320mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-cube-1758310342949.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 717,
        "name": "DEEPCOOL GAMMAX 400 V2 RED",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "899.00",
        "specs": {
          "height": 155,
          "fanless": false,
          "max_rpm": 1800,
          "max_noise": 26,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-gamaxx-400-v2-red-1758010942757.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2016-2020_26000-50000": {
    "usage": "work",
    "yearRange": "2016-2020",
    "budgetRange": "26000-50000",
    "estimatedAge": 9,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 28,
        "name": "Ryzen 5 3400G (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "4295.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 4,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 8,
          "launched": "2018-07-11T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 12,
          "turbo_clock": 4.2,
          "integrated_gpu": true,
          "max_supported_ram": 64,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-3400g-1757969482859.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 218,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "7499.00",
        "specs": {
          "type": "DDR5",
          "speed": 6400,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-kit-2x16gb-6400mhz-black-1758208585092.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 318,
        "name": "500GB SAMSUNG 970 Evo Plus",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "4095.00",
        "specs": {
          "cache": "512 MB",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3500",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "3300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-970-evo-plus-1758220218560.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 102,
        "name": "GIGABYTE A520M-K V2",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "3499.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-k-v2-1758016226168.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 413,
        "name": "RTX4060Ti GIGABYTE EAGLE ICE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "25999.00",
        "specs": {
          "tdp": 160,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 285,
          "launched": "2023-05-23T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2310,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2535,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060ti-gigabyte-eagle-ice-tri-fan-white-1758177132719.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 520,
        "name": "650w GIGABYTE P650SS 80+ SILVER (*White)",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3600.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650ss-80-silver-white-1758294065938.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 618,
        "name": "KEYTECH ROBIN MINI",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "2050.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "320mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-mini-1758310447526.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 718,
        "name": "DEEPCOOL AK400 BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "1499.00",
        "specs": {
          "height": 155,
          "fanless": false,
          "max_rpm": 1850,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ak400-black-1758011072286.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2016-2020_51000-75000": {
    "usage": "work",
    "yearRange": "2016-2020",
    "budgetRange": "51000-75000",
    "estimatedAge": 9,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 29,
        "name": "AMD Ryzen 5 4600G (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "5495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 12,
          "launched": "2021-04-14T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 12,
          "turbo_clock": 4.3,
          "integrated_gpu": true,
          "max_supported_ram": 64,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-4600g-1757970246948.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 219,
        "name": "64GB T-FORCE DELTA RGB (2x32GB) 6000MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "13995.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 64,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "2x32GB",
          "total_capacity": "64GB"
        },
        "imageUrl": "/assets/parts/ram/64gb-t-force-delta-rgb-2x32gb-6000mhz-black-1758211712731.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 319,
        "name": "1TB SAMSUNG 990 Pro",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "7195.00",
        "specs": {
          "cache": "Dynamic SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7450",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6900",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-samsung-990-pro-1758220535302.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 102,
        "name": "GIGABYTE A520M-K V2",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "3499.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-k-v2-1758016226168.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 414,
        "name": "RTX4070 GALAX 1-CLICK OC 2X",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "33995.00",
        "specs": {
          "tdp": 200,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2023-04-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1920,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2475,
          "memory_type": "GDDR6X",
          "effective_clock": 21000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rtx4070-galax-1-click-oc-2x-1758177524789.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 521,
        "name": "850w GIGABYTE UD850GM PG5 80+ GOLD *FULL MODULAR",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "6995.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-gigabyte-ud850gm-pg5-80-gold-full-modular-1758294894780.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 619,
        "name": "KEYTECH 011",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "2750.00",
        "specs": {
          "color": "Black or White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "360mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "150mm"
        },
        "imageUrl": "/assets/parts/case/keytech-011-blackwhite-1758310995533.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 719,
        "name": "DEEPCOOL AK400 WHITE",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "1595.00",
        "specs": {
          "height": 155,
          "fanless": false,
          "max_rpm": 1850,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ak400-white-1758011130962.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2016-2020_76000-100000": {
    "usage": "work",
    "yearRange": "2016-2020",
    "budgetRange": "76000-100000",
    "estimatedAge": 9,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 30,
        "name": "AMD Ryzen 5 5600GT (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "7185.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-06-14T16:00:00.000Z",
          "base_clock": 3.9,
          "lithography": 7,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5600gt-1757970332008.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 220,
        "name": "8GB ADATA DDR4 3200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "1395.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 8,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-adata-ddr4-3200-laptop-memory-1758212242632.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 320,
        "name": "1TB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "3495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "capacity": "1TB",
          "interface": "SATA",
          "read_speed": "550",
          "form_factor": "2.5\"",
          "write_speed": "500",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-t-force-vulcan-z-1758216812127.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 128,
        "name": "GIGABYTE A520M DS3H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "3995.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-ds3h-1758017196463.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 415,
        "name": "RTX4070 Super GALAX EX GAMER",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "39850.00",
        "specs": {
          "tdp": 220,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 295,
          "launched": "2024-01-16T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1980,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2550,
          "memory_type": "GDDR6X",
          "effective_clock": 22000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/rtx4070-super-galax-ex-gamer-1758179716871.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 522,
        "name": "750w FSP VITA 80+ GOLD ATX3.1 GEN5.1 *FULL MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "6795.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 750,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/750w-fsp-vita-80-gold-atx3.1-gen5.1-full-modular-1758294709321.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 620,
        "name": "COOLMAN SPECTRA",
        "brand": "COOLMAN",
        "category": "Case",
        "price": "2850.00",
        "specs": {
          "color": "Black or White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "400mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/coolman-spectra-1758311110092.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 720,
        "name": "DEEPCOOL AK400 PINK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "1998.00",
        "specs": {
          "height": 155,
          "fanless": false,
          "max_rpm": 1850,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ak400-pink-1758011195611.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2010-2015_10000-25000": {
    "usage": "work",
    "yearRange": "2010-2015",
    "budgetRange": "10000-25000",
    "estimatedAge": 15,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 31,
        "name": "AMD Ryzen 7 5700G (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 16,
          "launched": "2022-03-14T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 7,
          "turbo_clock": 4.6,
          "integrated_gpu": true,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-5700g-1757970709641.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 221,
        "name": "16GB ADATA DDR4 3200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "2395.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-adata-ddr4-3200-laptop-memory-1758211858013.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 321,
        "name": "2TB Western Digital SA510 BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "8320.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "capacity": "2TB",
          "interface": "SATA",
          "read_speed": "560",
          "form_factor": "2.5\"",
          "write_speed": "520",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-western-digital-sa510-blue-1758221377656.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 105,
        "name": "GIGABYTE A520M DS3H AC",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4995.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-ds3h-ac-1758017301023.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 523,
        "name": "1000w FSP VITA 80+ GOLD ATX3.1 GEN5.1 *FULL MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "8495.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 1000,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/1000w-fsp-vita-80-gold-atx3.1-gen5.1-full-modular-1758294518533.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 621,
        "name": "COOLMAN SPECTRA LUXE",
        "brand": "COOLMAN",
        "category": "Case",
        "price": "3200.00",
        "specs": {
          "color": "Black or White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "400mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/coolman-spectra-luxe-1758311184093.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 721,
        "name": "DEEPCOOL AG500 DIGITAL BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "2195.00",
        "specs": {
          "height": 158,
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 28,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ag500-black-1758011690538.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2010-2015_26000-50000": {
    "usage": "work",
    "yearRange": "2010-2015",
    "budgetRange": "26000-50000",
    "estimatedAge": 15,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 32,
        "name": "AMD Ryzen 5 5600 (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "5985.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2023-12-31T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 7,
          "turbo_clock": 4.6,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5600-1757970063151.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 222,
        "name": "8GB ADATA DDR5 4800 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "1995.00",
        "specs": {
          "type": "DDR5",
          "speed": 4800,
          "voltage": 1.25,
          "capacity": 8,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-adata-ddr5-4800-laptop-memory-1758212290771.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 322,
        "name": "250GB GIGABYTE 4000E * GEN4",
        "brand": "GIGABYTE",
        "category": "Storage",
        "price": "1499.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "250GB",
          "interface": "PCIe 4.0 x4",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/250gb-gigabyte-4000e-gen4-1758218798762.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 106,
        "name": "GIGABYTE B550M-K",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "5199.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "6",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b550m-k-1758017413457.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 416,
        "name": "RX6600 ASROCK",
        "brand": "AMD",
        "category": "GPU",
        "price": "13995.00",
        "specs": {
          "tdp": 132,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 282,
          "launched": "2021-10-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2044,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2491,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx6600-asrock-dual-fan-1758179783267.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 524,
        "name": "650W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "2995.00",
        "specs": {
          "length": 140,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-coolermaster-mwe-v3-80-bronze-atx-3.1-1758283562787.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 622,
        "name": "DEEPCOOL MATREXX V55 V3",
        "brand": "DEEPCOOL",
        "category": "Case",
        "price": "1999.00",
        "specs": {
          "color": "White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "370mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/deepcool-matrexx-v55-v3-1758311350969.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 722,
        "name": "DEEPCOOL AG500 DIGITAL WHITE",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "2295.00",
        "specs": {
          "height": 158,
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 28,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ag500-white-1758011759696.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2010-2015_51000-75000": {
    "usage": "work",
    "yearRange": "2010-2015",
    "budgetRange": "51000-75000",
    "estimatedAge": 15,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 33,
        "name": "AMD Ryzen 7 5700X (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "7895.00",
        "specs": {
          "tdp": 105,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 16,
          "launched": "2022-09-04T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 7,
          "turbo_clock": 4.7,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-5700x-1757970613937.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 223,
        "name": "16GB ADATA DDR5 5200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "type": "DDR5",
          "speed": 5200,
          "voltage": 1.25,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-adata-ddr5-5200-laptop-memory-1758211920632.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 323,
        "name": "250GB WESTERN DIGITAL *GEN3",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "1495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "240GB",
          "interface": "SATA III",
          "read_speed": "545",
          "form_factor": "2.5\"",
          "write_speed": "540",
          "nvme_support": false,
          "storage_type": "SATA SSD"
        },
        "imageUrl": "/assets/parts/storage/240gb-western-digital-green-1758216056210.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 147,
        "name": "CVN B550M GAMING FROZEN V15",
        "brand": "COLORFUL",
        "category": "Motherboard",
        "price": "5899.00",
        "specs": {
          "socket": "AM4",
          "chipset": "AMD B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "6",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/cvn-b550m-gaming-frozen-v15-1763583605170.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 417,
        "name": "8GB RX6600 ASROCK CHALLENGER *(DUALFAN)",
        "brand": "AMD",
        "category": "GPU",
        "price": "13495.00",
        "specs": {
          "tdp": 132,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 282,
          "launched": "2021-10-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2044,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2491,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx6600-asrock-challenger-dualfan-1758175787377.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 525,
        "name": "750W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "3485.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-coolermaster-mwe-v3-80-bronze-atx-3.1-1758283763691.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 623,
        "name": "FSP CST360 MESH (Black)",
        "brand": "FSP",
        "category": "Case",
        "price": "2800.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX (Premium)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "370mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/fsp-cst360-mesh-1758311473550.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 723,
        "name": "DEEPCOOL AK500 BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "2650.00",
        "specs": {
          "height": 160,
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 30,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ak500-black-1758011877241.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "work_2010-2015_76000-100000": {
    "usage": "work",
    "yearRange": "2010-2015",
    "budgetRange": "76000-100000",
    "estimatedAge": 15,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 34,
        "name": "AMD RYZEN 3 4100 (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "8000.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 4,
          "series": "Ryzen 3",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 4,
          "launched": "2023-12-31T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 14,
          "turbo_clock": 4,
          "integrated_gpu": false,
          "max_supported_ram": 64,
          "multithreading_supported": false
        },
        "imageUrl": "/assets/parts/cpu/ryzen-3-4100-1757972941400.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 225,
        "name": "16GB TEAM ELITE PLUS DDR5 5600 Gold",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "type": "DDR5",
          "speed": 5600,
          "voltage": 0.1,
          "capacity": 16,
          "cas_latency": "40",
          "memory_type": "DDR5",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-ddr5-5600-gold-1758207271016.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 324,
        "name": "500GB WESTERN DIGITAL SN5000 BLUE *GEN4",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2795.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4x4",
          "read_speed": "5000",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "4000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-sn5000-blue-gen4-1758222282255.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 108,
        "name": "GIGABYTE B550M DS3H AC",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "6399.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "6",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b550m-ds3h-ac-1758091202351.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 418,
        "name": "8GB RX6600 ASROCK CHALLENGER *(DUALFAN) White",
        "brand": "AMD",
        "category": "GPU",
        "price": "13995.00",
        "specs": {
          "tdp": 132,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 282,
          "launched": "2021-10-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2044,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2491,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx6600-asrock-challenger-dualfan-white-1758179625026.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 526,
        "name": "750W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "6995.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 750,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "12",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/750w-coolermaster-mwe-v2-80-gold-atx-3.1-fm-1758283917519.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 624,
        "name": "FSP CST360 MESH (White)",
        "brand": "FSP",
        "category": "Case",
        "price": "2995.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX (Premium)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "370mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/fsp-cst360-mesh-white-1758311554335.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 724,
        "name": "Darkflash Nebula DN-240 AIO 240 BLACK/WHITE",
        "brand": "DARKFLASH",
        "category": "Cooling",
        "price": "3480.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2500,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/darkflash-nebula-dn-240-aio-240-black-n-white--1758012042547.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your work PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.322Z",
    "databaseProducts": true
  },
  "content_creation_2021-2025_10000-25000": {
    "usage": "content_creation",
    "yearRange": "2021-2025",
    "budgetRange": "10000-25000",
    "estimatedAge": 4,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 35,
        "name": "AMD RYZEN 3 3200G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "3495.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 4,
          "series": "Ryzen 3",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 4,
          "launched": "2023-12-31T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 14,
          "turbo_clock": 4,
          "integrated_gpu": false,
          "max_supported_ram": 64,
          "multithreading_supported": false
        },
        "imageUrl": "/assets/parts/cpu/ryzen-3-3200g-1757965726285.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 201,
        "name": "8GB Team Elite Plus DDR4 3200Mhz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "1199.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 8,
          "cas_latency": "CL22",
          "memory_type": "DDR4",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-team-elite-plus-ddr4-3200mhz-1758202322500.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 325,
        "name": "2TB WESTERN DIGITAL SN5000 BLUE *GEN4",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "8495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "2TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "5150",
          "form_factor": "2.5\"",
          "write_speed": "4850",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-western-digital-sn5000-blue-gen4-1758221754841.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 125,
        "name": "RAMSTA H311M",
        "brand": "RAMSTA",
        "category": "Motherboard",
        "price": "2999.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B450",
          "max_ram": 128,
          "m2_slots": 1,
          "ram_slots": 2,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/ramsta-h311-1758091247709.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "PSU": {
        "productId": 527,
        "name": "850W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "7995.00",
        "specs": {
          "length": 160,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "12",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-coolermaster-mwe-v2-80-gold-atx-3.1-fm-1758293202508.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 625,
        "name": "ASUS TUF Gaming GT501 (White)",
        "brand": "ASUS",
        "category": "Case",
        "price": "5500.00",
        "specs": {
          "color": "White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX) (Premium)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "180mm"
        },
        "imageUrl": "/assets/parts/case/asus-tuf-gaming-gt501-1758311655755.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 725,
        "name": "Darkflash Nebula DN-360 AIO 360 BLACK/WHITE",
        "brand": "DARKFLASH",
        "category": "Cooling",
        "price": "4180.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2500,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/darkflash-nebula-dn-360-aio-360-black-n-white-1758012133235.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2021-2025_26000-50000": {
    "usage": "content_creation",
    "yearRange": "2021-2025",
    "budgetRange": "26000-50000",
    "estimatedAge": 4,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 36,
        "name": "AMD RYZEN 5 5500",
        "brand": "AMD",
        "category": "CPU",
        "price": "4985.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5500-1757969911320.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 202,
        "name": "16GB Team Elite Plus DDR4 3200Mhz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2199.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL 22",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-ddr4-3200mhz-1758202737953.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 326,
        "name": "2TB SAMSUNG 990 PRO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "9995.00",
        "specs": {
          "cache": "2GB DDR4 SDRAM",
          "m2_type": "M.2 2280",
          "capacity": "2TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7450",
          "form_factor": "2.5\"",
          "write_speed": "6900",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-samsung-990-pro-1758221205496.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 126,
        "name": "ASUS PRIME A520M-K",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "3599.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "m2_slots": 1,
          "ram_slots": 2,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-a520m-k-1758089521667.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 419,
        "name": "12GB RX7700XT SAPPHIRE NITRO+ OC *TRI FAN",
        "brand": "AMD",
        "category": "GPU",
        "price": "27995.00",
        "specs": {
          "tdp": 245,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 302,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2171,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2544,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rx7700xt-sapphire-nitro-oc-tri-fan-1758178495675.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 528,
        "name": "650W MSI MAG A650BN 80+ Bronze",
        "brand": "MSI",
        "category": "PSU",
        "price": "3350.00",
        "specs": {
          "length": 140,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin connectors",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-msi-mag-a650bn-80-bronze-1758293367825.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 626,
        "name": "LIANLI O11 Dynamic MINI (Snow White)",
        "brand": "LIAN LI",
        "category": "Case",
        "price": "6000.00",
        "specs": {
          "color": "Snow White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "395mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "170mm"
        },
        "imageUrl": "/assets/parts/case/lianli-o11-dynamic-mini-snow-white-1758311807865.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 727,
        "name": "DEEPCOOL LE520 AIO 240 BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "3799.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2550,
          "max_noise": 31,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-le520-aio-240-black-1758013025204.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2021-2025_51000-75000": {
    "usage": "content_creation",
    "yearRange": "2021-2025",
    "budgetRange": "51000-75000",
    "estimatedAge": 4,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 37,
        "name": "AMD RYZEN 5 5600x (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "5985.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5600x-1757973191725.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 203,
        "name": "16GB Kingston Fury Beast",
        "brand": "KINGSTON",
        "category": "RAM",
        "price": "2399.00",
        "specs": {
          "speed": 3200,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-kingston-fury-beast-ddr4-3200mhz-1758202948123.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 327,
        "name": "500GB WESTERN DIGITAL SN3000 GEN4",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2995.00",
        "specs": {
          "cache": "QLC (Quad-Level Cell)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "M.2 PCIe 4.0 X4",
          "read_speed": "5000",
          "form_factor": "M.2 2280",
          "write_speed": "4100",
          "nvme_support": true,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-sn3000-gen4-1758217392090.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 127,
        "name": "MSI B450M PRO MAX II",
        "brand": "MSI",
        "category": "Motherboard",
        "price": "3799.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B450",
          "max_ram": 128,
          "m2_slots": 1,
          "ram_slots": 2,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/msi-b450m-pro-max-ii-1758089635009.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 420,
        "name": "16GB RX9060XT XFX SWIFT *(TRIFAN) White",
        "brand": "AMD",
        "category": "GPU",
        "price": "25995.00",
        "specs": {
          "tdp": 190,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 297,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2470,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2755,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx9060xt-xfx-swift-trifan-white-1758178950792.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 529,
        "name": "750W MSI MAG A750BN 80+ Bronze PCIE5",
        "brand": "MSI",
        "category": "PSU",
        "price": "4295.00",
        "specs": {
          "length": 140,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2 pin connectors | 1 x 16-pin 12VHPWR",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-msi-mag-a750bn-80-bronze-pcie5-1758293502612.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 628,
        "name": "YGT MARS 8 W/ 700W PSU",
        "brand": "YGT",
        "category": "Case",
        "price": "1000.00",
        "specs": {
          "color": "Black",
          "category": "mATX",
          "case_category": "Generic",
          "fans_included": 2,
          "max_gpu_length": "250",
          "max_cpu_cooler_height": "145"
        },
        "imageUrl": "/assets/parts/case/ygt-mars-8-w-700w-psu-1758295575778.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 728,
        "name": "DEEPCOOL LE520 AIO 240 WHITE",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "3999.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2550,
          "max_noise": 31,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-le520-aio-240-white-1758013091485.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2021-2025_76000-100000": {
    "usage": "content_creation",
    "yearRange": "2021-2025",
    "budgetRange": "76000-100000",
    "estimatedAge": 4,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 38,
        "name": "AMD RYZEN 5 4655G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "5995.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-4655g-1757973146461.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 204,
        "name": "16GB T-Force DarkZa Kit (2x8GB) 3600MHz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2499.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-darkza-kit-2x8gb-3600mhz-1758203256313.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 328,
        "name": "2TB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "7495.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "NVMe",
          "capacity": "1TB",
          "interface": "M.2 PCIe 3.0 X4",
          "read_speed": "3200",
          "form_factor": "2.5\"",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-western-digital-green-1758218535853.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 128,
        "name": "GIGABYTE A520M DS3H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "3995.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 2,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-ds3h-1758017196463.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 421,
        "name": "16GB RX9070 GAMING SAPPHIRE PULSE *(DUALFAN)",
        "brand": "AMD",
        "category": "GPU",
        "price": "42850.00",
        "specs": {
          "tdp": 190,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 297,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2470,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2755,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx9070-gaming-sapphire-pulse-dualfan-1758179067785.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 530,
        "name": "750W MSI MAG A750GL 80+ GOLD PCIE5 FM",
        "brand": "MSI",
        "category": "PSU",
        "price": "5995.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 750,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "3 x 6+2 pin connectors | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/750w-msi-mag-a750gl-80-gold-pcie5-fm-1758293629000.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 629,
        "name": "KEYTECH WJ REYNA (Black)",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1480.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-wj-reyna-black-1758530194324.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 729,
        "name": "DEEPCOOL LS520 SE AIO 240 DIGITAL BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "5499.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2600,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-ls520-se-aio-240-digital-black-1758013238846.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2016-2020_10000-25000": {
    "usage": "content_creation",
    "yearRange": "2016-2020",
    "budgetRange": "10000-25000",
    "estimatedAge": 9,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 39,
        "name": "AMD RYZEN 7 5700X3D (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "11995.00",
        "specs": {
          "tdp": 105,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-5700x3d-1757970855054.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 205,
        "name": "16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-tuf-2x8gb-3600mhz-black-1758203447554.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 329,
        "name": "2TB SAMSUNG 990 EVO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "9495.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen5.0x2",
          "read_speed": "5000",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "4200",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-samsung-990-evo-1758220448233.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 129,
        "name": "ASROCK B550M PRO SE *WHITE",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5895.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B550",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-b550m-pro-se-1758090981540.webp",
        "reasoning": "Mid-range chipset with modern features"
      },
      "PSU": {
        "productId": 501,
        "name": "550w CORSAIR CX550 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "2995.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/550w-corsair-cx550-80-bronze-1758269565920.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 630,
        "name": "KEYTECH WJ REYNA (White)",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1580.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-wj-reyna-white-1758530245223.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 730,
        "name": "DEEPCOOL MYSTIQUE AIO 360 BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "8995.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2700,
          "max_noise": 34,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-mystique-aio-360-black-1758013367558.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2016-2020_26000-50000": {
    "usage": "content_creation",
    "yearRange": "2016-2020",
    "budgetRange": "26000-50000",
    "estimatedAge": 9,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 40,
        "name": "AMD RYZEN 5 7500F",
        "brand": "AMD",
        "category": "CPU",
        "price": "8685.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-7500f-1757973238162.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 206,
        "name": "16GB T-FORCE DELTA RGB (2x8GB) 3600MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3195.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL 18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-2x8gb-3600mhz-white-1758203652205.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 301,
        "name": "256GB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "1499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "SATA",
          "capacity": "256GB",
          "interface": "SATA",
          "read_speed": "520",
          "form_factor": "2.5\"",
          "write_speed": "450",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/240gb-t-force-vulcan-z-1758216251189.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 111,
        "name": "GIGABYTE B650M GAMING",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7199.00",
        "specs": {
          "socket": "AM5",
          "chipset": "B650",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b650m-gaming-1763601420107.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 422,
        "name": "16GB RX9070XT GAMING SAPPHIRE PULSE *(TRIFAN)",
        "brand": "AMD",
        "category": "GPU",
        "price": "49995.00",
        "specs": {
          "tdp": 190,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 297,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2470,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2755,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx9070xt-gaming-sapphire-pulse-trifan-1758179096688.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 502,
        "name": "650w CORSAIR CX650 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "3485.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-corsair-cx650-80-bronze-1758269692122.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 631,
        "name": "JUNGLE LEOPARD MS-01 (BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "2150.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "174mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ms-01-black-1758530388703.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 731,
        "name": "DEEPCOOL MYSTIQUE AIO 360 WHITE",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "9499.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2700,
          "max_noise": 34,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-mystique-aio-360-white-1758013401855.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2016-2020_51000-75000": {
    "usage": "content_creation",
    "yearRange": "2016-2020",
    "budgetRange": "51000-75000",
    "estimatedAge": 9,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 41,
        "name": "AMD RYZEN 7 7800X3D (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "20495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-7800x3d-1757973308701.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 207,
        "name": "32GB T-Force DarkZa Kit",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3995.00",
        "specs": {
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 18",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-darkza-kit-2x16gb-3600mhz-1758203961871.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 302,
        "name": "512GB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "2499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": null,
          "capacity": "512GB",
          "interface": "SATA",
          "read_speed": "540",
          "form_factor": "2.5\"",
          "write_speed": "470",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-t-force-vulcan-z-1758216468849.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 131,
        "name": "GIGABYTE GA-B650M-D3HP",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7695.00",
        "specs": {
          "socket": "AM5",
          "chipset": "B650",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-ga-b650m-d3hp-1758090061369.webp",
        "reasoning": "Mid-range chipset with modern features"
      },
      "GPU": {
        "productId": 423,
        "name": "16GB RX9070XT SAPPHIRE NITRO + *(TRIFAN)",
        "brand": "AMD",
        "category": "GPU",
        "price": "52995.00",
        "specs": {
          "tdp": 190,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 297,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2470,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2755,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx9070xt-sapphire-nitro-trifan-1758179176395.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 503,
        "name": "750w CORSAIR CX750 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "3985.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-corsair-cx750-80-bronze-1758269787013.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 632,
        "name": "JUNGLE LEOPARD MS-01 (WHITE)",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "2250.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "174mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ms-01-white-1758530464501.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 732,
        "name": "Intel 12th - 14th Gen (Intel Laminar RH1)",
        "brand": "INTEL",
        "category": "Cooling",
        "price": "650.00",
        "specs": {
          "height": 60,
          "max_rpm": 2000,
          "max_noise": 30
        },
        "imageUrl": "/assets/parts/cooling/intel-12th---14th-gen-1758531412893.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2016-2020_76000-100000": {
    "usage": "content_creation",
    "yearRange": "2016-2020",
    "budgetRange": "76000-100000",
    "estimatedAge": 9,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 42,
        "name": "Intel Core i5 14400 (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "8995.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-14400-1757972322041.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 208,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "4995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-2x16gb-3600mhz-black-1758206125005.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 303,
        "name": "500GB SAMSUNG 870 EVO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "3199.00",
        "specs": {
          "cache": "512 MB",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "SATA",
          "read_speed": "560",
          "form_factor": "2.5\"",
          "write_speed": "530",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-870-evo-1758216632711.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 12038,
        "name": "ASUS PRIME B760M-A WIFI D4",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "9999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-b760m-a-wifi-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 424,
        "name": "12GB INTEL ARC B580 ASROCK CHALLENGER *(DUALFAN)",
        "brand": "ASROCK",
        "category": "GPU",
        "price": "18195.00",
        "specs": {
          "tdp": 160,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 285,
          "launched": "2023-07-10T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2310,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2535,
          "memory_type": "GDDR6",
          "effective_clock": 19000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/intel-arc-b580-challenger-12gb-ocm1-1758178066286.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 504,
        "name": "850w CORSAIR RM850e 80+ GOLD FM",
        "brand": "Corsair",
        "category": "PSU",
        "price": "8195.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "3 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-corsair-rm850e-80-gold-fm-1758282632567.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 633,
        "name": "WJCOOLMAN ROBIN CURVE MINI DIGITAL (BLACK)",
        "brand": "WJ COOLMAN",
        "category": "Case",
        "price": "2750.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "350mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/wjcoolman-robin-curve-mini-digital-black-1758530732203.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 733,
        "name": "AMD WRAITH STEALTH RYZEN COOLER",
        "brand": "AMD",
        "category": "Cooling",
        "price": "400.00",
        "specs": {
          "height": 54,
          "max_rpm": 2800,
          "max_noise": 42
        },
        "imageUrl": "/assets/parts/cooling/amd-wraith-stealth-ryzen-cooler-1758531637023.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2010-2015_10000-25000": {
    "usage": "content_creation",
    "yearRange": "2010-2015",
    "budgetRange": "10000-25000",
    "estimatedAge": 15,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 43,
        "name": "Intel Core i7 14700KF (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "18995.00",
        "specs": {
          "tdp": 126,
          "tier": "entry",
          "cores": 20,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 30,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 3.4,
          "lithography": 10,
          "turbo_clock": 5.6,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-14700kf-1757972832928.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 209,
        "name": "32GB G.SKILL Trident Z RGB",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "5495.00",
        "specs": {
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-trident-z-rgb-2x16gb-3600mhz-1758206297401.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 304,
        "name": "1TB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3695.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "NVMe",
          "capacity": "1TB",
          "interface": "M.2 PCIe 3.0 X4",
          "read_speed": "3200",
          "form_factor": "2.5\"",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-green-1758218370759.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 12038,
        "name": "ASUS PRIME B760M-A WIFI D4",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "9999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-b760m-a-wifi-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 505,
        "name": "FSP Hydro M PRO 600W",
        "brand": "FSP",
        "category": "PSU",
        "price": "3750.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 600,
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/fsp-hydro-m-pro-600-1758295209505.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 634,
        "name": "WJCOOLMAN ROBIN CURVE MINI DIGITAL (WHITE)",
        "brand": "WJ COOLMAN",
        "category": "Case",
        "price": "2850.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "350mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/wjcoolman-robin-curve-mini-digital-white-1758530800283.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 734,
        "name": "AMD WRAITH PRISM RYZEN COOLER",
        "brand": "AMD",
        "category": "Cooling",
        "price": "950.00",
        "specs": {
          "height": 93,
          "max_rpm": 2800,
          "max_noise": 42
        },
        "imageUrl": "/assets/parts/cooling/amd-wraith-prism-ryzen-cooler-1758531702900.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2010-2015_26000-50000": {
    "usage": "content_creation",
    "yearRange": "2010-2015",
    "budgetRange": "26000-50000",
    "estimatedAge": 15,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 44,
        "name": "Intel Core i7 14700 (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "20499.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 20,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 28,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.1,
          "lithography": 7,
          "turbo_clock": 5.4,
          "integrated_gpu": true,
          "max_supported_ram": 128
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-14700-1757972677913.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 210,
        "name": "16GB TEAM ELITE PLUS +",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL 22",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-3200-mhz-1758212058653.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 305,
        "name": "500GB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2695.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3200",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-green-1758222133406.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 12038,
        "name": "ASUS PRIME B760M-A WIFI D4",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "9999.00",
        "specs": {
          "socket": "LGA1700",
          "M2 Slots": "2",
          "Ram Slots": "4",
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-b760m-a-wifi-d4.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 425,
        "name": "8GB RTX4060 ASUS DUAL *(DUALFAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "18995.00",
        "specs": {
          "tdp": 115,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-asus-dual-dualfan-1758179255845.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 506,
        "name": "700w FSP HYDRO M PRO 80+ BRONZE *SEMI MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "3650.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 700,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/700w-fsp-hydro-m-pro-80-bronze-semi-modular-1758294640216.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 635,
        "name": "JUNGLE LEOPARD AC-01 (BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "3250.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ac-01-black-1758530898065.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 735,
        "name": "JUNGLE LEOPARD A200 PLUS",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "300.00",
        "specs": {
          "height": 122,
          "max_rpm": 1900,
          "max_noise": 27
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-a200-plus-1758531787933.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2010-2015_51000-75000": {
    "usage": "content_creation",
    "yearRange": "2010-2015",
    "budgetRange": "51000-75000",
    "estimatedAge": 15,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 11,
        "name": "AMD RYZEN 5 8400F (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "avg_rating": 3,
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "last_updated": "2025-11-10T20:11:50.792195+08:00",
          "total_ratings": 1,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "satisfaction_score": 48,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-8400f-1757970960464.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 211,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "7499.00",
        "specs": {
          "type": "DDR5",
          "speed": 6400,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-2x16gb-6400mhz-white-1758211631463.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 306,
        "name": "500GB WESTERN DIGITAL BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3295.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4",
          "read_speed": "5000",
          "form_factor": "2.5\"",
          "write_speed": "4500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-blue-1758217875548.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 131,
        "name": "GIGABYTE GA-B650M-D3HP",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7695.00",
        "specs": {
          "socket": "AM5",
          "chipset": "B650",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-ga-b650m-d3hp-1763600807352.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 426,
        "name": "8GB RTX4060 ASUS *(DUALFAN) *WHITE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "19495.00",
        "specs": {
          "tdp": 115,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-asus-dualfan-white-1758179216845.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 507,
        "name": "800w FSP HYDRO M PRO 80+ BRONZE *SEMI MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "3750.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 800,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/800w-fsp-hydro-m-pro-80-bronze-semi-modular-1758294779894.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 636,
        "name": "JUNGLE LEOPARD AC-01 (WHITE",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "3450.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ac-01-white-1758530987772.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 736,
        "name": "JUNGLE LEOPARD KF420E DIGITAL TEMP (BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "1295.00",
        "specs": {
          "height": 120,
          "max_rpm": 1800,
          "max_noise": 37
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-kf420e-digital-temp-black-1758531875113.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "content_creation_2010-2015_76000-100000": {
    "usage": "content_creation",
    "yearRange": "2010-2015",
    "budgetRange": "76000-100000",
    "estimatedAge": 15,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 12,
        "name": "AMD RYZEN 5 7600 (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "10495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-7600-1757971070351.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 212,
        "name": "16GB G.Skill Ripjaws (2x8GB) DDR4 3600MHz",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "2399.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-g.skill-ripjaws-2x8gb-ddr4-3600mhz-1758211996825.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 307,
        "name": "1TB WESTERN DIGITAL BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "4799.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "M.2 PCIe 4.0 X4",
          "read_speed": "5150",
          "form_factor": "2.5\"",
          "write_speed": "4900",
          "nvme_support": true,
          "storage_type": "NVMe SSDnn"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-blue-1758220963348.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 137,
        "name": "GIGABYTE B650M K",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7490.00",
        "specs": {
          "socket": "AM5",
          "chipset": "AMD B650",
          "max_ram": 192,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR5",
          "ethernet_ports": 1
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b650m-k-1758019038577.webp",
        "reasoning": "Older chipset compatible with legacy components"
      },
      "GPU": {
        "productId": 427,
        "name": "8GB RTX4060 IGAME ULTRA OC *(DUALFAN) *WHITE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "18795.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-igame-ultra-oc-dualfan-white-1758179351471.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 508,
        "name": "FSP VITA GM 850W",
        "brand": "FSP",
        "category": "PSU",
        "price": "7300.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold,"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-850w-1758282834087.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 601,
        "name": "NZXT H510 Mid Tower Case (Black)",
        "brand": "NZXT",
        "category": "Case",
        "price": "1000.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "381mm",
          "tempered_glass": false,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/nzxt-h510-mid-tower-case-1758312262623.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 737,
        "name": "JUNGLE LEOPARD KF420E DIGITAL TEMP (WHITE)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "1395.00",
        "specs": {
          "height": 155,
          "max_rpm": 1800,
          "max_noise": 37
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-kf420e-digital-temp-white-1758531936713.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your content_creation PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.323Z",
    "databaseProducts": true
  },
  "general_2021-2025_10000-25000": {
    "usage": "general",
    "yearRange": "2021-2025",
    "budgetRange": "10000-25000",
    "estimatedAge": 4,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 13,
        "name": "AMD RYZEN 7 8700F (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "11495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-8700f-1757971242831.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 213,
        "name": "32GB T-Force Vulcan Z Kit (2x16GB) 3600MHz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL22",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-vulcan-z-kit-2x16gb-3600mhz-1758212202686.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 308,
        "name": "500GB WESTERN DIGITAL BLACK",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7300",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-black-1758221969840.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 509,
        "name": "FSP VITA GM 850W (White)",
        "brand": "FSP",
        "category": "PSU",
        "price": "7495.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-850w-white-1758282923678.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 602,
        "name": "POWERLOGIC SLIM (Black)",
        "brand": "POWERLOGIC",
        "category": "Case",
        "price": "1350.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower",
          "fans_included": 1,
          "max_gpu_length": "250mm",
          "tempered_glass": false,
          "max_cpu_cooler_height": "140mm"
        },
        "imageUrl": "/assets/parts/case/powerlogic-slim-black-1758312408833.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 738,
        "name": "THERMALRIGHT ASSASIN SPIRIT 120 VISION ARGB (BLACK)",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "2095.00",
        "specs": {
          "height": 145,
          "max_rpm": 1500,
          "max_noise": 25.6
        },
        "imageUrl": "/assets/parts/cooling/thermalright-assasin-spirit-120-vision-argb-black-1758532062537.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2021-2025_26000-50000": {
    "usage": "general",
    "yearRange": "2021-2025",
    "budgetRange": "26000-50000",
    "estimatedAge": 4,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 14,
        "name": "AMD RYZEN 7 7700 (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "12750.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-7700-1757971509444.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 214,
        "name": "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3395.00",
        "specs": {
          "type": "DDR5",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL28",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-1x16gb-6000mhz-black-1758207444566.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 309,
        "name": "1TB WESTERN DIGITAL BLACK",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "5499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7300",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-black-1758220804428.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 139,
        "name": "ASUS B650M-AYW WIFI *WIFI *Bluetooth",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "8499.00",
        "specs": {
          "socket": "AM5",
          "chipset": "AMD B650",
          "max_ram": 192,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR5",
          "ethernet_ports": 1
        },
        "imageUrl": "/assets/parts/motherboard/asus-b650m-ayw-wifi-1758089941441.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 428,
        "name": "8GB RTX4060 IGAME ULTRA OC *WHITE(TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "19595.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-igame-ultra-oc-whitetri-fan-1758179408499.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 510,
        "name": "FSP VITA GM 1000W",
        "brand": "FSP",
        "category": "PSU",
        "price": "8500.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-1000w-1758283133413.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 603,
        "name": "KEYTECH ROBIN LITE",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1480.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-lite-1758295759134.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 739,
        "name": "THERMALRIGHT ASSASIN SPIRIT 120 VISION ARGB (WHITE)",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "2195.00",
        "specs": {
          "height": 154,
          "max_rpm": 1500,
          "max_noise": 25.6
        },
        "imageUrl": "/assets/parts/cooling/thermalright-assasin-spirit-120-vision-argb-white-1758532124369.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2021-2025_51000-75000": {
    "usage": "general",
    "yearRange": "2021-2025",
    "budgetRange": "51000-75000",
    "estimatedAge": 4,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 15,
        "name": "AMD RYZEN 5 8600G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "12750.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-8600g-1757971615786.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 215,
        "name": "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3495.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL38",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-1x16gb-6000mhz-white-1758207588963.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 310,
        "name": "512GB TEAMGROUP MP33 PRO",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "2699.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "512GB",
          "interface": "PCIe Gen3",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "3000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-teamgroup-mp33-pro-1758219046209.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 140,
        "name": "GIGABYTE B850M D3HP",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "9299.00",
        "specs": {
          "socket": "AM5",
          "chipset": "AMD B850",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR5",
          "ethernet_ports": 1
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b850m-d3hp-1758090190706.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 429,
        "name": "8GB RTX4060 GIGABYTE GAMING OC *TRI FAN",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "19995.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-gigabyte-gaming-oc-tri-fan-1758179298178.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 511,
        "name": "550w GIGABYTE P550SS 80+ SILVER",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "2395.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/550w-gigabyte-p550ss-80-silver-1758293790408.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 604,
        "name": "KEYTECH ROBIN VIEW",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1480.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower",
          "fans_included": 2,
          "max_gpu_length": "270mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-view-1758308100657.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 740,
        "name": "THERMALRIGHT PEERLESS ASSASIN 120 DIGITAL (BLACK)",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "2695.00",
        "specs": {
          "height": 162,
          "max_rpm": 1850,
          "max_noise": 24.6
        },
        "imageUrl": "/assets/parts/cooling/thermalright-peerless-assasin-120-digital-black-1758532215294.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2021-2025_76000-100000": {
    "usage": "general",
    "yearRange": "2021-2025",
    "budgetRange": "76000-100000",
    "estimatedAge": 4,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 16,
        "name": "AMD RYZEN 7 8700G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "17830.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-8700g-1757971700136.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 216,
        "name": "32GB G.Skill Ripjaws M5 Neo RGB (2x16GB) 6000MHz *BLACK",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "7250.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-ripjaws-m5-neo-rgb-2x16gb-6000mhz-black-1758212100911.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 311,
        "name": "1TB XPG SX8200 PRO",
        "brand": "ADATA",
        "category": "Storage",
        "price": "4099.00",
        "specs": {
          "cache": "Dynamic SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "3000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-xpg-sx8200-pro-1758219361407.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 141,
        "name": "AORUS B850 AORUS ELITE WIFI 7 *WIFI *Bluetooth",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "12899.00",
        "specs": {
          "socket": "AM5",
          "chipset": "AMD B850",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR5",
          "ethernet_ports": 1
        },
        "imageUrl": "/assets/parts/motherboard/aorus-b850-aorus-elite-wifi-7-with-bluetooth-1758090382279.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 430,
        "name": "8GB RTX4060Ti IGAME ULTRA OC *WHITE(TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "24995.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060ti-igame-ultra-oc-whitetri-fan-1758177394628.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 512,
        "name": "550w GIGABYTE P550SS ICE 80+ SILVER (*White )",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "2695.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/550w-gigabyte-p550ss-ice-80-silver-white--1758293933073.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 605,
        "name": "INPLAY OPENVIEW V100",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1499.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/inplay-openview-v100-1758308368093.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 741,
        "name": "THERMALRIGHT PEERLESS ASSASIN 120 DIGITAL (WHITE)",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "2795.00",
        "specs": {
          "height": 162,
          "max_rpm": 1850,
          "max_noise": 25.6
        },
        "imageUrl": "/assets/parts/cooling/thermalright-peerless-assasin-120-digital-white-1758532286731.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2016-2020_10000-25000": {
    "usage": "general",
    "yearRange": "2016-2020",
    "budgetRange": "10000-25000",
    "estimatedAge": 9,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 17,
        "name": "AMD RYZEN 7 9700X (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "23320.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-9700x-1757971806427.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 217,
        "name": "32GB G.Skill Ripjaws M5 Neo RGB (2x16GB) 6000MHz *WHITE",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "7350.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-ripjaws-m5-neo-rgb-2x16gb-6000mhz-white-1758212156289.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 312,
        "name": "256GB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "1599.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 NVMe Gen3",
          "capacity": "256GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\"",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/256gb-adata-legend-710-1758219606720.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 142,
        "name": "GIGABYTE B650I-AX *WIFI *Bluetooth (ITX MOBO)",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "10199.00",
        "specs": {
          "socket": "AM5",
          "chipset": "AMD B850",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR5",
          "ethernet_ports": 1
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b650i-ax-wifi-bluetooth-itx-1758090643309.webp",
        "reasoning": "Mid-range chipset with modern features"
      },
      "PSU": {
        "productId": 513,
        "name": "650w GIGABYTE P650G 80+ GOLD",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3985.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650g-80-gold-1758294290210.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 606,
        "name": "1stPlayer MIKU 2",
        "brand": "",
        "category": "Case",
        "price": "1700.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX",
          "case_category": null,
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/1stplayer-miku-2-1758308639568.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 742,
        "name": "THERMALRIGHT BURST ASSASSIN 120 VISION (BLACK)",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "3095.00",
        "specs": {
          "height": 156,
          "max_rpm": 1500,
          "max_noise": 25.6
        },
        "imageUrl": "/assets/parts/cooling/thermalright-burst-assassin-120-vision-black-1758532378882.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2016-2020_26000-50000": {
    "usage": "general",
    "yearRange": "2016-2020",
    "budgetRange": "26000-50000",
    "estimatedAge": 9,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 18,
        "name": "AMD RYZEN 9 9900X (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "28630.00",
        "specs": {
          "tdp": 120,
          "tier": "elite",
          "cores": 12,
          "series": "Ryzen 9",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 24,
          "launched": "2024-02-19T16:00:00.000Z",
          "base_clock": 4.1,
          "lithography": 5,
          "turbo_clock": 5.7,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-9-9900x-1757971901972.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 218,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "7499.00",
        "specs": {
          "type": "DDR5",
          "speed": 6400,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-kit-2x16gb-6400mhz-black-1758208585092.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 313,
        "name": "512GB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "2699.00",
        "specs": {
          "cache": "SLC (Single Level Caching) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "512GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-adata-legend-710-1758219705833.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 431,
        "name": "8GB RTX5060 ZOTAC AMP * (DUAL FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "20750.00",
        "specs": {
          "tdp": 120,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 260,
          "launched": "2023-06-09T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1800,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2400,
          "memory_type": "GDDR6",
          "effective_clock": 16000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx5060-zotac-amp-dual-fan-1758179505333.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 514,
        "name": "850W AORUS ELITE PCIE5 80+ PLATINUM FULLY MODULAR",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "8450.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Platinum",
          "form_factor": "ATX",
          "pcie_connectors": "6 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Platinum, PCIe 5"
        },
        "imageUrl": "/assets/parts/psu/850w-aorus-elite-p850w-pcie5-80-platinum-fully-modular-psu-1758294439071.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 607,
        "name": "DARKFLASH DB330M",
        "brand": "DARKFLASH",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "180mm"
        },
        "imageUrl": "/assets/parts/case/darkflash-db330m-1758312171953.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 743,
        "name": "THERMALRIGHT BURST ASSASSIN 120 VISION (WHITE)",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "3195.00",
        "specs": {
          "height": 156,
          "max_rpm": 1500,
          "max_noise": 25.6
        },
        "imageUrl": "/assets/parts/cooling/thermalright-burst-assassin-120-vision-white-1758532449403.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2016-2020_51000-75000": {
    "usage": "general",
    "yearRange": "2016-2020",
    "budgetRange": "51000-75000",
    "estimatedAge": 9,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 19,
        "name": "AMD RYZEN 7 9800X3D",
        "brand": "AMD",
        "category": "CPU",
        "price": "32995.00",
        "specs": {
          "tdp": 120,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-9800x3d-1757971996565.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 219,
        "name": "64GB T-FORCE DELTA RGB (2x32GB) 6000MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "13995.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 64,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "2x32GB",
          "total_capacity": "64GB"
        },
        "imageUrl": "/assets/parts/ram/64gb-t-force-delta-rgb-2x32gb-6000mhz-black-1758211712731.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 314,
        "name": "1TB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "3699.00",
        "specs": {
          "cache": "SLC (Single Level Caching) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-adata-legend-710-1758219767488.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 432,
        "name": "8GB RTX5060 IGAME ULTRA W OC *WHITE (TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "22895.00",
        "specs": {
          "tdp": 125,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2023-06-14T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1850,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2500,
          "memory_type": "GDDR6",
          "effective_clock": 16500,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx5060-igame-ultra-w-oc-white-tri-fan-1758179467520.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 517,
        "name": "500w Cougar STC500 80+",
        "brand": "Cougar",
        "category": "PSU",
        "price": "2280.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 500,
          "efficiency": "80+",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6-pin +2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+"
        },
        "imageUrl": "/assets/parts/psu/500w-cougar-stc500-80-1758269405947.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 608,
        "name": "COOLMAN REYNA (White)",
        "brand": "COOLMAN",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "310mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/coolman-reyna-1758308823350.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 744,
        "name": "RUIX NC240 ARGB AIO 240 (BLACK)",
        "brand": "RUIX",
        "category": "Cooling",
        "price": "2195.00",
        "specs": {
          "height": 63,
          "max_rpm": 3300,
          "max_noise": 36.5,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/ruix-nc240-argb-aio-240-black-1758532770478.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2016-2020_76000-100000": {
    "usage": "general",
    "yearRange": "2016-2020",
    "budgetRange": "76000-100000",
    "estimatedAge": 9,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 20,
        "name": "Intel Core i5 12400F (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "7480.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-12400f-1757972101082.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 220,
        "name": "8GB ADATA DDR4 3200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "1395.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 8,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-adata-ddr4-3200-laptop-memory-1758212242632.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 315,
        "name": "1TB ADATA LEGEND 860",
        "brand": "ADATA",
        "category": "Storage",
        "price": "4195.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "6000",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "4000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-adata-legend-860-1758219893465.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 121,
        "name": "GIGABYTE H610M-H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4999.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h610m-h-ddr4-1758089164658.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 433,
        "name": "8GB RTX5060 COLORFUL NB EX (TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "22295.00",
        "specs": {
          "tdp": 125,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2023-06-19T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1850,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2500,
          "memory_type": "GDDR6",
          "effective_clock": 16500,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx5060-colorful-nb-ex-tri-fan-1758179435861.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 518,
        "name": "750W YGT KY-750",
        "brand": "YGT",
        "category": "PSU",
        "price": "800.00",
        "specs": {
          "length": 55,
          "modular": false,
          "wattage": 750,
          "form_factor": "ATX",
          "pcie_connectors": "1x 6-pin",
          "sata_connectors": "2",
          "efficiency_rating": "Generic"
        },
        "imageUrl": "/assets/parts/psu/750w-ygt-ky-750-1758269193843.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 609,
        "name": "KEYTECH DARKVADER",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1199.00",
        "specs": {
          "color": "Black (Mesh)",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mini Tower",
          "fans_included": 2,
          "max_gpu_length": "260mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/keytech-darkvader-1758308974432.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 745,
        "name": "RUIX NC240 ARGB AIO 240 (WHITE)",
        "brand": "RUIX",
        "category": "Cooling",
        "price": "2295.00",
        "specs": {
          "height": 63,
          "max_rpm": 3300,
          "max_noise": 36.5,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/ruix-nc240-argb-aio-240-white-1758532840498.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2010-2015_10000-25000": {
    "usage": "general",
    "yearRange": "2010-2015",
    "budgetRange": "10000-25000",
    "estimatedAge": 15,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 21,
        "name": "Intel Core i5 12400 (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-12400-1757972153603.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 221,
        "name": "16GB ADATA DDR4 3200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "2395.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-adata-ddr4-3200-laptop-memory-1758211858013.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 316,
        "name": "2TB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "6995.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "2TB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-adata-legend-710-1758221033276.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 121,
        "name": "GIGABYTE H610M-H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4999.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h610m-h-ddr4-1758089164658.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 519,
        "name": "650w GIGABYTE P650SS 80+ SILVER (*BLACK)",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3495.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650ss-80-silver-black-1758294206082.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 610,
        "name": "INPLAY META A200 MESH (Black)",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1399.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "265mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "150mm"
        },
        "imageUrl": "/assets/parts/case/inplay-meta-a200-mesh-black-1758309117207.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 746,
        "name": "RUIX NC360 ARGB AIO 360 (BLACK)",
        "brand": "RUIX",
        "category": "Cooling",
        "price": "2945.00",
        "specs": {
          "height": 63,
          "max_rpm": 3300,
          "max_noise": 36.5,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/ruix-nc360-argb-aio-360-black-1758532935545.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2010-2015_26000-50000": {
    "usage": "general",
    "yearRange": "2010-2015",
    "budgetRange": "26000-50000",
    "estimatedAge": 15,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 22,
        "name": "Intel Core i7 12700F (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "15495.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 12,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 20,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.1,
          "lithography": 10,
          "turbo_clock": 4.9,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-12700f-1757973486075.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 222,
        "name": "8GB ADATA DDR5 4800 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "1995.00",
        "specs": {
          "type": "DDR5",
          "speed": 4800,
          "voltage": 1.25,
          "capacity": 8,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-adata-ddr5-4800-laptop-memory-1758212290771.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 317,
        "name": "500GB SAMSUNG 980 NVME",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "3795.00",
        "specs": {
          "type": "NVMe SSD",
          "cache": "SLC (Single Level Caching 122GB) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3100",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "2600",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-980-nvme-1758220063443.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 121,
        "name": "GIGABYTE H610M-H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4999.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h610m-h-ddr4-1758089164658.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 434,
        "name": "8GB RTX5060Ti GIGABYTE WINDFORCE (DUAL FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "25860.00",
        "specs": {
          "tdp": 130,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-24T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2000,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2500,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx5060ti-gigabyte-windforce-dual-fan-1758179588438.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 520,
        "name": "650w GIGABYTE P650SS 80+ SILVER (*White)",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3600.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650ss-80-silver-white-1758294065938.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 611,
        "name": "INPLAY META A200 MESH (White)",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1499.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "265mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "150mm"
        },
        "imageUrl": "/assets/parts/case/inplay-meta-a200-mesh-white-1758309232054.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 747,
        "name": "RUIX NC360 ARGB AIO 360 (WHITE)",
        "brand": "RUIX",
        "category": "Cooling",
        "price": "2995.00",
        "specs": {
          "height": 63,
          "max_rpm": 3300,
          "max_noise": 36.5,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/ruix-nc360-argb-aio-360-white-1758532990596.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.324Z",
    "databaseProducts": true
  },
  "general_2010-2015_51000-75000": {
    "usage": "general",
    "yearRange": "2010-2015",
    "budgetRange": "51000-75000",
    "estimatedAge": 15,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 23,
        "name": "Intel Core i5 14400F (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "9370.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-14400f-1757972245832.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 223,
        "name": "16GB ADATA DDR5 5200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "type": "DDR5",
          "speed": 5200,
          "voltage": 1.25,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-adata-ddr5-5200-laptop-memory-1758211920632.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 318,
        "name": "500GB SAMSUNG 970 Evo Plus",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "4095.00",
        "specs": {
          "cache": "512 MB",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3500",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "3300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-970-evo-plus-1758220218560.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 121,
        "name": "GIGABYTE H610M-H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4999.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h610m-h-ddr4-1758089164658.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 435,
        "name": "8GB RTX5060Ti COLORFUL NB EX (DUAL FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "25995.00",
        "specs": {
          "tdp": 130,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-29T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2000,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2500,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx5060ti-colorful-nb-ex-dual-fan-1758179564097.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 521,
        "name": "850w GIGABYTE UD850GM PG5 80+ GOLD *FULL MODULAR",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "6995.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-gigabyte-ud850gm-pg5-80-gold-full-modular-1758294894780.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 612,
        "name": "INPLAY METEOR 30 MESH",
        "brand": "INPLAY",
        "category": "Case",
        "price": "1299.00",
        "specs": {
          "color": "Black or White (Mesh)",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "300mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/inplay-meteor-30-mesh-1758309509498.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 748,
        "name": "JUNGLE LEOPARD ASTROSHEL V2 (LCD AIO 240 BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "3995.00",
        "specs": {
          "height": 27,
          "max_rpm": 2800,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-astroshel-v2-lcd-aio-240-black-1758533111679.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "general_2010-2015_76000-100000": {
    "usage": "general",
    "yearRange": "2010-2015",
    "budgetRange": "76000-100000",
    "estimatedAge": 15,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 24,
        "name": "Intel Core i7 14700F (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "19089.99",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 12,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 20,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.1,
          "lithography": 10,
          "turbo_clock": 4.9,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-14700f-1757972458993.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 225,
        "name": "16GB TEAM ELITE PLUS DDR5 5600 Gold",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "type": "DDR5",
          "speed": 5600,
          "voltage": 0.1,
          "capacity": 16,
          "cas_latency": "40",
          "memory_type": "DDR5",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-ddr5-5600-gold-1758207271016.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 319,
        "name": "1TB SAMSUNG 990 Pro",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "7195.00",
        "specs": {
          "cache": "Dynamic SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7450",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6900",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-samsung-990-pro-1758220535302.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 121,
        "name": "GIGABYTE H610M-H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4999.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h610m-h-ddr4-1758089164658.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 436,
        "name": "12GB RTX5070 GIGABYTE WINDFORCE SFF *TRI FAN",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "39995.00",
        "specs": {
          "tdp": 150,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 290,
          "launched": "2023-07-01T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2200,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2700,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rtx5070-gigabyte-windforce-sff-tri-fan-1758178139272.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 522,
        "name": "750w FSP VITA 80+ GOLD ATX3.1 GEN5.1 *FULL MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "6795.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 750,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/750w-fsp-vita-80-gold-atx3.1-gen5.1-full-modular-1758294709321.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 613,
        "name": "KEYTECH CUIRASS MESH",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1599.00",
        "specs": {
          "color": "Black or White (Mesh)",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "330mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/keytech-cuirass-mesh-1758309721025.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 749,
        "name": "JUNGLE LEOPARD ASTROSHEL V2 (LCD AIO 240 WHITE)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "4095.00",
        "specs": {
          "height": 27,
          "max_rpm": 2800,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-astroshel-v2-lcd-aio-240-white-1758533171721.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your general PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2021-2025_10000-25000": {
    "usage": "programming",
    "yearRange": "2021-2025",
    "budgetRange": "10000-25000",
    "estimatedAge": 4,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 25,
        "name": "Intel Core ULTRA 5 245KF (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "19050.00",
        "specs": {
          "tdp": 105,
          "tier": "entry",
          "cores": 10,
          "series": "Core Ultra 5",
          "socket": "LGA1851",
          "max_ram": 128,
          "threads": 16,
          "launched": "2025-02-14T16:00:00.000Z",
          "base_clock": 3,
          "lithography": 10,
          "turbo_clock": 5.5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-ultra-5-245kf-1757973553414.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 201,
        "name": "8GB Team Elite Plus DDR4 3200Mhz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "1199.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 8,
          "cas_latency": "CL22",
          "memory_type": "DDR4",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-team-elite-plus-ddr4-3200mhz-1758202322500.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 320,
        "name": "1TB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "3495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "capacity": "1TB",
          "interface": "SATA",
          "read_speed": "550",
          "form_factor": "2.5\"",
          "write_speed": "500",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-t-force-vulcan-z-1758216812127.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 12054,
        "name": "Gigabyte H810M K",
        "brand": "Gigabyte",
        "category": "Motherboard",
        "price": "7999.00",
        "specs": {
          "rgb": false,
          "audio": "Realtek ALC897",
          "socket": "LGA1851",
          "chipset": "H810",
          "network": "1G Ethernet",
          "features": [
            "DDR5 Support"
          ],
          "m2_slots": 1,
          "usb_ports": "4x USB 3.2 Gen 1, 4x USB 2.0",
          "SATA Ports": "4",
          "dimensions": "244mm x 201mm",
          "max_memory": "96GB",
          "pcie_slots": "1x PCIe 4.0 x16",
          "sata_ports": 4,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR5",
          "memory_slots": 2,
          "memory_speed": "Up to 5600MHz"
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h810m-k.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 523,
        "name": "1000w FSP VITA 80+ GOLD ATX3.1 GEN5.1 *FULL MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "8495.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 1000,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/1000w-fsp-vita-80-gold-atx3.1-gen5.1-full-modular-1758294518533.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 614,
        "name": "KEYTECH VISOR",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1699.00",
        "specs": {
          "color": "Black or White (Mesh)",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/keytech-visor-1758309870646.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 750,
        "name": "JUNGLE LEOPARD ASTROSHEL V2 (LCD AIO 360 BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "4895.00",
        "specs": {
          "height": 27,
          "max_rpm": 2800,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-astroshel-v2-lcd-aio-360-black-1758533260874.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2021-2025_26000-50000": {
    "usage": "programming",
    "yearRange": "2021-2025",
    "budgetRange": "26000-50000",
    "estimatedAge": 4,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 26,
        "name": "Intel Core i3 8100 (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "7995.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 4,
          "series": "Core i3",
          "socket": "LGA1151",
          "max_ram": 64,
          "threads": 4,
          "launched": "2018-01-03T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 14,
          "turbo_clock": 4,
          "integrated_gpu": false,
          "max_supported_ram": 64,
          "multithreading_supported": false
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i3-8100-1757973373694.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 202,
        "name": "16GB Team Elite Plus DDR4 3200Mhz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2199.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL 22",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-ddr4-3200mhz-1758202737953.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 321,
        "name": "2TB Western Digital SA510 BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "8320.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "capacity": "2TB",
          "interface": "SATA",
          "read_speed": "560",
          "form_factor": "2.5\"",
          "write_speed": "520",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-western-digital-sa510-blue-1758221377656.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 118,
        "name": "RAMSTA H310M",
        "brand": "RAMSTA",
        "category": "Motherboard",
        "price": "3499.00",
        "specs": {
          "socket": "LGA1151",
          "chipset": "H310",
          "max_ram": 64,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 3,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/ramsta-h310m-1763601021272.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 437,
        "name": "12GB RTX5070 IGAME ULTRA W OC*WHITE(TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "42995.00",
        "specs": {
          "tdp": 150,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 290,
          "launched": "2023-07-02T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2200,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2700,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rtx5070-igame-ultra-w-oc-whitetri-fan-1758178428867.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 524,
        "name": "650W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "2995.00",
        "specs": {
          "length": 140,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-coolermaster-mwe-v3-80-bronze-atx-3.1-1758283562787.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 615,
        "name": "1stPlayer TRILOBITE T5 MESH",
        "brand": "1STPLAYER",
        "category": "Case",
        "price": "1800.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "330mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/1stplayer-trilobite-t5-mesh-1758312058455.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 751,
        "name": "JUNGLE LEOPARD ASTROSHEL V2 (LCD AIO 360 WHITE))",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "4995.00",
        "specs": {
          "height": 27,
          "max_rpm": 2800,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-astroshel-v2-lcd-aio-360-white-1758533310325.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2021-2025_51000-75000": {
    "usage": "programming",
    "yearRange": "2021-2025",
    "budgetRange": "51000-75000",
    "estimatedAge": 4,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 27,
        "name": "Intel Core i5 9400 (BOXED)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "10495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-9400-1757973431371.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 203,
        "name": "16GB Kingston Fury Beast",
        "brand": "KINGSTON",
        "category": "RAM",
        "price": "2399.00",
        "specs": {
          "speed": 3200,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-kingston-fury-beast-ddr4-3200mhz-1758202948123.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 322,
        "name": "250GB GIGABYTE 4000E * GEN4",
        "brand": "GIGABYTE",
        "category": "Storage",
        "price": "1499.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "250GB",
          "interface": "PCIe 4.0 x4",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/250gb-gigabyte-4000e-gen4-1758218798762.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 143,
        "name": "GIGABYTE B760M DS3H AX (DDR5) *12-14th GEN",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "6499.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "Intel B760",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b760m-ds3h-ax-ddr5-1758090767524.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 438,
        "name": "16GB RTX5070Ti PALIT GAMING PRO *TRI FAN",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "54495.00",
        "specs": {
          "tdp": 160,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 300,
          "launched": "2023-07-06T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2400,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2900,
          "memory_type": "GDDR6",
          "effective_clock": 19000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rtx5070ti-palit-gaming-pro-tri-fan-1758178576419.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 525,
        "name": "750W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "3485.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-coolermaster-mwe-v3-80-bronze-atx-3.1-1758283763691.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 616,
        "name": "DARKFLASH DB330M MESH",
        "brand": "DARKFLASH",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "180mm"
        },
        "imageUrl": "/assets/parts/case/darkflash-db330m-mesh-1758309983502.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 752,
        "name": "JUNGLE LEOPARD PROFLOW (LCD AIO 240 BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "5195.00",
        "specs": {
          "height": 27,
          "max_rpm": 2800,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-proflow-lcd-aio-240-black-1758533386609.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2021-2025_76000-100000": {
    "usage": "programming",
    "yearRange": "2021-2025",
    "budgetRange": "76000-100000",
    "estimatedAge": 4,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 28,
        "name": "Ryzen 5 3400G (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "4295.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 4,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 8,
          "launched": "2018-07-11T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 12,
          "turbo_clock": 4.2,
          "integrated_gpu": true,
          "max_supported_ram": 64,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-3400g-1757969482859.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 204,
        "name": "16GB T-Force DarkZa Kit (2x8GB) 3600MHz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2499.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-darkza-kit-2x8gb-3600mhz-1758203256313.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 323,
        "name": "250GB WESTERN DIGITAL *GEN3",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "1495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "240GB",
          "interface": "SATA III",
          "read_speed": "545",
          "form_factor": "2.5\"",
          "write_speed": "540",
          "nvme_support": false,
          "storage_type": "SATA SSD"
        },
        "imageUrl": "/assets/parts/storage/240gb-western-digital-green-1758216056210.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B550",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1758017667904.webp",
        "reasoning": "Latest chipset with modern connectivity"
      },
      "GPU": {
        "productId": 439,
        "name": "16GB RTX5080 ZOTAC SOLID CORE OC (TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "74995.00",
        "specs": {
          "tdp": 200,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 310,
          "launched": "2024-01-09T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2500,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 3000,
          "memory_type": "GDDR6X",
          "effective_clock": 20000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rtx5080-zotac-solid-core-oc-tri-fan-1758178658127.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 526,
        "name": "750W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "6995.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 750,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "12",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/750w-coolermaster-mwe-v2-80-gold-atx-3.1-fm-1758283917519.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 617,
        "name": "KEYTECH ROBIN CUBE",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1850.00",
        "specs": {
          "color": "Black or White",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Dual Chamber Cube Case)",
          "fans_included": 3,
          "max_gpu_length": "320mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-cube-1758310342949.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 753,
        "name": "JUNGLE LEOPARD PROFLOW (LCD AIO 240 WHITE)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "5395.00",
        "specs": {
          "height": 27,
          "max_rpm": 2800,
          "max_noise": 32,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-proflow-lcd-aio-240-white-1758533432548.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2016-2020_10000-25000": {
    "usage": "programming",
    "yearRange": "2016-2020",
    "budgetRange": "10000-25000",
    "estimatedAge": 9,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 29,
        "name": "AMD Ryzen 5 4600G (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "5495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 12,
          "launched": "2021-04-14T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 12,
          "turbo_clock": 4.3,
          "integrated_gpu": true,
          "max_supported_ram": 64,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-4600g-1757970246948.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 205,
        "name": "16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-tuf-2x8gb-3600mhz-black-1758203447554.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 324,
        "name": "500GB WESTERN DIGITAL SN5000 BLUE *GEN4",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2795.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4x4",
          "read_speed": "5000",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "4000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-sn5000-blue-gen4-1758222282255.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 147,
        "name": "CVN B550M GAMING FROZEN V15",
        "brand": "COLORFUL",
        "category": "Motherboard",
        "price": "5899.00",
        "specs": {
          "socket": "AM4",
          "chipset": "AMD B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "6",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/cvn-b550m-gaming-frozen-v15-1763583605170.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 527,
        "name": "850W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
        "brand": "Cooler Master",
        "category": "PSU",
        "price": "7995.00",
        "specs": {
          "length": 160,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "12",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-coolermaster-mwe-v2-80-gold-atx-3.1-fm-1758293202508.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 618,
        "name": "KEYTECH ROBIN MINI",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "2050.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "320mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/keytech-robin-mini-1758310447526.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 754,
        "name": "JUNGLE LEOPARD PROFLOW (LCD AIO 360 BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "6895.00",
        "specs": {
          "height": 27,
          "max_rpm": 2700,
          "max_noise": 30,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-proflow-lcd-aio-360-black-1758533528195.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2016-2020_26000-50000": {
    "usage": "programming",
    "yearRange": "2016-2020",
    "budgetRange": "26000-50000",
    "estimatedAge": 9,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 30,
        "name": "AMD Ryzen 5 5600GT (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "7185.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-06-14T16:00:00.000Z",
          "base_clock": 3.9,
          "lithography": 7,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5600gt-1757970332008.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 206,
        "name": "16GB T-FORCE DELTA RGB (2x8GB) 3600MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3195.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL 18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-2x8gb-3600mhz-white-1758203652205.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 325,
        "name": "2TB WESTERN DIGITAL SN5000 BLUE *GEN4",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "8495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "2TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "5150",
          "form_factor": "2.5\"",
          "write_speed": "4850",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-western-digital-sn5000-blue-gen4-1758221754841.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 130,
        "name": "GIGABYTE A520I AC *WIFI *Bluetooth *ITX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "6995.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 1,
          "form_factor": "Mini-ITX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520i-ac-wifi-bluetooth-itx-1758091160213.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 440,
        "name": "16GB RTX5080 ZOTAC SOLID OC *WHITE(TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "76995.00",
        "specs": {
          "tdp": 200,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 310,
          "launched": "2024-01-09T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2500,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 3000,
          "memory_type": "GDDR6X",
          "effective_clock": 20000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rtx5080-zotac-solid-oc-tri-fan-white-1758178854765.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 528,
        "name": "650W MSI MAG A650BN 80+ Bronze",
        "brand": "MSI",
        "category": "PSU",
        "price": "3350.00",
        "specs": {
          "length": 140,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin connectors",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-msi-mag-a650bn-80-bronze-1758293367825.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 619,
        "name": "KEYTECH 011",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "2750.00",
        "specs": {
          "color": "Black or White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "360mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "150mm"
        },
        "imageUrl": "/assets/parts/case/keytech-011-blackwhite-1758310995533.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 755,
        "name": "JUNGLE LEOPARD PROFLOW (LCD AIO 360 WHITE)",
        "brand": "JUNGLE LEOPARD",
        "category": "Cooling",
        "price": "6995.00",
        "specs": {
          "height": 27,
          "max_rpm": 2700,
          "max_noise": 30,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/jungle-leopard-proflow-lcd-aio-360-white-1758533589564.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2016-2020_51000-75000": {
    "usage": "programming",
    "yearRange": "2016-2020",
    "budgetRange": "51000-75000",
    "estimatedAge": 9,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 31,
        "name": "AMD Ryzen 7 5700G (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 16,
          "launched": "2022-03-14T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 7,
          "turbo_clock": 4.6,
          "integrated_gpu": true,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-5700g-1757970709641.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 207,
        "name": "32GB T-Force DarkZa Kit",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3995.00",
        "specs": {
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 18",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-darkza-kit-2x16gb-3600mhz-1758203961871.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 326,
        "name": "2TB SAMSUNG 990 PRO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "9995.00",
        "specs": {
          "cache": "2GB DDR4 SDRAM",
          "m2_type": "M.2 2280",
          "capacity": "2TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7450",
          "form_factor": "2.5\"",
          "write_speed": "6900",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-samsung-990-pro-1758221205496.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "Chipset": "B550",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "PCIE Slots": "2",
          "SATA Ports": "6",
          "pcie_slots": 2,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "Power Connectors": "24-pin ATX, 8-pin EPS",
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true,
          "motherboard_form_factor": "Micro-ATX"
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1763601727028.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 442,
        "name": "RX7800XT SAPPHIRE PURE *TRI FAN *White",
        "brand": "AMD",
        "category": "GPU",
        "price": "33795.00",
        "specs": {
          "tdp": 245,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 302,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2171,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2544,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx7800xtsapphire-pure-tri-fan-white-1758176429127.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 529,
        "name": "750W MSI MAG A750BN 80+ Bronze PCIE5",
        "brand": "MSI",
        "category": "PSU",
        "price": "4295.00",
        "specs": {
          "length": 140,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2 pin connectors | 1 x 16-pin 12VHPWR",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-msi-mag-a750bn-80-bronze-pcie5-1758293502612.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 620,
        "name": "COOLMAN SPECTRA",
        "brand": "COOLMAN",
        "category": "Case",
        "price": "2850.00",
        "specs": {
          "color": "Black or White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "400mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/coolman-spectra-1758311110092.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 756,
        "name": "DEEPCOOL MYSTIQUE AIO 240 (BLACK)",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "7495.00",
        "specs": {
          "height": 27,
          "max_rpm": 3400,
          "max_noise": 37,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-mystique-aio-240-black-1758533702295.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2016-2020_76000-100000": {
    "usage": "programming",
    "yearRange": "2016-2020",
    "budgetRange": "76000-100000",
    "estimatedAge": 9,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 32,
        "name": "AMD Ryzen 5 5600 (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "5985.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2023-12-31T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 7,
          "turbo_clock": 4.6,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5600-1757970063151.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 208,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "4995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-2x16gb-3600mhz-black-1758206125005.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 327,
        "name": "500GB WESTERN DIGITAL SN3000 GEN4",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2995.00",
        "specs": {
          "cache": "QLC (Quad-Level Cell)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "M.2 PCIe 4.0 X4",
          "read_speed": "5000",
          "form_factor": "M.2 2280",
          "write_speed": "4100",
          "nvme_support": true,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-sn3000-gen4-1758217392090.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "Chipset": "B550",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "PCIE Slots": "2",
          "SATA Ports": "6",
          "pcie_slots": 2,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "Power Connectors": "24-pin ATX, 8-pin EPS",
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true,
          "motherboard_form_factor": "Micro-ATX"
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1763601727028.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 443,
        "name": "8GB RTX4060Ti Colorful NB DUO",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "22999.00",
        "specs": {
          "tdp": 160,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 285,
          "launched": "2023-05-23T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2310,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2535,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060ti-colorful-nb-duo-1758177301712.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 530,
        "name": "750W MSI MAG A750GL 80+ GOLD PCIE5 FM",
        "brand": "MSI",
        "category": "PSU",
        "price": "5995.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 750,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "3 x 6+2 pin connectors | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/750w-msi-mag-a750gl-80-gold-pcie5-fm-1758293629000.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 621,
        "name": "COOLMAN SPECTRA LUXE",
        "brand": "COOLMAN",
        "category": "Case",
        "price": "3200.00",
        "specs": {
          "color": "Black or White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Dual Chamber Case)",
          "fans_included": 3,
          "max_gpu_length": "400mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/coolman-spectra-luxe-1758311184093.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 757,
        "name": "DEEPCOOL MYSTIQUE AIO 240 (WHITE)",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "7495.00",
        "specs": {
          "height": 27,
          "max_rpm": 3400,
          "max_noise": 37,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-mystique-aio-240-white-1758533752030.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2010-2015_10000-25000": {
    "usage": "programming",
    "yearRange": "2010-2015",
    "budgetRange": "10000-25000",
    "estimatedAge": 15,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 33,
        "name": "AMD Ryzen 7 5700X (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "7895.00",
        "specs": {
          "tdp": 105,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 16,
          "launched": "2022-09-04T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 7,
          "turbo_clock": 4.7,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-5700x-1757970613937.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 209,
        "name": "32GB G.SKILL Trident Z RGB",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "5495.00",
        "specs": {
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-trident-z-rgb-2x16gb-3600mhz-1758206297401.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 328,
        "name": "2TB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "7495.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "NVMe",
          "capacity": "1TB",
          "interface": "M.2 PCIe 3.0 X4",
          "read_speed": "3200",
          "form_factor": "2.5\"",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-western-digital-green-1758218535853.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "Chipset": "B550",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "PCIE Slots": "2",
          "SATA Ports": "6",
          "pcie_slots": 2,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "Power Connectors": "24-pin ATX, 8-pin EPS",
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true,
          "motherboard_form_factor": "Micro-ATX"
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1763601727028.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 501,
        "name": "550w CORSAIR CX550 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "2995.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/550w-corsair-cx550-80-bronze-1758269565920.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 622,
        "name": "DEEPCOOL MATREXX V55 V3",
        "brand": "DEEPCOOL",
        "category": "Case",
        "price": "1999.00",
        "specs": {
          "color": "White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "370mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "160mm"
        },
        "imageUrl": "/assets/parts/case/deepcool-matrexx-v55-v3-1758311350969.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 758,
        "name": "DEEPCOOL LM360 AIO 360 (BLACK)",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "5495.00",
        "specs": {
          "height": 27,
          "max_rpm": 3600,
          "max_noise": 36,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-lm360-aio-360-black-1758534065960.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.325Z",
    "databaseProducts": true
  },
  "programming_2010-2015_26000-50000": {
    "usage": "programming",
    "yearRange": "2010-2015",
    "budgetRange": "26000-50000",
    "estimatedAge": 15,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 34,
        "name": "AMD RYZEN 3 4100 (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "8000.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 4,
          "series": "Ryzen 3",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 4,
          "launched": "2023-12-31T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 14,
          "turbo_clock": 4,
          "integrated_gpu": false,
          "max_supported_ram": 64,
          "multithreading_supported": false
        },
        "imageUrl": "/assets/parts/cpu/ryzen-3-4100-1757972941400.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 210,
        "name": "16GB TEAM ELITE PLUS +",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL 22",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-3200-mhz-1758212058653.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 329,
        "name": "2TB SAMSUNG 990 EVO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "9495.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen5.0x2",
          "read_speed": "5000",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "4200",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/2tb-samsung-990-evo-1758220448233.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "Chipset": "B550",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "PCIE Slots": "2",
          "SATA Ports": "6",
          "pcie_slots": 2,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "Power Connectors": "24-pin ATX, 8-pin EPS",
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true,
          "motherboard_form_factor": "Micro-ATX"
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1763601727028.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 444,
        "name": "12GB RTX4070 IGAME ULTRA W OC (TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "34695.00",
        "specs": {
          "tdp": 200,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2023-04-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1920,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2475,
          "memory_type": "GDDR6X",
          "effective_clock": 21000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rtx4070-colorful-igame-ultra-w-oc-tri-fan-1758177789387.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 502,
        "name": "650w CORSAIR CX650 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "3485.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/650w-corsair-cx650-80-bronze-1758269692122.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 623,
        "name": "FSP CST360 MESH (Black)",
        "brand": "FSP",
        "category": "Case",
        "price": "2800.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX (Premium)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "370mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/fsp-cst360-mesh-1758311473550.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 759,
        "name": "DEEPCOOL LM360 AIO 360 (WHITE)",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "5295.00",
        "specs": {
          "height": 27,
          "max_rpm": 3600,
          "max_noise": 36,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/deepcool-lm360-aio-360-white-1758534114961.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "programming_2010-2015_51000-75000": {
    "usage": "programming",
    "yearRange": "2010-2015",
    "budgetRange": "51000-75000",
    "estimatedAge": 15,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 35,
        "name": "AMD RYZEN 3 3200G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "3495.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 4,
          "series": "Ryzen 3",
          "socket": "AM4",
          "max_ram": 64,
          "threads": 4,
          "launched": "2023-12-31T16:00:00.000Z",
          "base_clock": 3.8,
          "lithography": 14,
          "turbo_clock": 4,
          "integrated_gpu": false,
          "max_supported_ram": 64,
          "multithreading_supported": false
        },
        "imageUrl": "/assets/parts/cpu/ryzen-3-3200g-1757965726285.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 211,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *WHITE",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "7499.00",
        "specs": {
          "type": "DDR5",
          "speed": 6400,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-2x16gb-6400mhz-white-1758211631463.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 301,
        "name": "256GB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "1499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "SATA",
          "capacity": "256GB",
          "interface": "SATA",
          "read_speed": "520",
          "form_factor": "2.5\"",
          "write_speed": "450",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/240gb-t-force-vulcan-z-1758216251189.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "Chipset": "B550",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "PCIE Slots": "2",
          "SATA Ports": "6",
          "pcie_slots": 2,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "Power Connectors": "24-pin ATX, 8-pin EPS",
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true,
          "motherboard_form_factor": "Micro-ATX"
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1763601727028.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 445,
        "name": "16GB RTX4070Ti Super IGAME ULTRA W OC WHITE(TRI FAN)",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "48495.00",
        "specs": {
          "tdp": 200,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2023-04-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1920,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2655,
          "memory_type": "GDDR6X",
          "effective_clock": 21000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rtx4070ti-super-igame-ultra-w-oc-tri-fan-1758177963946.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 503,
        "name": "750w CORSAIR CX750 80+ Bronze",
        "brand": "Corsair",
        "category": "PSU",
        "price": "3985.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 750,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/750w-corsair-cx750-80-bronze-1758269787013.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 624,
        "name": "FSP CST360 MESH (White)",
        "brand": "FSP",
        "category": "Case",
        "price": "2995.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX (Premium)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "370mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/fsp-cst360-mesh-white-1758311554335.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 7726,
        "name": "THERMALRIGHT FROZEN WARFRAME 240 DIGITAL",
        "brand": "THERMALRIGHT",
        "category": "Cooling",
        "price": "4799.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 2800,
          "max_noise": 33,
          "water_cooled": true
        },
        "imageUrl": "/assets/parts/cooling/thermalright-frozen-warframe-240-digital-1758012413711.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "programming_2010-2015_76000-100000": {
    "usage": "programming",
    "yearRange": "2010-2015",
    "budgetRange": "76000-100000",
    "estimatedAge": 15,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 36,
        "name": "AMD RYZEN 5 5500",
        "brand": "AMD",
        "category": "CPU",
        "price": "4985.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5500-1757969911320.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 212,
        "name": "16GB G.Skill Ripjaws (2x8GB) DDR4 3600MHz",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "2399.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-g.skill-ripjaws-2x8gb-ddr4-3600mhz-1758211996825.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 302,
        "name": "512GB T-FORCE VULCAN Z",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "2499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": null,
          "capacity": "512GB",
          "interface": "SATA",
          "read_speed": "540",
          "form_factor": "2.5\"",
          "write_speed": "470",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-t-force-vulcan-z-1758216468849.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 109,
        "name": "AORUS ELITE B550M AX",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "7699.00",
        "specs": {
          "socket": "AM4",
          "Chipset": "B550",
          "chipset": "B550",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "PCIE Slots": "2",
          "SATA Ports": "6",
          "pcie_slots": 2,
          "form_factor": "Micro-ATX",
          "memory_type": "DDR4",
          "pcie_x1_slots": 2,
          "ethernet_ports": 1,
          "pcie_x16_slots": 1,
          "Power Connectors": "24-pin ATX, 8-pin EPS",
          "wireless_networking": true,
          "power_connector_pins": {
            "eps": 8,
            "main": 24
          },
          "integrated_gpu_support": true,
          "motherboard_form_factor": "Micro-ATX"
        },
        "imageUrl": "/assets/parts/motherboard/aorus-elite-b550m-ax-1763601727028.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 401,
        "name": "4GB RX550 RAMSTA *SINGLE FAN",
        "brand": "AMD",
        "category": "GPU",
        "price": "4995.00",
        "specs": {
          "tdp": 50,
          "fans": "Single Fan",
          "tier": "entry",
          "length": 170,
          "launched": "2017-04-19T16:00:00.000Z",
          "interface": "PCIe 3.0",
          "pcie_8pin": 0,
          "core_clock": 1100,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 1183,
          "memory_type": "GDDR5",
          "effective_clock": 7000,
          "memory_capacity": 4
        },
        "imageUrl": "/assets/parts/gpu/4gb-rx550-ramsta-single-fan-1758175506538.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 504,
        "name": "850w CORSAIR RM850e 80+ GOLD FM",
        "brand": "Corsair",
        "category": "PSU",
        "price": "8195.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "3 x 6+2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/850w-corsair-rm850e-80-gold-fm-1758282632567.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 625,
        "name": "ASUS TUF Gaming GT501 (White)",
        "brand": "ASUS",
        "category": "Case",
        "price": "5500.00",
        "specs": {
          "color": "White",
          "category": "ATX (ATX, Micro-ATX and Mini-ITX) (Premium)",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "180mm"
        },
        "imageUrl": "/assets/parts/case/asus-tuf-gaming-gt501-1758311655755.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 701,
        "name": "Single Color Fans RGB",
        "brand": "INPLAY",
        "category": "Cooling",
        "price": "150.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1200,
          "max_noise": 25,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/single-color-fans-rgb-1758015685164.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your programming PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "video_editing_2021-2025_10000-25000": {
    "usage": "video_editing",
    "yearRange": "2021-2025",
    "budgetRange": "10000-25000",
    "estimatedAge": 4,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 37,
        "name": "AMD RYZEN 5 5600x (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "5985.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-5600x-1757973191725.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 213,
        "name": "32GB T-Force Vulcan Z Kit (2x16GB) 3600MHz",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL22",
          "memory_type": "DDR4",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-vulcan-z-kit-2x16gb-3600mhz-1758212202686.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 303,
        "name": "500GB SAMSUNG 870 EVO",
        "brand": "SAMSUNG",
        "category": "Storage",
        "price": "3199.00",
        "specs": {
          "cache": "512 MB",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "SATA",
          "read_speed": "560",
          "form_factor": "2.5\"",
          "write_speed": "530",
          "nvme_support": false,
          "storage_type": "SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-samsung-870-evo-1758216632711.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 102,
        "name": "GIGABYTE A520M-K V2",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "3499.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-k-v2-1758016226168.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 505,
        "name": "FSP Hydro M PRO 600W",
        "brand": "FSP",
        "category": "PSU",
        "price": "3750.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 600,
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/fsp-hydro-m-pro-600-1758295209505.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 626,
        "name": "LIANLI O11 Dynamic MINI (Snow White)",
        "brand": "LIAN LI",
        "category": "Case",
        "price": "6000.00",
        "specs": {
          "color": "Snow White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 3,
          "max_gpu_length": "395mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "170mm"
        },
        "imageUrl": "/assets/parts/case/lianli-o11-dynamic-mini-snow-white-1758311807865.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 702,
        "name": "Single Color Fans Red",
        "brand": "INPLAY",
        "category": "Cooling",
        "price": "150.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1200,
          "max_noise": 25,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/single-color-fans-red-1758015562808.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "video_editing_2021-2025_26000-50000": {
    "usage": "video_editing",
    "yearRange": "2021-2025",
    "budgetRange": "26000-50000",
    "estimatedAge": 4,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 38,
        "name": "AMD RYZEN 5 4655G (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "5995.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-4655g-1757973146461.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 214,
        "name": "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "3395.00",
        "specs": {
          "type": "DDR5",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL28",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-1x16gb-6000mhz-black-1758207444566.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 304,
        "name": "1TB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3695.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "NVMe",
          "capacity": "1TB",
          "interface": "M.2 PCIe 3.0 X4",
          "read_speed": "3200",
          "form_factor": "2.5\"",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-green-1758218370759.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 102,
        "name": "GIGABYTE A520M-K V2",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "3499.00",
        "specs": {
          "socket": "AM4",
          "chipset": "A520",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-a520m-k-v2-1758016226168.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 402,
        "name": "8GB RX580 XFX GTS XXX Edition *(DUALFAN)",
        "brand": "AMD",
        "category": "GPU",
        "price": "6995.00",
        "specs": {
          "tdp": 185,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 270,
          "launched": "2017-04-17T16:00:00.000Z",
          "interface": "PCIe 3.0",
          "pcie_8pin": 1,
          "core_clock": 1366,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 1380,
          "memory_type": "GDDR5",
          "effective_clock": 8000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx580-xfx-gts-xxx-edition-dualfan-1758175642305.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 506,
        "name": "700w FSP HYDRO M PRO 80+ BRONZE *SEMI MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "3650.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 700,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/700w-fsp-hydro-m-pro-80-bronze-semi-modular-1758294640216.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 628,
        "name": "YGT MARS 8 W/ 700W PSU",
        "brand": "YGT",
        "category": "Case",
        "price": "1000.00",
        "specs": {
          "color": "Black",
          "category": "mATX",
          "case_category": "Generic",
          "fans_included": 2,
          "max_gpu_length": "250",
          "max_cpu_cooler_height": "145"
        },
        "imageUrl": "/assets/parts/case/ygt-mars-8-w-700w-psu-1758295575778.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 703,
        "name": "DEEPCOOL XFAN 120M BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "220.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1300,
          "max_noise": 21,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-xfan-120m-black-1758015025773.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "video_editing_2021-2025_51000-75000": {
    "usage": "video_editing",
    "yearRange": "2021-2025",
    "budgetRange": "51000-75000",
    "estimatedAge": 4,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 39,
        "name": "AMD RYZEN 7 5700X3D (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "11995.00",
        "specs": {
          "tdp": 105,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM4",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-5700x3d-1757970855054.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 205,
        "name": "16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2995.00",
        "specs": {
          "type": "DDR4",
          "speed": 3600,
          "voltage": 1.35,
          "capacity": 16,
          "cas_latency": "CL18",
          "memory_type": "DDR4",
          "configuration": "2x8GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-t-force-delta-rgb-tuf-2x8gb-3600mhz-black-1758203447554.webp",
        "reasoning": "DDR4 memory for AM4 platform compatibility"
      },
      "Storage": {
        "productId": 305,
        "name": "500GB WESTERN DIGITAL GREEN",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "2695.00",
        "specs": {
          "cache": "DRAM-less",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "3200",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "2500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-green-1758222133406.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 107,
        "name": "ASROCK B550M PRO SE",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5195.00",
        "specs": {
          "socket": "AM4",
          "chipset": "B550",
          "max_ram": 128,
          "m2_slots": 2,
          "ram_slots": 4,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-b550m-pro-se-1758090981540.webp",
        "reasoning": "AM4 B550 chipset with DDR4 support for compatibility"
      },
      "GPU": {
        "productId": 403,
        "name": "RX6600 GIGABYTE EAGLE",
        "brand": "AMD",
        "category": "GPU",
        "price": "13995.00",
        "specs": {
          "tdp": 132,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 282,
          "launched": "2021-10-12T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2044,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2491,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rx6600-gigabyte-eagle-tri-fan-1758175978102.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 507,
        "name": "800w FSP HYDRO M PRO 80+ BRONZE *SEMI MODULAR",
        "brand": "FSP",
        "category": "PSU",
        "price": "3750.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 800,
          "efficiency": "80+ Bronze",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Bronze"
        },
        "imageUrl": "/assets/parts/psu/800w-fsp-hydro-m-pro-80-bronze-semi-modular-1758294779894.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 629,
        "name": "KEYTECH WJ REYNA (Black)",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1480.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-wj-reyna-black-1758530194324.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 704,
        "name": "DEEPCOOL RF120R 120M BLACK Red",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1500,
          "max_noise": 23,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-rf120r-120m-black-red-1758014538256.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "video_editing_2021-2025_76000-100000": {
    "usage": "video_editing",
    "yearRange": "2021-2025",
    "budgetRange": "76000-100000",
    "estimatedAge": 4,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 40,
        "name": "AMD RYZEN 5 7500F",
        "brand": "AMD",
        "category": "CPU",
        "price": "8685.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-7500f-1757973238162.webp",
        "reasoning": "Modern processor with excellent performance"
      },
      "RAM": {
        "productId": 216,
        "name": "32GB G.Skill Ripjaws M5 Neo RGB (2x16GB) 6000MHz *BLACK",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "7250.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-ripjaws-m5-neo-rgb-2x16gb-6000mhz-black-1758212100911.webp",
        "reasoning": "DDR4/DDR5 high-speed memory"
      },
      "Storage": {
        "productId": 306,
        "name": "500GB WESTERN DIGITAL BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3295.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4",
          "read_speed": "5000",
          "form_factor": "2.5\"",
          "write_speed": "4500",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-blue-1758217875548.webp",
        "reasoning": "Fast NVMe Gen3/Gen4 SSD"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 404,
        "name": "RX7600XT GIGABYTE GAMING OC",
        "brand": "AMD",
        "category": "GPU",
        "price": "23995.00",
        "specs": {
          "tdp": 190,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 297,
          "launched": "2024-01-23T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 2470,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2755,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16-rx7600xt-gigabyte-gaming-oc-tri-fan-1758176087822.webp",
        "reasoning": "Current or recent generation graphics card"
      },
      "PSU": {
        "productId": 508,
        "name": "FSP VITA GM 850W",
        "brand": "FSP",
        "category": "PSU",
        "price": "7300.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold,"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-850w-1758282834087.webp",
        "reasoning": "80+ Gold or better for efficiency"
      },
      "Case": {
        "productId": 630,
        "name": "KEYTECH WJ REYNA (White)",
        "brand": "KEYTECH",
        "category": "Case",
        "price": "1580.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "305mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/keytech-wj-reyna-white-1758530245223.webp",
        "reasoning": "Modern case with excellent cooling"
      },
      "Cooling": {
        "productId": 705,
        "name": "DEEPCOOL RF120B 120M BLACK Blue",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1500,
          "max_noise": 23,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-rf120b-120m-black-blue-1758014508895.webp",
        "reasoning": "Efficient cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2021 is relatively recent. Consider targeted upgrades.",
    "generatedAt": "2025-11-15T09:53:57.326Z",
    "databaseProducts": true
  },
  "video_editing_2016-2020_10000-25000": {
    "usage": "video_editing",
    "yearRange": "2016-2020",
    "budgetRange": "10000-25000",
    "estimatedAge": 9,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 41,
        "name": "AMD RYZEN 7 7800X3D (BOXED)",
        "brand": "AMD",
        "category": "CPU",
        "price": "20495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-7800x3d-1757973308701.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 217,
        "name": "32GB G.Skill Ripjaws M5 Neo RGB (2x16GB) 6000MHz *WHITE",
        "brand": "G. SKILL",
        "category": "RAM",
        "price": "7350.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-g.skill-ripjaws-m5-neo-rgb-2x16gb-6000mhz-white-1758212156289.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 307,
        "name": "1TB WESTERN DIGITAL BLUE",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "4799.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "M.2 PCIe 4.0 X4",
          "read_speed": "5150",
          "form_factor": "2.5\"",
          "write_speed": "4900",
          "nvme_support": true,
          "storage_type": "NVMe SSDnn"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-blue-1758220963348.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 509,
        "name": "FSP VITA GM 850W (White)",
        "brand": "FSP",
        "category": "PSU",
        "price": "7495.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-850w-white-1758282923678.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 631,
        "name": "JUNGLE LEOPARD MS-01 (BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "2150.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "174mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ms-01-black-1758530388703.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 706,
        "name": "YGT 1258 (3in1) KIT w/Controller BLACK",
        "brand": "YGT",
        "category": "Cooling",
        "price": "850.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1800,
          "max_noise": 26,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/ygt-1258-3in1-kit-with-controller-black-1758015787930.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.327Z",
    "databaseProducts": true
  },
  "video_editing_2016-2020_26000-50000": {
    "usage": "video_editing",
    "yearRange": "2016-2020",
    "budgetRange": "26000-50000",
    "estimatedAge": 9,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 42,
        "name": "Intel Core i5 14400 (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "8995.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Core i5",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 12,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.5,
          "lithography": 10,
          "turbo_clock": 4.4,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i5-14400-1757972322041.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 218,
        "name": "32GB T-FORCE DELTA RGB (2x16GB) 6400MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "7499.00",
        "specs": {
          "type": "DDR5",
          "speed": 6400,
          "voltage": 1.35,
          "capacity": 32,
          "cas_latency": "CL 32",
          "memory_type": "DDR5",
          "configuration": "2x16GB",
          "total_capacity": "32GB"
        },
        "imageUrl": "/assets/parts/ram/32gb-t-force-delta-rgb-kit-2x16gb-6400mhz-black-1758208585092.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 308,
        "name": "500GB WESTERN DIGITAL BLACK",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "3495.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "500GB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7300",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/500gb-western-digital-black-1758221969840.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 123,
        "name": "ASUS PRIME H610M-K (DDR5)",
        "brand": "ASUS",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "m2_slots": 1,
          "ram_slots": 2,
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asus-prime-h610m-k-ddr5-1758089275524.webp",
        "reasoning": "Mid-range chipset with modern features"
      },
      "GPU": {
        "productId": 405,
        "name": "RX7700XT GIGABYTE GAMING OC",
        "brand": "AMD",
        "category": "GPU",
        "price": "27995.00",
        "specs": {
          "tdp": 245,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 302,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2171,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2544,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rx7700xt-gigabyte-gaming-oc-tri-fan-1758176193279.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 510,
        "name": "FSP VITA GM 1000W",
        "brand": "FSP",
        "category": "PSU",
        "price": "8500.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/fsp-vita-gm-1000w-1758283133413.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 632,
        "name": "JUNGLE LEOPARD MS-01 (WHITE)",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "2250.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "174mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ms-01-white-1758530464501.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 707,
        "name": "INPLAY SEAVIEW (3in1) KIT w/Controller BLACK",
        "brand": "INPLAY",
        "category": "Cooling",
        "price": "1000.00",
        "specs": {
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/inplay-seaview-3in1-kit-with-controller-black-1758015178102.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.327Z",
    "databaseProducts": true
  },
  "video_editing_2016-2020_51000-75000": {
    "usage": "video_editing",
    "yearRange": "2016-2020",
    "budgetRange": "51000-75000",
    "estimatedAge": 9,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 43,
        "name": "Intel Core i7 14700KF (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "18995.00",
        "specs": {
          "tdp": 126,
          "tier": "entry",
          "cores": 20,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 30,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 3.4,
          "lithography": 10,
          "turbo_clock": 5.6,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-14700kf-1757972832928.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 219,
        "name": "64GB T-FORCE DELTA RGB (2x32GB) 6000MHz *BLACK",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "13995.00",
        "specs": {
          "type": "DDR5",
          "speed": 6000,
          "voltage": 1.25,
          "capacity": 64,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "2x32GB",
          "total_capacity": "64GB"
        },
        "imageUrl": "/assets/parts/ram/64gb-t-force-delta-rgb-2x32gb-6000mhz-black-1758211712731.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 309,
        "name": "1TB WESTERN DIGITAL BLACK",
        "brand": "WESTERN DIGITAL",
        "category": "Storage",
        "price": "5499.00",
        "specs": {
          "cache": "SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4x4",
          "read_speed": "7300",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "6300",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-western-digital-black-1758220804428.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 143,
        "name": "GIGABYTE B760M DS3H AX (DDR5) *12-14th GEN",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "6499.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "Intel B760",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 4,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          }
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-b760m-ds3h-ax-ddr5-1758090767524.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 406,
        "name": "RX7800XT GIGABYTE GAMING OC",
        "brand": "AMD",
        "category": "GPU",
        "price": "33995.00",
        "specs": {
          "tdp": 263,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 320,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2124,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2430,
          "memory_type": "GDDR6",
          "effective_clock": 19200,
          "memory_capacity": 16
        },
        "imageUrl": "/assets/parts/gpu/16gb-rx7800xt-gigabyte-gaming-oc-tri-fan-1758176546745.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 511,
        "name": "550w GIGABYTE P550SS 80+ SILVER",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "2395.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/550w-gigabyte-p550ss-80-silver-1758293790408.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 633,
        "name": "WJCOOLMAN ROBIN CURVE MINI DIGITAL (BLACK)",
        "brand": "WJ COOLMAN",
        "category": "Case",
        "price": "2750.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "350mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/wjcoolman-robin-curve-mini-digital-black-1758530732203.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 708,
        "name": "KEYTECH PRISM (3in1) KIT w/Controller BLACK/WHITE",
        "brand": "KEYTECH",
        "category": "Cooling",
        "price": "1000.00",
        "specs": {
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 27,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/keytech-prism-3in1-kit-with-controller-black-or-white-1758015278989.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.327Z",
    "databaseProducts": true
  },
  "video_editing_2016-2020_76000-100000": {
    "usage": "video_editing",
    "yearRange": "2016-2020",
    "budgetRange": "76000-100000",
    "estimatedAge": 9,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 44,
        "name": "Intel Core i7 14700 (BOX TYPE)",
        "brand": "INTEL",
        "category": "CPU",
        "price": "20499.00",
        "specs": {
          "tdp": 65,
          "tier": "entry",
          "cores": 20,
          "series": "Core i7",
          "socket": "LGA1700",
          "max_ram": 128,
          "threads": 28,
          "launched": "2022-01-03T16:00:00.000Z",
          "base_clock": 2.1,
          "lithography": 7,
          "turbo_clock": 5.4,
          "integrated_gpu": true,
          "max_supported_ram": 128
        },
        "imageUrl": "/assets/parts/cpu/intel-core-i7-14700-1757972677913.webp",
        "reasoning": "Mid-generation processor offering good balance"
      },
      "RAM": {
        "productId": 220,
        "name": "8GB ADATA DDR4 3200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "1395.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 8,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-adata-ddr4-3200-laptop-memory-1758212242632.webp",
        "reasoning": "DDR4 memory standard, offering better speeds"
      },
      "Storage": {
        "productId": 310,
        "name": "512GB TEAMGROUP MP33 PRO",
        "brand": "TEAM GROUP",
        "category": "Storage",
        "price": "2699.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "512GB",
          "interface": "PCIe Gen3",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "3000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-teamgroup-mp33-pro-1758219046209.webp",
        "reasoning": "SATA SSD or entry-level NVMe"
      },
      "Motherboard": {
        "productId": 121,
        "name": "GIGABYTE H610M-H",
        "brand": "GIGABYTE",
        "category": "Motherboard",
        "price": "4999.00",
        "specs": {
          "socket": "LGA1700",
          "chipset": "H610",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 1,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR4",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/gigabyte-h610m-h-ddr4-1758089164658.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 407,
        "name": "RX7700XT ASROCK STEEL LEGEND",
        "brand": "AMD",
        "category": "GPU",
        "price": "27995.00",
        "specs": {
          "tdp": 245,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 305,
          "launched": "2023-09-05T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 2,
          "core_clock": 2171,
          "frame_sync": "FreeSync",
          "ports_hdmi": 1,
          "boost_clock": 2544,
          "memory_type": "GDDR6",
          "effective_clock": 18000,
          "memory_capacity": 12
        },
        "imageUrl": "/assets/parts/gpu/12gb-rx7700xt-asrock-steel-legend-tri-fan-1758179830945.webp",
        "reasoning": "Capable graphics card from previous generation"
      },
      "PSU": {
        "productId": 512,
        "name": "550w GIGABYTE P550SS ICE 80+ SILVER (*White )",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "2695.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 550,
          "efficiency": "80+ Silver",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6+2-pin",
          "sata_connectors": "5",
          "efficiency_rating": "80+ Silver"
        },
        "imageUrl": "/assets/parts/psu/550w-gigabyte-p550ss-ice-80-silver-white--1758293933073.webp",
        "reasoning": "80+ Bronze or better efficiency"
      },
      "Case": {
        "productId": 634,
        "name": "WJCOOLMAN ROBIN CURVE MINI DIGITAL (WHITE)",
        "brand": "WJ COOLMAN",
        "category": "Case",
        "price": "2850.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Dual Chamber)",
          "fans_included": 2,
          "max_gpu_length": "350mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "157mm"
        },
        "imageUrl": "/assets/parts/case/wjcoolman-robin-curve-mini-digital-white-1758530800283.webp",
        "reasoning": "Modern case with improved airflow"
      },
      "Cooling": {
        "productId": 709,
        "name": "DEEPCOOL TF120S BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "495.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1500,
          "max_noise": 24,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-tf120s-black-1758014578243.webp",
        "reasoning": "Aftermarket cooler or adequate stock cooling"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2016 is showing its age. Focus on key component upgrades.",
    "generatedAt": "2025-11-15T09:53:57.327Z",
    "databaseProducts": true
  },
  "video_editing_2010-2015_10000-25000": {
    "usage": "video_editing",
    "yearRange": "2010-2015",
    "budgetRange": "10000-25000",
    "estimatedAge": 15,
    "targetBudget": 17500,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 11,
        "name": "AMD RYZEN 5 8400F (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "8495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "avg_rating": 3,
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "last_updated": "2025-11-10T20:11:50.792195+08:00",
          "total_ratings": 1,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "satisfaction_score": 48,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-8400f-1757970960464.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 221,
        "name": "16GB ADATA DDR4 3200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "2395.00",
        "specs": {
          "type": "DDR4",
          "speed": 3200,
          "voltage": 1.2,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR4",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-adata-ddr4-3200-laptop-memory-1758211858013.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 311,
        "name": "1TB XPG SX8200 PRO",
        "brand": "ADATA",
        "category": "Storage",
        "price": "4099.00",
        "specs": {
          "cache": "Dynamic SLC (Single Level Caching)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen4",
          "read_speed": "3500",
          "form_factor": "2.5\"",
          "write_speed": "3000",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-xpg-sx8200-pro-1758219361407.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "PSU": {
        "productId": 513,
        "name": "650w GIGABYTE P650G 80+ GOLD",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "3985.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 650,
          "efficiency": "80+ Gold",
          "form_factor": "ATX",
          "pcie_connectors": "4 x 6+2-pin connectors",
          "sata_connectors": "6",
          "efficiency_rating": "80+ Gold"
        },
        "imageUrl": "/assets/parts/psu/650w-gigabyte-p650g-80-gold-1758294290210.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 635,
        "name": "JUNGLE LEOPARD AC-01 (BLACK)",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "3250.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ac-01-black-1758530898065.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 710,
        "name": "ARCTIC P12 PWM SINGLE WHITE",
        "brand": "ARCTIC",
        "category": "Cooling",
        "price": "495.00",
        "specs": {
          "fanless": false,
          "max_rpm": 1800,
          "max_noise": 22,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/arctic-p12-pwm-single-white-1758014134888.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.327Z",
    "databaseProducts": true
  },
  "video_editing_2010-2015_26000-50000": {
    "usage": "video_editing",
    "yearRange": "2010-2015",
    "budgetRange": "26000-50000",
    "estimatedAge": 15,
    "targetBudget": 38000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 12,
        "name": "AMD RYZEN 5 7600 (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "10495.00",
        "specs": {
          "tdp": 65,
          "tier": "mid-tier",
          "cores": 6,
          "series": "Ryzen 5",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 12,
          "launched": "2024-02-09T16:00:00.000Z",
          "base_clock": 3.7,
          "lithography": 5,
          "turbo_clock": 4.8,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-5-7600-1757971070351.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 222,
        "name": "8GB ADATA DDR5 4800 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "1995.00",
        "specs": {
          "type": "DDR5",
          "speed": 4800,
          "voltage": 1.25,
          "capacity": 8,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "1x8GB",
          "total_capacity": "8GB"
        },
        "imageUrl": "/assets/parts/ram/8gb-adata-ddr5-4800-laptop-memory-1758212290771.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 312,
        "name": "256GB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "1599.00",
        "specs": {
          "cache": "HMB (Host Memory Buffer)",
          "m2_type": "M.2 NVMe Gen3",
          "capacity": "256GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\"",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/256gb-adata-legend-710-1758219606720.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 408,
        "name": "RTX3050 PALIT STORM",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "10495.00",
        "specs": {
          "tdp": 130,
          "fans": "Single Fan",
          "tier": "entry",
          "length": 170,
          "launched": "2022-01-26T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1552,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 1777,
          "memory_type": "GDDR6",
          "effective_clock": 14000,
          "memory_capacity": 6
        },
        "imageUrl": "/assets/parts/gpu/6gb-rtx3050-palit-storm-single-fan-1758179663218.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 514,
        "name": "850W AORUS ELITE PCIE5 80+ PLATINUM FULLY MODULAR",
        "brand": "GIGABYTE",
        "category": "PSU",
        "price": "8450.00",
        "specs": {
          "length": 140,
          "modular": true,
          "wattage": 850,
          "efficiency": "80+ Platinum",
          "form_factor": "ATX",
          "pcie_connectors": "6 x 6+2-pin | 1 x 16-pin 12VHPWR",
          "sata_connectors": "8",
          "efficiency_rating": "80+ Platinum, PCIe 5"
        },
        "imageUrl": "/assets/parts/psu/850w-aorus-elite-p850w-pcie5-80-platinum-fully-modular-psu-1758294439071.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 636,
        "name": "JUNGLE LEOPARD AC-01 (WHITE",
        "brand": "JUNGLE LEOPARD",
        "category": "Case",
        "price": "3450.00",
        "specs": {
          "color": "White",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "420mm",
          "tempered_glass": true,
          "max_cpu_cooler_height": "155mm"
        },
        "imageUrl": "/assets/parts/case/jungle-leopard-ac-01-white-1758530987772.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 711,
        "name": "DEEPCOOL 140M TF140S 3 in 1 KIT BLACK",
        "brand": "DEEPCOOL",
        "category": "Cooling",
        "price": "1200.00",
        "specs": {
          "height": 27,
          "fanless": false,
          "max_rpm": 1600,
          "max_noise": 25,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/deepcool-140m-tf140s-3-in-1-kit-black-1758014221924.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.327Z",
    "databaseProducts": true
  },
  "video_editing_2010-2015_51000-75000": {
    "usage": "video_editing",
    "yearRange": "2010-2015",
    "budgetRange": "51000-75000",
    "estimatedAge": 15,
    "targetBudget": 63000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 13,
        "name": "AMD RYZEN 7 8700F (TTP) W/ AMD COOLER",
        "brand": "AMD",
        "category": "CPU",
        "price": "11495.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-8700f-1757971242831.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 223,
        "name": "16GB ADATA DDR5 5200 LAPTOP MEMORY",
        "brand": "ADATA",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "type": "DDR5",
          "speed": 5200,
          "voltage": 1.25,
          "capacity": 16,
          "cas_latency": "CL16",
          "memory_type": "DDR5",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-adata-ddr5-5200-laptop-memory-1758211920632.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 313,
        "name": "512GB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "2699.00",
        "specs": {
          "cache": "SLC (Single Level Caching) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "512GB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/512gb-adata-legend-710-1758219705833.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 409,
        "name": "RTX4060 GALAX 1-Click OC 2X",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "17795.00",
        "specs": {
          "tdp": 115,
          "fans": "Dual Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-galax-1-click-oc-2x-dualfan-1758176660856.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 517,
        "name": "500w Cougar STC500 80+",
        "brand": "Cougar",
        "category": "PSU",
        "price": "2280.00",
        "specs": {
          "length": 140,
          "modular": false,
          "wattage": 500,
          "efficiency": "80+",
          "form_factor": "ATX",
          "pcie_connectors": "2 x 6-pin +2-pin",
          "sata_connectors": "6",
          "efficiency_rating": "80+"
        },
        "imageUrl": "/assets/parts/psu/500w-cougar-stc500-80-1758269405947.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 601,
        "name": "NZXT H510 Mid Tower Case (Black)",
        "brand": "NZXT",
        "category": "Case",
        "price": "1000.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower (Gaming Pc Case)",
          "fans_included": 2,
          "max_gpu_length": "381mm",
          "tempered_glass": false,
          "max_cpu_cooler_height": "165mm"
        },
        "imageUrl": "/assets/parts/case/nzxt-h510-mid-tower-case-1758312262623.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 712,
        "name": "ARCTIC F12 Set of 5 (5pcs Fan)",
        "brand": "ARCTIC",
        "category": "Cooling",
        "price": "1489.00",
        "specs": {
          "height": null,
          "fanless": false,
          "max_rpm": 1350,
          "max_noise": 23,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/arctic-f12-set-of-5-5pcs-fan-1758014043305.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.328Z",
    "databaseProducts": true
  },
  "video_editing_2010-2015_76000-100000": {
    "usage": "video_editing",
    "yearRange": "2010-2015",
    "budgetRange": "76000-100000",
    "estimatedAge": 15,
    "targetBudget": 88000,
    "actualBudget": null,
    "components": {
      "CPU": {
        "productId": 14,
        "name": "AMD RYZEN 7 7700 (TTP)",
        "brand": "AMD",
        "category": "CPU",
        "price": "12750.00",
        "specs": {
          "tdp": 65,
          "tier": "high-tier",
          "cores": 8,
          "series": "Ryzen 7",
          "socket": "AM5",
          "max_ram": 128,
          "threads": 16,
          "launched": "2024-02-14T16:00:00.000Z",
          "base_clock": 3.6,
          "lithography": 5,
          "turbo_clock": 5,
          "integrated_gpu": false,
          "max_supported_ram": 128,
          "multithreading_supported": true
        },
        "imageUrl": "/assets/parts/cpu/ryzen-7-7700-1757971509444.webp",
        "reasoning": "Older generation processor, suitable for the era when this PC was built"
      },
      "RAM": {
        "productId": 225,
        "name": "16GB TEAM ELITE PLUS DDR5 5600 Gold",
        "brand": "TEAM GROUP",
        "category": "RAM",
        "price": "2895.00",
        "specs": {
          "type": "DDR5",
          "speed": 5600,
          "voltage": 0.1,
          "capacity": 16,
          "cas_latency": "40",
          "memory_type": "DDR5",
          "configuration": "1x16GB",
          "total_capacity": "16GB"
        },
        "imageUrl": "/assets/parts/ram/16gb-team-elite-plus-ddr5-5600-gold-1758207271016.webp",
        "reasoning": "DDR3 memory standard for systems of this age"
      },
      "Storage": {
        "productId": 314,
        "name": "1TB ADATA LEGEND 710",
        "brand": "ADATA",
        "category": "Storage",
        "price": "3699.00",
        "specs": {
          "cache": "SLC (Single Level Caching) & HMB (Host Memory Buffer)",
          "m2_type": "M.2 2280",
          "capacity": "1TB",
          "interface": "PCIe Gen3x4",
          "read_speed": "2400",
          "form_factor": "2.5\" M.2 2280",
          "write_speed": "1800",
          "nvme_support": true,
          "storage_type": "NVMe SSD"
        },
        "imageUrl": "/assets/parts/storage/1tb-adata-legend-710-1758219767488.webp",
        "reasoning": "Traditional storage, common before SSD adoption"
      },
      "Motherboard": {
        "productId": 110,
        "name": "ASROCK A620M-HDV/M.2",
        "brand": "ASROCK",
        "category": "Motherboard",
        "price": "5995.00",
        "specs": {
          "socket": "AM5",
          "chipset": "A620",
          "max_ram": 128,
          "M2 Slots": "2",
          "m2_slots": 2,
          "Ram Slots": "4",
          "ram_slots": 2,
          "SATA Ports": "4",
          "pcie_slots": 4,
          "form_factor": "ATX",
          "memory_type": "DDR5",
          "ethernet_ports": 1,
          "wireless_networking": false,
          "power_connector_pins": {
            "eps": 4,
            "main": 24
          },
          "integrated_gpu_support": true
        },
        "imageUrl": "/assets/parts/motherboard/asrock-a620m-hdv-m.2-1758090888365.webp",
        "reasoning": "Socket-compatible motherboard"
      },
      "GPU": {
        "productId": 410,
        "name": "RTX4060 GIGABYTE EAGLE",
        "brand": "NVIDIA",
        "category": "GPU",
        "price": "19995.00",
        "specs": {
          "tdp": 115,
          "fans": "Tri Fan",
          "tier": "entry",
          "length": 280,
          "launched": "2023-06-28T16:00:00.000Z",
          "interface": "PCIe 4.0",
          "pcie_8pin": 1,
          "core_clock": 1830,
          "frame_sync": "G-Sync",
          "ports_hdmi": 1,
          "boost_clock": 2460,
          "memory_type": "GDDR6",
          "effective_clock": 17000,
          "memory_capacity": 8
        },
        "imageUrl": "/assets/parts/gpu/8gb-rtx4060-gigabyte-eagle-tri-fan-1758176793477.webp",
        "reasoning": "Entry-level graphics from this period"
      },
      "PSU": {
        "productId": 518,
        "name": "750W YGT KY-750",
        "brand": "YGT",
        "category": "PSU",
        "price": "800.00",
        "specs": {
          "length": 55,
          "modular": false,
          "wattage": 750,
          "form_factor": "ATX",
          "pcie_connectors": "1x 6-pin",
          "sata_connectors": "2",
          "efficiency_rating": "Generic"
        },
        "imageUrl": "/assets/parts/psu/750w-ygt-ky-750-1758269193843.webp",
        "reasoning": "Basic power supply for this era"
      },
      "Case": {
        "productId": 602,
        "name": "POWERLOGIC SLIM (Black)",
        "brand": "POWERLOGIC",
        "category": "Case",
        "price": "1350.00",
        "specs": {
          "color": "Black",
          "category": "Micro-ATX and Mini-ITX.",
          "case_category": "Mid Tower",
          "fans_included": 1,
          "max_gpu_length": "250mm",
          "tempered_glass": false,
          "max_cpu_cooler_height": "140mm"
        },
        "imageUrl": "/assets/parts/case/powerlogic-slim-black-1758312408833.webp",
        "reasoning": "Simple case design typical of budget builds"
      },
      "Cooling": {
        "productId": 713,
        "name": "Intel 1st - 11th Gen",
        "brand": "INTEL",
        "category": "Cooling",
        "price": "250.00",
        "specs": {
          "height": 60,
          "fanless": false,
          "max_rpm": 2000,
          "max_noise": 30,
          "water_cooled": false
        },
        "imageUrl": "/assets/parts/cooling/intel-1st---11th-gen-1758531476764.webp",
        "reasoning": "Stock or basic cooling solution"
      }
    },
    "isGamingBuild": false,
    "suggestedUpgrades": [
      "CPU",
      "RAM"
    ],
    "upgradeReasoning": "Your video_editing PC from 2010 is significantly outdated. Platform upgrade recommended.",
    "generatedAt": "2025-11-15T09:53:57.328Z",
    "databaseProducts": true
  }
};

module.exports = REFERENCE_BUILDS;

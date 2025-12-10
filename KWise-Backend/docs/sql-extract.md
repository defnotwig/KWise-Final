# SQL Data Extraction Summary

## Tables Found in Provided SQL

### 1. CREATE TABLE Statements

#### Core PC Parts Tables:

- **pc_parts** (master table) - 14 categories with id, name, category, brand, price, stock
- **cpu** - Detailed CPU specifications with performance metrics
- **gpu** - Graphics card specifications with performance data
- **motherboard** - Motherboard specs (socket, chipset, RAM support)
- **ram** - Memory specifications (type, speed, configuration)
- **storage** - SSD/HDD specifications (capacity, interface, NVMe)
- **psu** - Power supply specifications (wattage, efficiency, modular)
- **pc_case** - Case specifications (form factor, fans, color)
- **cooling** - Cooling system specifications (fans, AIO, height)

#### Peripherals Tables:

- **monitors** - Display specifications (size, resolution, refresh rate)
- **headphones** - Audio device specifications (type, wireless, frequency)
- **keyboard** - Input device specifications (mechanical, switch type)
- **mouse** - Mouse specifications (DPI, connection, tracking)
- **speakers** - Speaker specifications (wattage, configuration)
- **webcams** - Camera specifications (resolution, connection, FOV)

### 2. Data Volume Summary

| Table       | Estimated Records | ID Range     | Notes                                   |
| ----------- | ----------------- | ------------ | --------------------------------------- |
| pc_parts    | 200+              | Mixed ranges | Master table with duplicates to resolve |
| cpu         | 43                | 11-43        | Detailed performance metrics            |
| gpu         | 40                | 401-440      | Complete GPU specifications             |
| motherboard | 35                | 101-135      | Socket and chipset variety              |
| ram         | 24                | 201-224      | DDR4/DDR5 configurations                |
| storage     | 26                | 301-326      | SSD/NVMe storage options                |
| psu         | 23                | 501-523      | Power supplies 500W-1000W               |
| pc_case     | 26                | 601-626      | Various case types                      |
| cooling     | 31                | 701-731      | Air/AIO cooling solutions               |
| monitors    | 22                | 801-822      | Display options                         |
| headphones  | 16                | 901-916      | Gaming/professional audio               |
| keyboard    | 12                | 1001-1012    | Mechanical/membrane                     |
| mouse       | 10                | 1101-1110    | Gaming mice                             |
| speakers    | 4                 | 1201-1204    | Desktop speakers                        |
| webcams     | 5                 | 1301-1305    | Streaming/office webcams                |

### 3. Schema Conflicts & Issues

#### ID Conflicts:

- PC_Parts table has duplicate IDs (24, 25 appear twice)
- Some category mappings inconsistent between tables

#### Data Inconsistencies:

- Missing brand extraction from some product names
- Price formatting variations
- Some NULL/missing specification fields

### 4. Normalization Plan

#### Master Table Structure:

```sql
pc_parts (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  price NUMERIC(10,2),
  stock INT DEFAULT 0,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
```

#### Subtype Tables:

Each category will have its own specifications table:

- cpu_specs, gpu_specs, motherboard_specs, etc.
- Foreign key relationship to pc_parts.id
- Category-specific technical specifications

### 5. Import Strategy

1. **Clean pc_parts master data** - Resolve ID conflicts
2. **Insert into master table** with proper categorization
3. **Insert specifications** into appropriate subtype tables
4. **Handle conflicts** with upsert operations
5. **Validate relationships** between master and spec tables

### 6. Brand Extraction

Many product names contain brand information that needs extraction:

- "AMD RYZEN 5 8400F" → Brand: "AMD"
- "GIGABYTE B450M-K" → Brand: "GIGABYTE"
- "Logitech C270 HD Webcam" → Brand: "Logitech"

### 7. Category Mapping

| Legacy Table | Category    | Count |
| ------------ | ----------- | ----- |
| cpu          | CPU         | 43    |
| gpu          | GPU         | 40    |
| motherboard  | Motherboard | 35    |
| ram          | RAM         | 24    |
| storage      | Storage     | 26    |
| psu          | PSU         | 23    |
| pc_case      | Case        | 26    |
| cooling      | Cooling     | 31    |
| monitors     | Monitor     | 22    |
| headphones   | Headphones  | 16    |
| keyboard     | Keyboard    | 12    |
| mouse        | Mouse       | 10    |
| speakers     | Speakers    | 4     |
| webcams      | Webcam      | 5     |

**Total Products: ~317 items**

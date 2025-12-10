# Database Inventory Report
Generated: 2025-09-02T07:35:12.123Z

## Tables Overview
| Table Name | Type | Columns | Rows | Size |
|------------|------|---------|------|------|
| api_keys | BASE TABLE | 9 | 0 | 32 kB |
| audit_logs | BASE TABLE | 9 | 0 | 56 kB |
| cooling | BASE TABLE | 6 | 3 | 48 kB |
| cpu | BASE TABLE | 24 | 5 | 40 kB |
| gpu | BASE TABLE | 16 | 5 | 40 kB |
| headphones | BASE TABLE | 6 | 3 | 40 kB |
| keyboard | BASE TABLE | 6 | 3 | 40 kB |
| monitor | BASE TABLE | 9 | 22 | 24 kB |
| monitors | BASE TABLE | 7 | 3 | 40 kB |
| motherboard | BASE TABLE | 9 | 3 | 48 kB |
| mouse | BASE TABLE | 6 | 3 | 40 kB |
| order_items | BASE TABLE | 11 | 0 | 24 kB |
| orders | BASE TABLE | 13 | 0 | 32 kB |
| package | BASE TABLE | 12 | 17 | 24 kB |
| password_history | BASE TABLE | 4 | 0 | 8192 bytes |
| password_resets | BASE TABLE | 12 | 0 | 72 kB |
| payment | BASE TABLE | 4 | 0 | 8192 bytes |
| pc_case | BASE TABLE | 6 | 3 | 40 kB |
| pc_parts | BASE TABLE | 8 | 46 | 80 kB |
| performancestats | BASE TABLE | 9 | 0 | 8192 bytes |
| psu | BASE TABLE | 7 | 3 | 40 kB |
| queue | BASE TABLE | 5 | 0 | 8192 bytes |
| ram | BASE TABLE | 8 | 3 | 40 kB |
| rate_limits | BASE TABLE | 4 | 0 | 24 kB |
| services | BASE TABLE | 6 | 3 | 32 kB |
| settings | BASE TABLE | 7 | 11 | 48 kB |
| speakers | BASE TABLE | 6 | 3 | 40 kB |
| stock_categories | BASE TABLE | 7 | 10 | 48 kB |
| stock_items | BASE TABLE | 9 | 0 | 24 kB |
| storage | BASE TABLE | 8 | 3 | 40 kB |
| transactions | BASE TABLE | 10 | 0 | 32 kB |
| user | BASE TABLE | 6 | 0 | 24 kB |
| user_sessions | BASE TABLE | 9 | 0 | 48 kB |
| users | BASE TABLE | 26 | 12 | 208 kB |
| webcam | BASE TABLE | 8 | 5 | 24 kB |
| webcams | BASE TABLE | 6 | 3 | 40 kB |

## Empty Tables
Empty tables found:
- api_keys
- audit_logs
- cooling
- cpu
- gpu
- headphones
- keyboard
- monitor
- monitors
- motherboard
- mouse
- order_items
- orders
- package
- password_history
- password_resets
- payment
- pc_case
- pc_parts
- performancestats
- psu
- queue
- ram
- rate_limits
- services
- settings
- speakers
- stock_categories
- stock_items
- storage
- transactions
- user
- user_sessions
- users
- webcam
- webcams

## Foreign Key Relationships
| Table | Column | References Table | References Column |
|-------|--------|------------------|-------------------|
| api_keys | user_id | users | id |
| audit_logs | user_id | users | id |
| order_items | stock_item_id | stock_items | id |
| order_items | order_id | orders | id |
| orders | created_by | users | id |
| password_history | user_id | users | id |
| password_resets | user_id | users | id |
| stock_items | category_id | stock_categories | id |
| transactions | created_by | users | id |
| transactions | order_id | orders | id |
| user_sessions | user_id | users | id |

## Database Statistics
- **Total Database Size:** 11 MB
- **Total Tables:** 36
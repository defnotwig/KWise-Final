import { getFullImageUrl } from './networkConfig';

const CANONICAL_CATEGORIES = {
  cpu: 'CPU',
  processor: 'CPU',
  'central processing unit': 'CPU',
  gpu: 'GPU',
  graphics: 'GPU',
  'graphics card': 'GPU',
  graphcard: 'GPU',
  motherboard: 'Motherboard',
  mobo: 'Motherboard',
  mainboard: 'Motherboard',
  ram: 'RAM',
  memory: 'RAM',
  storage: 'Storage',
  ssd: 'Storage',
  hdd: 'Storage',
  nvme: 'Storage',
  psu: 'PSU',
  'power supply': 'PSU',
  'power supply unit': 'PSU',
  case: 'Case',
  chassis: 'Case',
  'pc case': 'Case',
  cooling: 'Cooling',
  cooler: 'Cooling',
  'cpu cooler': 'Cooling',
  'cpu-cooler': 'Cooling',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  headphones: 'Headphones',
  headset: 'Headphones',
  speakers: 'Speakers',
  webcam: 'Webcam'
};

const API_KEYS = {
  CPU: 'cpu',
  GPU: 'gpu',
  Motherboard: 'motherboard',
  RAM: 'ram',
  Storage: 'storage',
  PSU: 'psu',
  Case: 'case',
  Cooling: 'cooling'
};

const PC_COMPONENTS = new Set(Object.keys(API_KEYS));
const CATEGORY_KEYS = {
  ...API_KEYS,
  Monitor: 'monitor',
  Keyboard: 'keyboard',
  Mouse: 'mouse',
  Headphones: 'headphones',
  Speakers: 'speakers',
  Webcam: 'webcam'
};
const ARRAY_COMPONENT_KEYS = new Set(['ram', 'storage']);
const PERIPHERAL_CATEGORIES = new Set(['Monitor', 'Keyboard', 'Mouse', 'Headphones', 'Speakers', 'Webcam']);
const NON_COMPONENT_HINTS = ['service', 'upgrade', 'manual', 'processing', 'labor', 'installation', 'warranty', 'accessory', 'peripheral'];

const getEnvValue = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key] !== undefined) {
    return import.meta.env[key];
  }
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
};

export const isVerboseKioskLogs = () => (
  getEnvValue('VITE_KWISE_VERBOSE_LOGS') === 'true'
  || getEnvValue('REACT_APP_KWISE_VERBOSE_LOGS') === 'true'
);

export const kioskLog = {
  log: (...args) => {
    if (isVerboseKioskLogs()) globalThis.console?.log?.(...args);
  },
  warn: (...args) => {
    if (isVerboseKioskLogs()) globalThis.console?.warn?.(...args);
  },
  error: (...args) => globalThis.console?.error?.(...args)
};

export const canonicalCategory = (category, fallback = '') => {
  const raw = String(category || fallback || '').trim();
  if (!raw) return '';

  const normalized = raw.toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ').replaceAll(/\s+/g, ' ').trim();
  return CANONICAL_CATEGORIES[normalized] || CANONICAL_CATEGORIES[raw.toLowerCase()] || raw;
};

export const categoryApiKey = (category) => API_KEYS[canonicalCategory(category)] || '';

export const categoryKey = (category) => CATEGORY_KEYS[canonicalCategory(category)] || String(category || '').toLowerCase().replaceAll(/\s+/g, '-');

export const isPcComponentCategory = (category) => PC_COMPONENTS.has(canonicalCategory(category));

export const isPeripheralCategory = (category) => PERIPHERAL_CATEGORIES.has(canonicalCategory(category));

export const isNonComponentLine = (item = {}) => {
  const category = String(item.category || item.categoryName || item.type || '').toLowerCase();
  const name = String(item.name || item.productName || '').toLowerCase();
  return NON_COMPONENT_HINTS.some((hint) => category.includes(hint) || name.includes(hint));
};

export const inferCategoryFromProduct = (item = {}) => {
  const explicit = canonicalCategory(item.category || item.categoryName || item.part_category || item.type || '');
  if (isPcComponentCategory(explicit) || isPeripheralCategory(explicit)) return explicit;

  const specs = item.specifications || item.specs || {};
  if (specs && typeof specs === 'object') {
    if (specs.socket || specs.cores || specs.threads || specs.base_clock) return 'CPU';
    if (specs.vram || specs.cuda_cores || specs.ray_tracing) return 'GPU';
    if (specs.chipset || specs.form_factor_motherboard || specs.memory_slots) return 'Motherboard';
    if (specs.memory_type || specs.speed_mhz || specs.capacity_per_stick) return 'RAM';
    if (specs.capacity_gb || specs.interface_type || specs.read_speed) return 'Storage';
    if (specs.tdp_w || specs.tdp_rating || specs.fan_size || specs.radiator_size) return 'Cooling';
    if (specs.wattage || specs.efficiency_rating || specs.modular) return 'PSU';
    if (specs.max_gpu_length || specs.max_cooler_height || specs.expansion_slots) return 'Case';
  }

  const name = String(item.name || item.productName || item.part_name || '').toLowerCase();
  if (!name) return explicit;
  if (name.includes('ryzen') || name.includes('intel') || name.includes('core i') || /\bi[3579][-\s]/.test(name)) return 'CPU';
  if (name.includes('rtx') || name.includes('gtx') || name.includes('radeon') || name.includes('geforce')) return 'GPU';
  if (name.includes('motherboard') || name.includes('b550') || name.includes('b650') || name.includes('b760') || name.includes('z790') || name.includes('a620')) return 'Motherboard';
  if (name.includes('ddr4') || name.includes('ddr5') || name.includes(' ram') || name.includes('memory') || name.includes('dimm')) return 'RAM';
  if (name.includes('ssd') || name.includes('nvme') || name.includes('hdd') || name.includes('hard drive') || name.includes('adata') || name.includes('legend')) return 'Storage';
  if (name.includes('cooler') || name.includes('cooling') || name.includes('aio') || name.includes('liquid') || name.includes('thermalright') || name.includes('deepcool')) return 'Cooling';
  if (name.includes('psu') || name.includes('power supply') || name.includes('watt') || /\b\d{3,4}w\b/.test(name)) return 'PSU';
  if (name.includes('case') || name.includes('chassis') || name.includes('tower')) return 'Case';
  if (name.includes('monitor')) return 'Monitor';
  if (name.includes('keyboard')) return 'Keyboard';
  if (name.includes('mouse')) return 'Mouse';
  if (name.includes('headphone') || name.includes('headset')) return 'Headphones';
  if (name.includes('speaker')) return 'Speakers';
  if (name.includes('webcam')) return 'Webcam';
  return explicit;
};

export const parseKioskPrice = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return Number.parseFloat(String(value || '').replaceAll(/[^\d.]/g, '')) || 0;
};

export const pickProductImagePath = (product = {}) => (
  product.imageUrl
  || product.image_url
  || product.imagePath
  || product.image_path
  || product.file_path
  || product.filePath
  || product.image
  || ''
);

export const normalizeImageVariants = (product = {}) => {
  const rawVariants = product.imageVariants || product.image_variants || {};
  const originalPath = rawVariants.original || pickProductImagePath(product);
  const variants = {};

  ['original', 'thumb', 'card', 'detail'].forEach((key) => {
    const value = key === 'original' ? originalPath : rawVariants[key];
    const resolved = getFullImageUrl(value);
    if (resolved) variants[key] = resolved;
  });

  return variants;
};

export const resolveProductImage = (product = {}, fallback = null) => (
  normalizeImageVariants(product).card
  || normalizeImageVariants(product).original
  || getFullImageUrl(pickProductImagePath(product))
  || fallback
);

export const normalizeKioskProduct = (product = {}, options = {}) => {
  const category = canonicalCategory(product.category || options.category || '');
  const imagePath = pickProductImagePath(product);
  const imageVariants = normalizeImageVariants(product);
  const image = imageVariants.card
    || imageVariants.original
    || getFullImageUrl(imagePath)
    || options.fallbackImage
    || null;
  return {
    ...product,
    category: category || product.category || options.category || '',
    categoryKey: product.categoryKey || product.category_key || categoryKey(category || product.category || options.category || ''),
    imagePath,
    imageVariants,
    image_variants: imageVariants,
    originalImageUrl: imageVariants.original || getFullImageUrl(imagePath) || '',
    image,
    imageUrl: image || product.imageUrl || product.image_url || product.image || '',
    image_url: image || product.image_url || product.imageUrl || product.image || '',
    price: options.keepPriceString ? product.price : parseKioskPrice(product.price),
    salePrice: product.salePrice ?? product.sale_price ?? null,
    sale_price: product.sale_price ?? product.salePrice ?? null,
    effectivePrice: product.effectivePrice ?? product.effective_price ?? product.salePrice ?? product.sale_price ?? product.price,
    onSale: Boolean(product.onSale ?? product.on_sale ?? false),
    specifications: product.specifications || product.specs || {},
    dimensions: product.dimensions || {},
    description: product.description || product.details || ''
  };
};

export const formatCompatibilityComponent = (item = {}) => {
  const itemId = Number.parseInt(item.id || item.product_id || item.componentId || item.part_id, 10);
  if (!itemId || Number.isNaN(itemId) || itemId < 1 || isNonComponentLine(item)) return null;

  const category = inferCategoryFromProduct(item);
  if (!isPcComponentCategory(category)) return null;

  return {
    id: itemId,
    name: item.name || item.productName || item.part_name || '',
    category,
    brand: item.brand || item.part_brand || '',
    price: parseKioskPrice(item.price || item.part_price),
    stock: Number.parseInt(item.stock || item.part_stock || 0, 10) || 0,
    specifications: item.specifications || item.specs || {},
    dimensions: item.dimensions || {},
    image_url: pickProductImagePath(item),
    imagePath: pickProductImagePath(item),
    description: item.description || item.details || '',
    performance_index: item.performance_index || item.performanceIndex || 0,
    quantity: item.quantity || 1
  };
};

export const buildCompatibilityPayload = (items = [], options = {}) => {
  const formatted = {};
  const sourceItems = Array.isArray(items) ? items : Object.values(items || {});

  sourceItems.forEach((item) => {
    const component = formatCompatibilityComponent(item);
    if (!component) return;

    const key = categoryApiKey(component.category);
    if (!key) return;

    if (options.arrayCategories !== false && ARRAY_COMPONENT_KEYS.has(key)) {
      if (!formatted[key]) formatted[key] = [];
      formatted[key].push(component);
      return;
    }

    if (!formatted[key]) {
      formatted[key] = component;
    }
  });

  return formatted;
};

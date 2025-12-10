const {query} = require('../config/db');
const logger = require('../utils/logger');

/**
 * Generate smart descriptions for products based on their specifications
 */
function generateDescription(item) {
    const { name, category, brand, specifications } = item;
    const specs = specifications || {};
    
    try {
        switch (category) {
            case 'CPU':
                return generateCPUDescription(name, brand, specs);
            case 'GPU':
                return generateGPUDescription(name, brand, specs);
            case 'Motherboard':
                return generateMotherboardDescription(name, brand, specs);
            case 'RAM':
                return generateRAMDescription(name, brand, specs);
            case 'Storage':
                return generateStorageDescription(name, brand, specs);
            case 'PSU':
                return generatePSUDescription(name, brand, specs);
            case 'Case':
                return generateCaseDescription(name, brand, specs);
            case 'Cooling':
                return generateCoolingDescription(name, brand, specs);
            case 'Monitor':
                return generateMonitorDescription(name, brand, specs);
            case 'Keyboard':
                return generateKeyboardDescription(name, brand, specs);
            case 'Mouse':
                return generateMouseDescription(name, brand, specs);
            case 'Headphones':
                return generateHeadphonesDescription(name, brand, specs);
            case 'Speakers':
                return generateSpeakersDescription(name, brand, specs);
            case 'Webcam':
                return generateWebcamDescription(name, brand, specs);
            default:
                return `High-quality ${category} from ${brand || 'trusted manufacturer'} - ${name}`;
        }
    } catch (error) {
        logger.error(`Error generating description for ${name}:`, error);
        return `Quality ${category.toLowerCase()} component from ${brand || 'trusted manufacturer'}`;
    }
}

function generateCPUDescription(name, brand, specs) {
    const cores = specs.cores || '';
    const threads = specs.threads || '';
    const socket = specs.socket || '';
    const baseClock = specs.base_clock || '';
    
    let desc = `${cores}-core ${threads}-thread processor`;
    if (baseClock) desc += ` with ${baseClock} base clock`;
    if (socket) desc += ` for ${socket} socket`;
    desc += `. Ideal for gaming and productivity tasks.`;
    
    return desc;
}

function generateGPUDescription(name, brand, specs) {
    const memorySize = specs.memory_size || '';
    const memoryType = specs.memory_type || '';
    const interface_type = specs.interface || '';
    
    let desc = `High-performance graphics card`;
    if (memorySize && memoryType) desc += ` with ${memorySize} ${memoryType} memory`;
    else if (memorySize) desc += ` with ${memorySize} memory`;
    if (interface_type) desc += ` using ${interface_type} interface`;
    desc += `. Perfect for gaming and creative workloads.`;
    
    return desc;
}

function generateMotherboardDescription(name, brand, specs) {
    const socket = specs.socket || '';
    const chipset = specs.chipset || '';
    const formFactor = specs.form_factor || '';
    
    let desc = `${formFactor || 'High-quality'} motherboard`;
    if (chipset) desc += ` with ${chipset} chipset`;
    if (socket) desc += ` supporting ${socket} processors`;
    desc += `. Reliable platform for your build.`;
    
    return desc;
}

function generateRAMDescription(name, brand, specs) {
    const type = specs.type || '';
    const speed = specs.speed || '';
    const capacity = specs.capacity || '';
    
    let desc = `${capacity || 'High-capacity'} ${type || 'DDR4'} memory module`;
    if (speed) desc += ` running at ${speed}`;
    desc += `. Enhance your system's multitasking performance.`;
    
    return desc;
}

function generateStorageDescription(name, brand, specs) {
    const type = specs.type || '';
    const capacity = specs.capacity || '';
    const interface_type = specs.interface || '';
    const formFactor = specs.form_factor || '';
    
    let desc = `${capacity || 'Large-capacity'} ${type || 'storage'} drive`;
    if (interface_type) desc += ` with ${interface_type} interface`;
    if (formFactor) desc += ` in ${formFactor} form factor`;
    desc += `. Fast and reliable storage solution.`;
    
    return desc;
}

function generatePSUDescription(name, brand, specs) {
    const wattage = specs.wattage || '';
    const efficiency = specs.efficiency || '';
    const modular = specs.modular || '';
    
    let desc = `${wattage || 'High-power'} power supply`;
    if (efficiency) desc += ` with ${efficiency} efficiency rating`;
    if (modular === 'Fully Modular' || modular === 'Semi-Modular') desc += `, ${modular.toLowerCase()}`;
    desc += `. Reliable power delivery for your system.`;
    
    return desc;
}

function generateCaseDescription(name, brand, specs) {
    const formFactor = specs.form_factor || '';
    const color = specs.color || '';
    const sidePanel = specs.side_panel || '';
    
    let desc = `${formFactor || 'Premium'} PC case`;
    if (color) desc += ` in ${color}`;
    if (sidePanel) desc += ` with ${sidePanel.toLowerCase()} side panel`;
    desc += `. Excellent airflow and cable management.`;
    
    return desc;
}

function generateCoolingDescription(name, brand, specs) {
    const type = specs.type || '';
    const radiatorSize = specs.radiator_size || '';
    const fanSize = specs.fan_size || '';
    
    let desc = `${type || 'Efficient'} cooling solution`;
    if (radiatorSize) desc += ` with ${radiatorSize} radiator`;
    else if (fanSize) desc += ` with ${fanSize} fan`;
    desc += `. Keep your components running cool and quiet.`;
    
    return desc;
}

function generateMonitorDescription(name, brand, specs) {
    const size = specs.size || '';
    const resolution = specs.resolution || '';
    const refreshRate = specs.refresh_rate || '';
    
    let desc = `${size || 'High-quality'} display`;
    if (resolution) desc += ` with ${resolution} resolution`;
    if (refreshRate) desc += ` and ${refreshRate} refresh rate`;
    desc += `. Crystal clear visuals for gaming and work.`;
    
    return desc;
}

function generateKeyboardDescription(name, brand, specs) {
    const switchType = specs.switch_type || '';
    const backlight = specs.backlight || '';
    
    let desc = `${switchType || 'Premium'} mechanical keyboard`;
    if (backlight) desc += ` with ${backlight.toLowerCase()} backlighting`;
    desc += `. Responsive typing experience for gamers and professionals.`;
    
    return desc;
}

function generateMouseDescription(name, brand, specs) {
    const dpi = specs.dpi || '';
    const connectivity = specs.connectivity || '';
    
    let desc = `${connectivity || 'High-performance'} gaming mouse`;
    if (dpi) desc += ` with up to ${dpi} DPI`;
    desc += `. Precision control for gaming and productivity.`;
    
    return desc;
}

function generateHeadphonesDescription(name, brand, specs) {
    const connectionType = specs.connection_type || '';
    const surround = specs.surround || '';
    
    let desc = `${connectionType || 'Premium'} gaming headset`;
    if (surround) desc += ` with ${surround} audio`;
    desc += `. Immersive sound for gaming and entertainment.`;
    
    return desc;
}

function generateSpeakersDescription(name, brand, specs) {
    const channels = specs.channels || '';
    const power = specs.power || '';
    
    let desc = `${channels || 'High-quality'} speaker system`;
    if (power) desc += ` with ${power} total power`;
    desc += `. Rich audio for gaming and multimedia.`;
    
    return desc;
}

function generateWebcamDescription(name, brand, specs) {
    const resolution = specs.resolution || '';
    const fps = specs.fps || '';
    
    let desc = `${resolution || 'HD'} webcam`;
    if (fps) desc += ` at ${fps} FPS`;
    desc += `. Clear video for streaming and conferencing.`;
    
    return desc;
}

async function generateDescriptions() {
    try {
        console.log('🔍 Finding products with empty descriptions...\n');
        
        // Get all products with empty or null descriptions
        const result = await query(`
            SELECT id, name, category, brand, specifications
            FROM pc_parts
            WHERE is_active = true 
            AND (description IS NULL OR description = '')
            ORDER BY category, name
        `);
        
        if (result.rows.length === 0) {
            console.log('✅ All products already have descriptions!\n');
            return;
        }
        
        console.log(`📝 Found ${result.rows.length} products needing descriptions\n`);
        
        let updated = 0;
        let failed = 0;
        
        for (const item of result.rows) {
            try {
                const description = generateDescription(item);
                
                await query(
                    'UPDATE pc_parts SET description = $1 WHERE id = $2',
                    [description, item.id]
                );
                
                console.log(`✅ ${item.category} - ${item.name}`);
                console.log(`   "${description}"\n`);
                
                updated++;
            } catch (error) {
                console.error(`❌ Failed to update ${item.name}:`, error.message);
                failed++;
            }
        }
        
        console.log('\n✅ DESCRIPTION GENERATION COMPLETE!');
        console.log(`   Updated: ${updated}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Total: ${result.rows.length}\n`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run
generateDescriptions();

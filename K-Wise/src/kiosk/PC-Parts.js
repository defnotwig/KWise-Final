import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router-dom";
import "./PC-Parts.css";
import "./PCCustomized.css";
import "./PeripheralCategories.css"; // Import peripheral category styles
import PCWise from "../assets/PCWise.webp";
import Vector from "../assets/Vector (3).webp"
import Chest from "../assets/Chest.webp";
import Frame from "../assets/Frame 138.webp";
import { stockAPI } from "../services/api";
import api from "../api/api";
import realtimeKioskAPI from "../api/kioskAPI";
import { extractTopSpecFilters, formatSpecKey } from "../utils/topSpecifications"; // 🔥 TOP 5 SPECIFICATIONS
import logoComponent from "../assets/PCParts/logoComponent.svg";
import dropdown from "../assets/PCParts/dropdown.svg";
import filter from "../assets/PCParts/filter.svg";
import compare from "../assets/PCParts/compare.svg";
import deleteIcon from "../assets/PCParts/delete.svg";
import minusIcon from "../assets/PCParts/minus.svg";
import addIcon from "../assets/PCParts/add.svg";
import { normalizeKioskProduct } from "../utils/kioskContracts";
import KioskProductImage from "../components/KioskProductImage";

import monitor from "../assets/PCParts/monitor.svg";
import mouse from "../assets/PCParts/mouse.svg";
import headphone from "../assets/PCParts/headphone.svg";
import keyboard from "../assets/PCParts/keyboard.svg";
import speaker from "../assets/PCParts/speaker.svg";
import webcam from "../assets/PCParts/webcam.svg";
import cpucooler from "../assets/PCParts/cpucooler.svg";

const CompareProducts = React.lazy(() => import("./CompareProducts"));
const CompatibilityValidationModal = React.lazy(() => import("../components/CompatibilityValidationModal"));

// Component Images
import CPU1 from "../assets/CPU1.webp";
import COOLMANREYNA from "../assets/COOLMANREYNA.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import GPU1 from "../assets/GPU1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import PSU1 from "../assets/PSU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import Peripheral from "../assets/Peripheral.webp";

const Ryzen = CPU1;
const IntelCorei5 = CPU1;
const IntelCorei7 = CPU1;
const GigabyteMotherboard = Motherboard1;
const B550MK = Motherboard1;
const ASrockMotherboard = Motherboard1;
const AsusMotherboard = Motherboard1;
const RX550 = GPU1;
const RX580 = GPU1;
const RX6600 = GPU1;
const RX7600XT = GPU1;
const RX7700XT = GPU1;
const RX7800XT = GPU1;
const RTX4060 = GPU1;
const RTX4060Ti = GPU1;
const RTX4060TiColorful = GPU1;
const RTX4070 = GPU1;
const RTX4070Colorful = GPU1;
const GB8Team = Ram;
const GB16Team = Ram;
const GB16Kingston = Ram;
const GB16TForceDarkZa = Ram;
const GB16TFORCEBlack = Ram;
const GB16TFORCEWhite = Ram;
const GB32GSkillTridentZ = Ram;
const WDGREEN = Storage1;
const TFORCEVULCAN = Storage1;
const SAMSUNG870EVO = Storage1;
const WDBLUEGEN4 = Storage1;
const WDGREENGEN3 = Storage1;
const TEAMGROUPMP33PRO = Storage1;
const XPGSX8200PROGEN4 = Storage1;
const YGTKY750 = PSU1;
const COUGARSTC500 = PSU1;
const CORSAIRCX550 = PSU1;
const FSPVITAGM = PSU1;
const GIGABYTEP550SS = PSU1;
const GIGABYTEP550SSSILVERWhite = PSU1;
const YGTMARS8 = SystemUnit1;
const KEYTECHROBINLITE = SystemUnit1;
const KEYTECHROBINVIEW = SystemUnit1;
const INPLAYOPENVIEWV100 = SystemUnit1;
const PlayerMIKU2 = SystemUnit1;
const DARKFLASHDB330M = SystemUnit1;
const LIANLIO11DynamicMINI = SystemUnit1;
const LogitechG502HERO = Peripheral;
const RazerDeathAdderV2 = Peripheral;
const SteelSeriesApex3KL = Peripheral;
const HyperXAlloyOriginsCore = Peripheral;
const RazerBlackSharkV2X = Peripheral;
const LogitechG435Wireless = Peripheral;
const SteelSeriesQcKHeavyMousePad = Peripheral;
const HyperXPulsefireHaste = Peripheral;

const VERBOSE_KIOSK_LOGS = process.env.VITE_KWISE_VERBOSE_LOGS === 'true'
  || process.env.REACT_APP_KWISE_VERBOSE_LOGS === 'true';
const browserConsole = globalThis.console || {};
const console = VERBOSE_KIOSK_LOGS
  ? browserConsole
  : {
      log: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (...args) => browserConsole.error?.(...args)
    };
let cachedHomepageProducts = null;


// Sample Product Data (Replace with your database fetch logic)
// Helper component for enumerated spec values
// eslint-disable-next-line no-unused-vars
const SpecValueSelector = ({ category, field, value, onChange }) => {
  const [options, setOptions] = React.useState([]);
  React.useEffect(() => {
    if (!category || !field) return;
    let cancelled = false;
    stockAPI.getSpecValues(category, field)
      .then(res => {
        if (cancelled) return;
        const arr = (res.data && (res.data.data || res.data)) || [];
        setOptions(Array.isArray(arr) ? arr.filter(v => v != null && v !== '') : []);
      })
      .catch(() => setOptions([]));
    return () => { cancelled = true; };
  }, [category, field]);
  if (options.length === 0) {
    return (
      <input
        type="text"
        placeholder={`Enter ${field}`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    );
  }
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">All</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
};
SpecValueSelector.propTypes = {
  category: PropTypes.string,
  field: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
};
export const menuItems = [
  { name: "Home", image: Vector, category: "home" },
  {
    name: "Processor",
    image: CPU1,
    category: "CPU",
    products: [
      {
        name: "AMD RYZEN 3 3200G (AM4) (BOXED)",
        image: Ryzen,
        price: "PHP 3,495",
        details: "Entry-level quad-core APU with integrated Radeon Vega 8 graphics, ideal for budget builds and basic gaming.",
        specifications: "4 Cores | 4 Threads | 3.6 GHz Base | 4.0 GHz Boost | Radeon Vega 8 Graphics | 65W TDP | AM4 Socket"
      },
    {
      name: "AMD RYZEN 5 3400G (AM4) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 4,295",
      details: "A versatile APU with Vega 11 graphics, suitable for gaming and productivity without a discrete GPU.",
      specifications: "4 Cores | 8 Threads | 3.7 GHz Base | 4.2 GHz Boost | Radeon RX Vega 11 Graphics | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 5 5500 (AM4) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 4,985",
      details: "A 6-core processor for smooth gaming and multitasking, based on Zen 3 architecture.",
      specifications: "6 Cores | 12 Threads | 3.6 GHz Base | 4.2 GHz Boost | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 5 5600 (AM4) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 5,985",
      details: "Zen 3-based 6-core CPU for high-performance gaming and productivity.",
      specifications: "6 Cores | 12 Threads | 3.5 GHz Base | 4.4 GHz Boost | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 5 4600G (AM4) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 5,495",
      details: "APU with integrated Radeon graphics, perfect for budget gaming and office PCs.",
      specifications: "6 Cores | 12 Threads | 3.7 GHz Base | 4.2 GHz Boost | Radeon Graphics | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 5 5600GT (AM4) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 7,185",
      details: "High-performance 6-core CPU with integrated graphics, great for gaming and creative work.",
      specifications: "6 Cores | 12 Threads | 3.9 GHz Base | 4.4 GHz Boost | Radeon Graphics | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 7 5700X (AM4) (TTP)",
      image: Ryzen,
      price: "PHP 7,895",
      details: "8-core, 16-thread CPU for demanding gaming and content creation tasks.",
      specifications: "8 Cores | 16 Threads | 3.4 GHz Base | 4.6 GHz Boost | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 7 5700G (AM4) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 8,495",
      details: "Powerful APU with 8 cores and integrated Radeon graphics for all-around performance.",
      specifications: "8 Cores | 16 Threads | 3.8 GHz Base | 4.6 GHz Boost | Radeon Graphics | 65W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 7 5700X3D (AM4) (TTP)",
      image: Ryzen,
      price: "PHP 11,995",
      details: "Advanced gaming processor with 3D V-Cache for enhanced gaming performance.",
      specifications: "8 Cores | 16 Threads | 3.0 GHz Base | 4.1 GHz Boost | 96MB L3 Cache | 105W TDP | AM4 Socket"
    },
    {
      name: "AMD RYZEN 5 8400F (AM5) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 8,495",
      details: "Latest 6-core Zen 4 CPU for AM5 platform, ideal for gaming and multitasking.",
      specifications: "6 Cores | 12 Threads | 4.2 GHz Base | 4.7 GHz Boost | 65W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 5 7600 (AM5) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 10,495",
      details: "Zen 4 CPU with high clock speeds and efficiency for next-gen gaming.",
      specifications: "6 Cores | 12 Threads | 3.8 GHz Base | 5.1 GHz Boost | 65W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 7 8700F (AM5) (TTP) W/ AMD COOLER",
      image: Ryzen,
      price: "PHP 11,495",
      details: "8-core Zen 4 processor for AM5, designed for gaming and productivity.",
      specifications: "8 Cores | 16 Threads | 4.1 GHz Base | 5.0 GHz Boost | 65W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 7 7700 (AM5) (TTP)",
      image: Ryzen,
      price: "PHP 12,750",
      details: "High-end Zen 4 CPU for AM5, perfect for gaming and creative workloads.",
      specifications: "8 Cores | 16 Threads | 3.8 GHz Base | 5.3 GHz Boost | 65W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 5 8600G (AM5) (BOXED)",
      image: Ryzen,
      price: "PHP 12,750",
      details: "Zen 4 APU with integrated Radeon 760M graphics for entry-level gaming.",
      specifications: "6 Cores | 12 Threads | 4.3 GHz Base | 5.0 GHz Boost | Radeon 760M Graphics | 65W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 7 8700G (AM5) (BOXED)",
      image: Ryzen,
      price: "PHP 17,830",
      details: "Top-tier APU with 8 cores and Radeon 780M graphics for gaming without a discrete GPU.",
      specifications: "8 Cores | 16 Threads | 4.2 GHz Base | 5.1 GHz Boost | Radeon 780M Graphics | 65W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 7 9700x (AM5) (BOXED)",
      image: Ryzen,
      price: "PHP 23,320",
      details: "High-performance Zen 5 CPU for enthusiasts and creators.",
      specifications: "8 Cores | 16 Threads | 3.8 GHz Base | 5.5 GHz Boost | 120W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 9 9900x (AM5) (BOXED)",
      image: Ryzen,
      price: "PHP 28,630",
      details: "Flagship 12-core Zen 5 processor for extreme gaming and workstation use.",
      specifications: "12 Cores | 24 Threads | 4.4 GHz Base | 5.6 GHz Boost | 120W TDP | AM5 Socket"
    },
    {
      name: "AMD RYZEN 7 9800X3D (AM5) (BOXED)",
      image: Ryzen,
      price: "PHP 32,995",
      details: "Zen 5 CPU with 3D V-Cache for ultimate gaming performance.",
      specifications: "8 Cores | 16 Threads | 4.0 GHz Base | 5.6 GHz Boost | 96MB L3 Cache | 120W TDP | AM5 Socket"
    },
    {
      name: "Intel Core i5 12400F *12th GEN (BOX TYPE)",
      image: IntelCorei5,
      price: "PHP 7,480",
      details: "12th Gen Intel Core i5 with 6 performance cores, great for gaming and productivity.",
      specifications: "6 Cores | 12 Threads | 2.5 GHz Base | 4.4 GHz Boost | 65W TDP | LGA 1700 Socket"
    },
    {
      name: "Intel Core i5 12400 *12th GEN (BOX TYPE)",
      image: IntelCorei5,
      price: "PHP 8,495",
      details: "12th Gen i5 with integrated UHD 730 graphics, suitable for office and light gaming.",
      specifications: "6 Cores | 12 Threads | 2.5 GHz Base | 4.4 GHz Boost | UHD 730 Graphics | 65W TDP | LGA 1700 Socket"
    },
    {
      name: "Intel Core i5 14400F *14th GEN (BOX TYPE)",
      image: IntelCorei5,
      price: "PHP 9,370",
      details: "Latest 14th Gen i5 with hybrid architecture for improved efficiency and performance.",
      specifications: "10 Cores (6P+4E) | 16 Threads | 2.5 GHz Base | 4.7 GHz Boost | 65W TDP | LGA 1700 Socket"
    },
    {
      name: "Intel Core i5 14400 *14th GEN (BOX TYPE)",
      image: IntelCorei5,
      price: "PHP 11,190",
      details: "14th Gen i5 with integrated graphics, ideal for modern office and gaming PCs.",
      specifications: "10 Cores (6P+4E) | 16 Threads | 2.5 GHz Base | 4.7 GHz Boost | UHD 730 Graphics | 65W TDP | LGA 1700 Socket"
    },
    {
      name: "Intel Core i7 14700F *14th GEN (BOX TYPE)",
      image: IntelCorei7,
      price: "PHP 19,090",
      details: "High-end 14th Gen i7 with 20 cores for advanced gaming and multitasking.",
      specifications: "20 Cores (8P+12E) | 28 Threads | 2.1 GHz Base | 5.4 GHz Boost | 65W TDP | LGA 1700 Socket"
    },
    {
      name: "Intel Core i7 14700 *14th GEN (BOX TYPE)",
      image: IntelCorei7,
      price: "PHP 20,499",
      details: "14th Gen i7 with integrated graphics, perfect for high-end desktops.",
      specifications: "20 Cores (8P+12E) | 28 Threads | 2.1 GHz Base | 5.4 GHz Boost | UHD 770 Graphics | 65W TDP | LGA 1700 Socket"
    }
  ]
},
{
  name: "CPU Cooler",
  image: cpucooler,
  category: "Cooling",
  products: [
    // Air Coolers
    {
      name: "DEEPCOOL Intel (Intel 1st - 11th Gen)",
      image: COOLMANREYNA,
      price: "PHP 250",
      details: "Basic Deepcool air cooler for Intel 1st to 11th Gen CPUs.",
      specifications: "Compatible with Intel 1st-11th Gen | Air Cooler"
    },
    {
      name: "DEEPCOOL AMD (AM3 / AM4)",
      image: COOLMANREYNA,
      price: "PHP 250",
      details: "Basic Deepcool air cooler for AMD AM3 and AM4 sockets.",
      specifications: "Compatible with AMD AM3/AM4 | Air Cooler"
    },
    {
      name: "DEEPCOOL GAMMAX AG200",
      image: COOLMANREYNA,
      price: "PHP 790",
      details: "Compact air cooler for mainstream CPUs.",
      specifications: "Single Tower | 120mm Fan | Universal Socket Support"
    },
    {
      name: "DEEPCOOL GAMMAX AG300",
      image: COOLMANREYNA,
      price: "PHP 960",
      details: "Efficient air cooler for better thermal performance.",
      specifications: "Single Tower | 120mm Fan | Universal Socket Support"
    },
    {
      name: "DEEPCOOL GAMMAX 400 V2 RED (SALE)",
      image: COOLMANREYNA,
      price: "PHP 899",
      details: "Popular air cooler with red LED fan, on sale.",
      specifications: "Single Tower | 120mm Red LED Fan | Universal Socket Support"
    },
    {
      name: "DEEPCOOL AK400 (Black)",
      image: COOLMANREYNA,
      price: "PHP 1,499",
      details: "High-performance black air cooler for gaming CPUs.",
      specifications: "Single Tower | 120mm Fan | Black | Universal Socket Support"
    },
    {
      name: "DEEPCOOL AK400 (White)",
      image: COOLMANREYNA,
      price: "PHP 1,595",
      details: "High-performance white air cooler for gaming CPUs.",
      specifications: "Single Tower | 120mm Fan | White | Universal Socket Support"
    },
    {
      name: "DEEPCOOL AK400 (Pink)",
      image: COOLMANREYNA,
      price: "PHP 1,998",
      details: "High-performance pink air cooler for gaming CPUs.",
      specifications: "Single Tower | 120mm Fan | Pink | Universal Socket Support"
    },
    {
      name: "DEEPCOOL AG500 DIGITAL (Black)",
      image: COOLMANREYNA,
      price: "PHP 2,195",
      details: "Digital display air cooler, black edition.",
      specifications: "Dual Tower | Digital Display | Black | Universal Socket Support"
    },
    {
      name: "DEEPCOOL AG500 DIGITAL (White)",
      image: COOLMANREYNA,
      price: "PHP 2,295",
      details: "Digital display air cooler, white edition.",
      specifications: "Dual Tower | Digital Display | White | Universal Socket Support"
    },
    {
      name: "DEEPCOOL AK500 (Black)",
      image: COOLMANREYNA,
      price: "PHP 2,650",
      details: "High-end black air cooler for powerful CPUs.",
      specifications: "Single Tower | 120mm Fan | Black | Universal Socket Support"
    },

    // AIO Liquid Coolers
    {
      name: "Darkflash Nebula DN-240 AIO 240 (Black/White)",
      image: COOLMANREYNA,
      price: "PHP 3,480",
      details: "240mm AIO liquid cooler, available in black or white.",
      specifications: "240mm Radiator | Dual 120mm Fans | Black/White"
    },
    {
      name: "Darkflash Nebula DN-360 AIO 360 (Black/White)",
      image: COOLMANREYNA,
      price: "PHP 4,180",
      details: "360mm AIO liquid cooler, available in black or white.",
      specifications: "360mm Radiator | Triple 120mm Fans | Black/White"
    },
    {
      name: "THERMALRIGHT FROZEN WARFRAME 240 DIGITAL",
      image: COOLMANREYNA,
      price: "PHP 4,799",
      details: "240mm AIO with digital display and RGB.",
      specifications: "240mm Radiator | Digital Display | RGB"
    },
    {
      name: "DEEPCOOL LE520 AIO 240 (Black)",
      image: COOLMANREYNA,
      price: "PHP 3,799",
      details: "240mm AIO liquid cooler, black edition.",
      specifications: "240mm Radiator | Dual 120mm Fans | Black"
    },
    {
      name: "DEEPCOOL LE520 AIO 240 (White)",
      image: COOLMANREYNA,
      price: "PHP 3,999",
      details: "240mm AIO liquid cooler, white edition.",
      specifications: "240mm Radiator | Dual 120mm Fans | White"
    },
    {
      name: "DEEPCOOL LS520 SE AIO 240 DIGITAL (Black)",
      image: COOLMANREYNA,
      price: "PHP 5,499",
      details: "Premium 240mm AIO with digital display.",
      specifications: "240mm Radiator | Digital Display | Black"
    },
    {
      name: "DEEPCOOL MYSTIQUE AIO 360 (Black)",
      image: COOLMANREYNA,
      price: "PHP 8,995",
      details: "High-end 360mm AIO liquid cooler, black edition.",
      specifications: "360mm Radiator | Digital Display | Black"
    },
    {
      name: "DEEPCOOL MYSTIQUE AIO 360 (White)",
      image: COOLMANREYNA,
      price: "PHP 9,499",
      details: "High-end 360mm AIO liquid cooler, white edition.",
      specifications: "360mm Radiator | Digital Display | White"
    }
  ]
},
// NOTE: Removed standalone Monitor category to ensure it appears only under Peripherals grouping (dynamic from backend)
{
  name: "Motherboard",
  image: Motherboard1,
  category: "Motherboard",
  products: [
    {
      name: "RAMSTA B450M-P",
      image: GigabyteMotherboard,
      price: "PHP 2,999",
      details: "Budget AM4 microATX motherboard for Ryzen CPUs, ideal for entry-level builds.",
      specifications: "MicroATX | AM4 Socket | 2x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.1"
    },
    {
      name: "GIGABYTE A520M-K V2",
      image: GigabyteMotherboard,
      price: "PHP 3,499",
      details: "Affordable A520 chipset motherboard for Ryzen 3rd/4th Gen CPUs.",
      specifications: "MicroATX | AM4 Socket | 2x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2"
    },
    {
      name: "GIGABYTE B450M-K",
      image: GigabyteMotherboard,
      price: "PHP 3,799",
      details: "A budget-friendly microATX motherboard supporting AMD Ryzen processors with basic connectivity.",
      specifications: "MicroATX | AM4 Socket | 2x DDR4 Slots (up to 32GB) | PCIe 3.0 | HDMI | USB 3.1"
    },
    {
      name: "GIGABYTE B450M DS3H V3",
      image: GigabyteMotherboard,
      price: "PHP 4,199",
      details: "A solid microATX motherboard with extended durability and hybrid digital VRM design.",
      specifications: "MicroATX | AM4 Socket | 4x DDR4 Slots (up to 64GB) | PCIe 3.0 | USB 3.1 | HDMI/DVI"
    },
    {
      name: "GIGABYTE A520M DS3H",
      image: GigabyteMotherboard,
      price: "PHP 3,995",
      details: "Affordable A520 chipset motherboard for Ryzen CPUs, supports up to 64GB RAM.",
      specifications: "MicroATX | AM4 Socket | 4x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2"
    },
    {
      name: "GIGABYTE A520M DS3H AC *WIFI *Bluetooth",
      image: GigabyteMotherboard,
      price: "PHP 4,999",
      details: "A520 motherboard with built-in WiFi and Bluetooth for wireless connectivity.",
      specifications: "MicroATX | AM4 Socket | 4x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2 | WiFi | Bluetooth"
    },
    {
      name: "GIGABYTE B550M-K",
      image: B550MK,
      price: "PHP 5,199",
      details: "Entry-level B550 motherboard with PCIe 4.0 support for Ryzen 3000/5000 CPUs.",
      specifications: "MicroATX | AM4 Socket | 2x DDR4 Slots | PCIe 4.0 | HDMI | USB 3.2"
    },
    {
      name: "AORUS ELITE B550M AX *WIFI *Bluetooth",
      image: ASrockMotherboard,
      price: "PHP 7,699",
      details: "Feature-rich B550 motherboard with WiFi, Bluetooth, and reinforced PCIe slots.",
      specifications: "MicroATX | AM4 Socket | 4x DDR4 Slots | PCIe 4.0 | USB 3.2 | WiFi | Bluetooth"
    },
    // AMD (AM5 / DDR5) MOTHERBOARD
    {
      name: "GIGABYTE B650M GAMING *WIFI *Bluetooth",
      image: GigabyteMotherboard,
      price: "PHP 7,199",
      details: "AM5 motherboard with WiFi and Bluetooth, ready for next-gen Ryzen CPUs.",
      specifications: "MicroATX | AM5 Socket | 4x DDR5 Slots | PCIe 5.0 | USB 3.2 | WiFi | Bluetooth"
    },
    {
      name: "GIGABYTE B650M K",
      image: GigabyteMotherboard,
      price: "PHP 7,490",
      details: "Affordable AM5 motherboard for DDR5 memory and Ryzen 7000 series CPUs.",
      specifications: "MicroATX | AM5 Socket | 2x DDR5 Slots | PCIe 4.0 | HDMI | USB 3.2"
    },
    {
      name: "ASUS TUF GAMING A620M-PLUS *WIFI *Bluetooth",
      image: AsusMotherboard,
      price: "PHP 8,899",
      details: "Durable AM5 motherboard with WiFi, Bluetooth, and gaming features.",
      specifications: "MicroATX | AM5 Socket | 4x DDR5 Slots | PCIe 4.0 | USB 3.2 | WiFi | Bluetooth"
    },
    {
      name: "GIGABYTE GA-B650M-D3HP-AX *WIFI *Bluetooth",
      image: GigabyteMotherboard,
      price: "PHP 8,999",
      details: "AM5 motherboard with advanced connectivity and wireless features.",
      specifications: "MicroATX | AM5 Socket | 4x DDR5 Slots | PCIe 4.0 | USB 3.2 | WiFi | Bluetooth"
    },
    {
      name: "GIGABYTE B650 EAGLE-AX *WIFI *Bluetooth",
      image: GigabyteMotherboard,
      price: "PHP 10,495",
      details: "High-end AM5 motherboard with WiFi, Bluetooth, and robust power delivery.",
      specifications: "MicroATX | AM5 Socket | 4x DDR5 Slots | PCIe 5.0 | USB 3.2 | WiFi | Bluetooth"
    },
    {
      name: "AORUS B650M ELITE AX ICE *WIFI *Bluetooth *WHITE",
      image: ASrockMotherboard,
      price: "PHP 12,490",
      details: "Premium white AM5 motherboard with WiFi, Bluetooth, and gaming aesthetics.",
      specifications: "MicroATX | AM5 Socket | 4x DDR5 Slots | PCIe 5.0 | USB 3.2 | WiFi | Bluetooth | White"
    },
    {
      name: "AORUS B650 ELITE AX V2 *WIFI *Bluetooth",
      image: ASrockMotherboard,
      price: "PHP 12,600",
      details: "Elite AM5 motherboard with advanced wireless and gaming features.",
      specifications: "MicroATX | AM5 Socket | 4x DDR5 Slots | PCIe 5.0 | USB 3.2 | WiFi | Bluetooth"
    },
    {
      name: "GIGABYTE X870 GAMING *WIFI *Bluetooth",
      image: GigabyteMotherboard,
      price: "PHP 13,995",
      details: "Top-tier AM5 motherboard for enthusiasts, with WiFi and Bluetooth.",
      specifications: "ATX | AM5 Socket | 4x DDR5 Slots | PCIe 5.0 | USB 3.2 | WiFi | Bluetooth"
    },
    // Intel Motherboards
    {
      name: "RAMSTA H310M Support *6,7,8,9th GEN",
      image: GigabyteMotherboard,
      price: "PHP 3,499",
      details: "Entry-level Intel motherboard supporting 6th to 9th Gen CPUs.",
      specifications: "MicroATX | LGA 1151 | 2x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.0"
    },
    {
      name: "RAMSTA H510M Support *10-11th GEN",
      image: GigabyteMotherboard,
      price: "PHP 3,399",
      details: "Budget Intel motherboard for 10th and 11th Gen Core processors.",
      specifications: "MicroATX | LGA 1200 | 2x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2"
    },
    {
      name: "GIGABYTE H510M-H (DDR4) *10-11th GEN",
      image: GigabyteMotherboard,
      price: "PHP 3,995",
      details: "Reliable Intel motherboard for 10th/11th Gen CPUs with DDR4 support.",
      specifications: "MicroATX | LGA 1200 | 2x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2"
    },
    {
      name: "GIGABYTE H610M-H (DDR4) *12-14th GEN",
      image: GigabyteMotherboard,
      price: "PHP 4,999",
      details: "Intel motherboard for 12th to 14th Gen CPUs, supports DDR4 memory.",
      specifications: "MicroATX | LGA 1700 | 2x DDR4 Slots | PCIe 4.0 | HDMI | USB 3.2"
    },
    {
      name: "ASUS PRIME H610M-K (DDR5)*12-14th GEN",
      image: AsusMotherboard,
      price: "PHP 5,995",
      details: "Intel motherboard for 12th-14th Gen CPUs with DDR5 support.",
      specifications: "MicroATX | LGA 1700 | 2x DDR5 Slots | PCIe 4.0 | HDMI | USB 3.2"
    },
    {
      name: "ASUS ROG STRIX B460-F GAMING *10th GEN",
      image: AsusMotherboard,
      price: "PHP 6,495",
      details: "Gaming motherboard for Intel 10th Gen CPUs with robust features.",
      specifications: "ATX | LGA 1200 | 4x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2"
    },
    {
      name: "ASUS ROG STRIX Z490-E GAMING *10th-11TH GEN",
      image: AsusMotherboard,
      price: "PHP 7,995",
      details: "High-end gaming motherboard for Intel 10th/11th Gen CPUs.",
      specifications: "ATX | LGA 1200 | 4x DDR4 Slots | PCIe 3.0 | HDMI | USB 3.2"
    }
  ],
  brands: ["ASUS", "MSI", "Gigabyte", "ASRock", "RAMSTA"]
},
{
  name: "GPU",
  image: GPU1,
  category: "GPU",
  products: [
    {
      name: "4GB RX550 RAMSTA *SINGLE FAN",
      image: RX550,
      price: "PHP 4,995",
      details: "Entry-level AMD graphics card with single fan cooling, ideal for basic gaming and multimedia.",
      specifications: "4GB GDDR5 | Single Fan | 128-bit | 1183 MHz Core Clock | DirectX 12 | HDMI/DVI/DP | IN STOCK"
    },
    {
      name: "8GB RX580 XFX GTS XXX Edition *(DUALFAN)",
      image: RX580,
      price: "PHP 6,995",
      details: "Mid-range AMD GPU with dual fan cooling for smooth 1080p gaming.",
      specifications: "8GB GDDR5 | Dual Fan | 256-bit | 1366 MHz Boost Clock | DirectX 12 | 1x HDMI, 3x DP, 1x DVI | IN STOCK"
    },
    {
      name: "8GB RX6600 ASROCK CHALLENGER *(DUALFAN)",
      image: RX6600,
      price: "PHP 13,495",
      details: "Efficient RDNA2 GPU with dual fan cooling, great for 1080p high settings.",
      specifications: "8GB GDDR6 | Dual Fan | 128-bit | 2491 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | IN STOCK"
    },
    {
      name: "8GB RX6600 GIGABYTE EAGLE *TRI FAN",
      image: RX6600,
      price: "PHP 13,799",
      details: "Triple fan RX6600 for enhanced cooling and quiet operation.",
      specifications: "8GB GDDR6 | Triple Fan | 128-bit | 2491 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | IN STOCK"
    },
    {
      name: "16GB RX7600XT GIGABYTE GAMING OC *TRI FAN",
      image: RX7600XT,
      price: "PHP 23,995",
      details: "High-performance 16GB GPU with triple fan cooling for demanding games.",
      specifications: "16GB GDDR6 | Triple Fan | 128-bit | 2755 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | IN STOCK"
    },
    {
      name: "12GB RX7700XT GIGABYTE GAMING OC *TRI FAN",
      image: RX7700XT,
      price: "PHP 27,995",
      details: "Powerful 1440p gaming GPU with triple fan design. SOLD OUT.",
      specifications: "12GB GDDR6 | Triple Fan | 192-bit | 2544 MHz Boost Clock | PCIe 4.0 | 2x HDMI, 2x DP | SOLD OUT"
    },
    {
      name: "16GB RX7800XT SAPPHIRE PURE *TRI FAN *White",
      image: RX7800XT,
      price: "PHP 33,795",
      details: "Premium white triple fan GPU for high-end gaming and content creation.",
      specifications: "16GB GDDR6 | Triple Fan | 256-bit | 2430 MHz Boost Clock | PCIe 4.0 | 2x HDMI, 2x DP | IN STOCK"
    },
    {
      name: "16GB RX7800XT GIGABYTE GAMING OC *TRI FAN",
      image: RX7800XT,
      price: "PHP 33,995",
      details: "Triple fan RX7800XT for top-tier 1440p gaming performance.",
      specifications: "16GB GDDR6 | Triple Fan | 256-bit | 2430 MHz Boost Clock | PCIe 4.0 | 2x HDMI, 2x DP | IN STOCK"
    },
    {
      name: "8GB RTX4060 GALAX 1-Click OC 2X *(DUALFAN)",
      image: RTX4060,
      price: "PHP 17,795",
      details: "NVIDIA Ada Lovelace GPU with dual fan cooling and 1-Click OC feature.",
      specifications: "8GB GDDR6 | Dual Fan | 128-bit | 2460 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | IN STOCK"
    },
    {
      name: "8GB RTX4060 GIGABYTE EAGLE *TRI FAN",
      image: RTX4060,
      price: "PHP 19,995",
      details: "Triple fan RTX4060 for efficient cooling and quiet operation.",
      specifications: "8GB GDDR6 | Triple Fan | 128-bit | 2460 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 2x DP | IN STOCK"
    },
    {
      name: "8GB RTX4060 GIGABYTE EAGLE ICE *TRI FAN *WHITE",
      image: RTX4060,
      price: "PHP 20,495",
      details: "White edition RTX4060 with triple fan cooling for stylish builds.",
      specifications: "8GB GDDR6 | Triple Fan | 128-bit | 2460 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 2x DP | White | IN STOCK"
    },
    {
      name: "8GB RTX4060Ti GIGABYTE EAGLE *TRI FAN",
      image: RTX4060Ti,
      price: "PHP 24,999",
      details: "Triple fan RTX4060Ti for advanced gaming and creative workloads. SOLD OUT.",
      specifications: "8GB GDDR6 | Triple Fan | 128-bit | 2535 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 2x DP | SOLD OUT"
    },
    {
      name: "8GB RTX4060Ti GIGABYTE EAGLE ICE *WHITE(TRI FAN)",
      image: RTX4060Ti,
      price: "PHP 25,999",
      details: "White triple fan RTX4060Ti for high-performance and aesthetics. SOLD OUT.",
      specifications: "8GB GDDR6 | Triple Fan | 128-bit | 2535 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 2x DP | White | SOLD OUT"
    },
    {
      name: "8GB RTX4060Ti Colorful NB DUO",
      image: RTX4060TiColorful,
      price: "PHP 22,999",
      details: "Colorful NB DUO RTX4060Ti with dual fan cooling for efficient gaming.",
      specifications: "8GB GDDR6 | Dual Fan | 128-bit | 2535 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | IN STOCK"
    },
    {
      name: "8GB RTX4060Ti IGAME ULTRA OC *WHITE(TRI FAN)",
      image: RTX4060TiColorful,
      price: "PHP 24,995",
      details: "White triple fan IGAME ULTRA OC for advanced gaming and overclocking.",
      specifications: "8GB GDDR6 | Triple Fan | 128-bit | 2580 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | White | IN STOCK"
    },
    {
      name: "12GB RTX4070 GALAX 1-Click OC 2X *(DUALFAN)",
      image: RTX4070,
      price: "PHP 33,995",
      details: "High-end RTX4070 with dual fan cooling and 1-Click OC for smooth 1440p gaming.",
      specifications: "12GB GDDR6X | Dual Fan | 192-bit | 2475 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | IN STOCK"
    },
    {
      name: "12GB RTX4070 IGAME ULTRA OC*WHITE(TRI FAN)",
      image: RTX4070Colorful,
      price: "PHP 34,695",
      details: "Premium white triple fan RTX4070 for top-tier gaming and creative work.",
      specifications: "12GB GDDR6X | Triple Fan | 192-bit | 2505 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | White | IN STOCK"
    },
    {
      name: "16GB RTX4070Ti Super IGAME ULTRA W OC *WHITE(TRI FAN)",
      image: RTX4070Colorful,
      price: "PHP 48,495",
      details: "Flagship RTX4070Ti Super with white triple fan cooling for ultimate performance.",
      specifications: "16GB GDDR6X | Triple Fan | 256-bit | 2655 MHz Boost Clock | PCIe 4.0 | 1x HDMI, 3x DP | White | IN STOCK"
    }
  ],
  brands: ["NVIDIA", "AMD", "ASRock", "Gigabyte", "Sapphire", "Colorful", "GALAX"]
},
{
  name: "RAM",
  image: Ram,
  category: "RAM",
  products: [
    {
      name: "8GB Team Elite Plus DDR4 3200MHz",
      image: GB8Team,
      price: "PHP 1,199",
      details: "An affordable DDR4 memory stick ideal for budget gaming and office use.",
      specifications: "8GB DDR4 | 3200MHz | CL22 | 1.2V | Non-ECC | Unbuffered"
    },
    {
      name: "16GB Team Elite Plus DDR4 3200MHz",
      image: GB16Team,
      price: "PHP 2,199",
      details: "A single-stick high-speed memory designed for multitasking and gaming.",
      specifications: "16GB DDR4 | 3200MHz | CL22 | 1.2V | Non-ECC | Unbuffered"
    },
    {
      name: "16GB Kingston Fury Beast DDR4 3200MHz",
      image: GB16Kingston,
      price: "PHP 2,399",
      details: "Reliable and durable RAM with Kingston’s Fury Beast design for enhanced cooling.",
      specifications: "16GB DDR4 | 3200MHz | CL16 | 1.35V | XMP 2.0 | Heat Spreader"
    },
    {
      name: "16GB T-Force DarkZa Kit (2x8GB) 3600MHz",
      image: GB16TForceDarkZa,
      price: "PHP 2,499",
      details: "Optimized for gaming and high-performance computing with fast speeds.",
      specifications: "16GB (2x8GB) DDR4 | 3600MHz | CL18 | 1.35V | XMP 2.0 | Heat Spreader"
    },
    {
      name: "16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz Black",
      image: GB16TFORCEBlack,
      price: "PHP 3,195",
      details: "A stylish RGB RAM module certified by ASUS TUF Gaming Alliance.",
      specifications: "16GB (2x8GB) DDR4 | 3600MHz | CL18 | 1.35V | XMP 2.0 | RGB Lighting"
    },
    {
      name: "16GB T-FORCE DELTA RGB (2x8GB) 3600MHz White",
      image: GB16TFORCEWhite,
      price: "PHP 3,195",
      details: "An aesthetically pleasing white RAM with vibrant RGB lighting.",
      specifications: "16GB (2x8GB) DDR4 | 3600MHz | CL18 | 1.35V | XMP 2.0 | RGB Lighting"
    },
    {
      name: "32GB T-Force DarkZa Kit (2x16GB) 3600MHz",
      image: GB16TForceDarkZa,
      price: "PHP 3,995",
      details: "A dual-stick RAM kit for content creators and heavy multitasking.",
      specifications: "32GB (2x16GB) DDR4 | 3600MHz | CL18 | 1.35V | XMP 2.0 | Heat Spreader"
    },
    {
      name: "32GB T-FORCE DELTA RGB (2x16GB) 3600MHz Black",
      image: GB16TFORCEBlack,
      price: "PHP 4,995",
      details: "Premium high-capacity RGB RAM for gaming and workstation setups.",
      specifications: "32GB (2x16GB) DDR4 | 3600MHz | CL18 | 1.35V | XMP 2.0 | RGB Lighting"
    },
    {
      name: "32GB G.SKILL Trident Z RGB (2x16GB) 3600MHz",
      image: GB32GSkillTridentZ,
      price: "PHP 5,495",
      details: "High-performance RAM with aggressive heat spreaders and customizable RGB lighting.",
      specifications: "32GB (2x16GB) DDR4 | 3600MHz | CL16 | 1.35V | XMP 2.0 | RGB Lighting"
    },
    // DDR5 RAM
    {
      name: "16GB TEAM ELITE PLUS DDR5 5600 Gold",
      image: GB16Team,
      price: "PHP 2,895",
      details: "An entry-level DDR5 module with improved bandwidth and energy efficiency.",
      specifications: "16GB DDR5 | 5600MHz | CL46 | 1.1V | Non-ECC | Unbuffered"
    },
    {
      name: "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz Black",
      image: GB16TFORCEBlack,
      price: "PHP 3,395",
      details: "Fast DDR5 RAM with stunning RGB effects and high overclocking potential.",
      specifications: "16GB DDR5 | 6000MHz | CL36 | 1.35V | XMP 3.0 | RGB Lighting"
    },
    {
      name: "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz White",
      image: GB16TFORCEWhite,
      price: "PHP 3,495",
      details: "A high-speed DDR5 RAM module designed for next-gen performance.",
      specifications: "16GB DDR5 | 6000MHz | CL36 | 1.35V | XMP 3.0 | RGB Lighting"
    },
    {
      name: "32GB T-FORCE DELTA RGB Kit (2x16GB) 6400MHz Black",
      image: GB16TFORCEBlack,
      price: "PHP 7,499",
      details: "A top-tier RAM kit for overclocking and extreme gaming performance.",
      specifications: "32GB (2x16GB) DDR5 | 6400MHz | CL32 | 1.4V | XMP 3.0 | RGB Lighting"
    },
    {
      name: "32GB T-FORCE DELTA RGB Kit (2x16GB) 6400MHz White",
      image: GB16TFORCEWhite,
      price: "PHP 7,699",
      details: "Premium white DDR5 RAM kit for high-end gaming and creative workstations.",
      specifications: "32GB (2x16GB) DDR5 | 6400MHz | CL32 | 1.4V | XMP 3.0 | RGB Lighting"
    }
  ],
  brands: ["Corsair", "Kingston", "G.Skill", "TeamGroup"]
},
{
  name: "Storage",
  image: Storage1,
  category: "Storage",
  products: [
    {
      name: "240GB Western Digital GREEN",
      image: WDGREEN,
      price: "PHP 1,499",
      details: "Reliable and affordable SATA SSD for everyday computing needs.",
      specifications: "240GB SATA III | Read: 545MB/s | Write: 465MB/s | 2.5-inch | 3D NAND"
    },
    {
      name: "256GB T-FORCE VULCAN Z",
      image: TFORCEVULCAN,
      price: "PHP 1,399",
      details: "A budget-friendly SATA SSD with solid performance for general computing.",
      specifications: "256GB SATA III | Read: 550MB/s | Write: 500MB/s | 2.5-inch | 3D NAND"
    },
    {
      name: "512GB T-FORCE VULCAN Z",
      image: TFORCEVULCAN,
      price: "PHP 2,449",
      details: "A larger capacity SATA SSD offering reliable speeds and durability.",
      specifications: "512GB SATA III | Read: 550MB/s | Write: 500MB/s | 2.5-inch | 3D NAND"
    },
    {
      name: "500GB SAMSUNG 870 EVO",
      image: SAMSUNG870EVO,
      price: "PHP 3,199",
      details: "One of the best SATA SSDs for performance and reliability.",
      specifications: "500GB SATA III | Read: 560MB/s | Write: 530MB/s | 2.5-inch | 3D V-NAND"
    },
    {
      name: "1TB T-FORCE VULCAN Z",
      image: TFORCEVULCAN,
      price: "PHP 3,799",
      details: "High-capacity SATA SSD for gaming and productivity workloads.",
      specifications: "1TB SATA III | Read: 550MB/s | Write: 500MB/s | 2.5-inch | 3D NAND"
    },
    // M.2 NVMe
    {
      name: "500GB WESTERN DIGITAL SN3000 GEN4",
      image: WDBLUEGEN4,
      price: "PHP 2,995",
      details: "Gen4 NVMe SSD for faster boot and load times.",
      specifications: "500GB NVMe PCIe Gen4 | Read: 4000MB/s | Write: 3500MB/s | M.2 2280"
    },
    {
      name: "500GB WESTERN DIGITAL BLUE GEN4",
      image: WDBLUEGEN4,
      price: "PHP 3,295",
      details: "A Gen4 NVMe SSD delivering significant performance improvements over Gen3.",
      specifications: "500GB NVMe PCIe Gen4 | Read: 4100MB/s | Write: 2000MB/s | M.2 2280"
    },
    {
      name: "1TB WESTERN DIGITAL GREEN GEN3",
      image: WDGREENGEN3,
      price: "PHP 3,695",
      details: "A cost-effective NVMe SSD for faster data transfers than SATA drives.",
      specifications: "1TB NVMe PCIe Gen3 | Read: 3200MB/s | Write: 3000MB/s | M.2 2280"
    },
    {
      name: "2TB WESTERN DIGITAL GREEN GEN3",
      image: WDGREENGEN3,
      price: "PHP 7,495",
      details: "High-capacity NVMe SSD for large storage needs and fast performance.",
      specifications: "2TB NVMe PCIe Gen3 | Read: 3200MB/s | Write: 3000MB/s | M.2 2280"
    },
    {
      name: "250GB GIGABYTE 4000E GEN4",
      image: WDBLUEGEN4, // Replace with actual Gigabyte SSD image if available
      price: "PHP 1,499",
      details: "Entry-level Gen4 NVMe SSD for fast boot and application load times.",
      specifications: "250GB NVMe PCIe Gen4 | Read: 4000MB/s | Write: 1800MB/s | M.2 2280"
    },
    {
      name: "512GB TEAMGROUP MP33 PRO",
      image: TEAMGROUPMP33PRO,
      price: "PHP 2,699",
      details: "A budget NVMe SSD with decent speed improvements over SATA SSDs.",
      specifications: "512GB NVMe PCIe Gen3 | Read: 1700MB/s | Write: 1400MB/s | M.2 2280"
    },
    {
      name: "1TB XPG SX8200 PRO GEN4",
      image: XPGSX8200PROGEN4,
      price: "PHP 4,099",
      details: "A high-end Gen4 SSD delivering impressive speed for gaming and heavy workloads.",
      specifications: "1TB NVMe PCIe Gen4 | Read: 5000MB/s | Write: 4400MB/s | M.2 2280"
    },
    {
      name: "256GB ADATA LEGEND 710 W/HEATSINK",
      image: XPGSX8200PROGEN4, // Replace with actual ADATA LEGEND 710 image if available
      price: "PHP 1,599",
      details: "Compact NVMe SSD with heatsink for improved thermal performance.",
      specifications: "256GB NVMe PCIe Gen3 | Read: 2400MB/s | Write: 1800MB/s | M.2 2280 | Heatsink"
    },
    {
      name: "512GB ADATA LEGEND 710 W/HEATSINK",
      image: XPGSX8200PROGEN4, // Replace with actual ADATA LEGEND 710 image if available
      price: "PHP 2,699",
      details: "Mid-capacity NVMe SSD with heatsink for enhanced cooling.",
      specifications: "512GB NVMe PCIe Gen3 | Read: 2400MB/s | Write: 1800MB/s | M.2 2280 | Heatsink"
    },
    {
      name: "1TB ADATA LEGEND 710 W/HEATSINK",
      image: XPGSX8200PROGEN4, // Replace with actual ADATA LEGEND 710 image if available
      price: "PHP 3,699",
      details: "Large capacity NVMe SSD with heatsink for gaming and productivity.",
      specifications: "1TB NVMe PCIe Gen3 | Read: 2400MB/s | Write: 1800MB/s | M.2 2280 | Heatsink"
    },
    {
      name: "1TB ADATA LEGEND 860 W/HEATSINK GEN4",
      image: XPGSX8200PROGEN4, // Replace with actual ADATA LEGEND 860 image if available
      price: "PHP 4,195",
      details: "Gen4 NVMe SSD with heatsink for high-speed data transfer and gaming.",
      specifications: "1TB NVMe PCIe Gen4 | Read: 5000MB/s | Write: 4500MB/s | M.2 2280 | Heatsink"
    },
    {
      name: "500GB SAMSUNG 980 NVME",
      image: SAMSUNG870EVO, // Replace with actual Samsung 980 image if available
      price: "PHP 3,795",
      details: "Reliable NVMe SSD for fast boot and application load times.",
      specifications: "500GB NVMe PCIe Gen3 | Read: 3100MB/s | Write: 2600MB/s | M.2 2280"
    },
    {
      name: "500GB SAMSUNG 970 Evo Plus",
      image: SAMSUNG870EVO, // Replace with actual Samsung 970 Evo Plus image if available
      price: "PHP 4,095",
      details: "High-performance NVMe SSD for demanding workloads and gaming.",
      specifications: "500GB NVMe PCIe Gen3 | Read: 3500MB/s | Write: 3200MB/s | M.2 2280"
    },
    {
      name: "2TB SAMSUNG 990 EVO",
      image: SAMSUNG870EVO, // Replace with actual Samsung 990 EVO image if available
      price: "PHP 9,495",
      details: "Top-tier NVMe SSD for extreme performance and large storage needs.",
      specifications: "2TB NVMe PCIe Gen4 | Read: 5000MB/s | Write: 4200MB/s | M.2 2280"
    }
  ],
  brands: ["Samsung", "Western Digital", "Crucial", "Seagate"]
},
{
  name: "Power Supply",
  image: PSU1,
  category: "PSU",
  products: [
    {
      name: "750W YGT KY-750",
      image: YGTKY750,
      price: "PHP 800",
      details: "A budget-oriented power supply with basic performance, recommended for low-power builds.",
      specifications: "750W | Non-Certified | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "500W COUGAR STC500 80+ White",
      image: COUGARSTC500,
      price: "PHP 2,280",
      details: "An entry-level 80+ White certified PSU for basic system builds.",
      specifications: "500W | 80+ White | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "550W CORSAIR CX550 80+ Bronze",
      image: CORSAIRCX550,
      price: "PHP 2,995",
      details: "A reliable 80+ Bronze PSU for mid-range gaming and workstation builds.",
      specifications: "550W | 80+ Bronze | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "650W CORSAIR CX650 80+ Bronze",
      image: CORSAIRCX550,
      price: "PHP 3,485",
      details: "A durable PSU with Bronze efficiency, ideal for mid-range gaming PCs.",
      specifications: "650W | 80+ Bronze | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "750W CORSAIR CX750 80+ Bronze",
      image: CORSAIRCX550,
      price: "PHP 3,985",
      details: "A high-capacity PSU for gaming and workstation builds with decent efficiency.",
      specifications: "750W | 80+ Bronze | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "850W CORSAIR RM850e 80+ GOLD FM",
      image: CORSAIRCX550,
      price: "PHP 8,195",
      details: "A fully modular, high-performance PSU with Gold efficiency for powerful builds.",
      specifications: "850W | 80+ Gold | Fully Modular | 135mm Fan | Standard ATX"
    },
    {
      name: "850W FSP VITA GM 80+ GOLD PCIE 5.1 FM",
      image: FSPVITAGM,
      price: "PHP 7,300",
      details: "Gold-certified, fully modular PSU with PCIe 5.1 support for high-end systems.",
      specifications: "850W | 80+ Gold | PCIe 5.1 | Fully Modular | 135mm Fan | Standard ATX"
    },
    {
      name: "850W FSP VITA GM 80+ GOLD PCIE 5.1 FM (White)",
      image: FSPVITAGM,
      price: "PHP 7,495",
      details: "White edition, Gold-certified, fully modular PSU with PCIe 5.1 support.",
      specifications: "850W | 80+ Gold | PCIe 5.1 | Fully Modular | 135mm Fan | Standard ATX | White"
    },
    {
      name: "1000W FSP VITA GM 80+ GOLD PCIE 5.1 FM",
      image: FSPVITAGM,
      price: "PHP 8,500",
      details: "A high-capacity, fully modular PSU designed for extreme performance systems.",
      specifications: "1000W | 80+ Gold | PCIe 5.1 | Fully Modular | 135mm Fan | Standard ATX"
    },
    {
      name: "650W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
      image: CORSAIRCX550, // Replace with actual CoolerMaster image if available
      price: "PHP 2,995",
      details: "Bronze certified PSU with ATX 3.1 standard for modern builds.",
      specifications: "650W | 80+ Bronze | ATX 3.1 | Non-Modular | 120mm Fan"
    },
    {
      name: "750W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
      image: CORSAIRCX550, // Replace with actual CoolerMaster image if available
      price: "PHP 3,485",
      details: "Reliable Bronze PSU with ATX 3.1 standard for gaming and workstation PCs.",
      specifications: "750W | 80+ Bronze | ATX 3.1 | Non-Modular | 120mm Fan"
    },
    {
      name: "750W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
      image: CORSAIRCX550, // Replace with actual CoolerMaster image if available
      price: "PHP 6,995",
      details: "Gold certified, fully modular PSU with ATX 3.1 for high-end builds.",
      specifications: "750W | 80+ Gold | ATX 3.1 | Fully Modular | 135mm Fan"
    },
    {
      name: "850W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
      image: CORSAIRCX550, // Replace with actual CoolerMaster image if available
      price: "PHP 7,995",
      details: "High-wattage, Gold certified, fully modular PSU for demanding systems.",
      specifications: "850W | 80+ Gold | ATX 3.1 | Fully Modular | 135mm Fan"
    },
    {
      name: "650W MSI MAG A650BN 80+ Bronze",
      image: CORSAIRCX550, // Replace with actual MSI image if available
      price: "PHP 3,350",
      details: "Bronze certified PSU from MSI for reliable power delivery.",
      specifications: "650W | 80+ Bronze | Non-Modular | 120mm Fan"
    },
    {
      name: "750W MSI MAG A750BN 80+ Bronze PCIE5",
      image: CORSAIRCX550, // Replace with actual MSI image if available
      price: "PHP 4,295",
      details: "Bronze certified PSU with PCIe 5 support for modern GPUs.",
      specifications: "750W | 80+ Bronze | PCIe 5 | Non-Modular | 120mm Fan"
    },
    {
      name: "750W MSI MAG A750GL 80+ GOLD PCIE5 FM",
      image: CORSAIRCX550, // Replace with actual MSI image if available
      price: "PHP 5,995",
      details: "Gold certified, fully modular PSU with PCIe 5 for high-end graphics cards.",
      specifications: "750W | 80+ Gold | PCIe 5 | Fully Modular | 135mm Fan"
    },
    {
      name: "550W GIGABYTE P550SS 80+ SILVER",
      image: GIGABYTEP550SS,
      price: "PHP 2,395",
      details: "A budget Silver-rated PSU for stable and efficient performance.",
      specifications: "550W | 80+ Silver | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "550W GIGABYTE P550SS 80+ SILVER White",
      image: GIGABYTEP550SSSILVERWhite,
      price: "PHP 2,495",
      details: "A stylish white variant of the P550SS, providing stable power efficiency.",
      specifications: "550W | 80+ Silver | Non-Modular | 120mm Fan | Standard ATX | White"
    },
    {
      name: "650W GIGABYTE P650SS 80+ SILVER White",
      image: GIGABYTEP550SSSILVERWhite, // Replace with actual P650SS image if available
      price: "PHP 3,600",
      details: "White edition, Silver certified PSU for mid-range builds.",
      specifications: "650W | 80+ Silver | Non-Modular | 120mm Fan | Standard ATX | White"
    },
    {
      name: "650W GIGABYTE P650G 80+ GOLD",
      image: GIGABYTEP550SS, // Replace with actual P650G image if available
      price: "PHP 3,985",
      details: "Gold certified PSU for efficient and stable power delivery.",
      specifications: "650W | 80+ Gold | Non-Modular | 120mm Fan | Standard ATX"
    },
    {
      name: "850W AORUS ELITE P850W PCIE5 80+ PLATINUM FULLY MODULAR PSU",
      image: GIGABYTEP550SS, // Replace with actual AORUS image if available
      price: "PHP 8,450",
      details: "Platinum certified, fully modular PSU with PCIe 5 for enthusiast builds.",
      specifications: "850W | 80+ Platinum | PCIe 5 | Fully Modular | 135mm Fan | Standard ATX"
    }
  ],
  brands: ["Corsair", "EVGA", "Seasonic", "FSP", "Cooler Master", "MSI", "Gigabyte", "AORUS"]
},
{
  name: "Case",
  image: SystemUnit1,
  category: "Case",
  products: [
    // Standard Case
    {
      name: "YGT MARS 8 W/ 700W PSU",
      image: YGTMARS8,
      price: "PHP 1,000",
      details: "A budget-friendly mid-tower case with an included 700W non-certified PSU.",
      specifications: "Form Factor: Mid-Tower | Pre-installed PSU: 700W | Material: Steel & Plastic | Cooling Support: Basic Airflow"
    },

    // Tempered Glass Case
    {
      name: "KEYTECH ROBIN LITE (Black/White)",
      image: KEYTECHROBINLITE,
      price: "PHP 1,480",
      details: "Minimalist tempered glass case available in black or white.",
      specifications: "Form Factor: Mid-Tower | Material: Steel & Tempered Glass | Color: Black/White | Cooling Support: 120mm Fans"
    },
    {
      name: "KEYTECH ROBIN VIEW (Black/White)",
      image: KEYTECHROBINVIEW,
      price: "PHP 1,480",
      details: "Tempered glass case with a stylish view panel, available in black or white.",
      specifications: "Form Factor: Mid-Tower | Material: Steel & Tempered Glass | Color: Black/White | Cooling Support: 120mm Fans"
    },
    {
      name: "INPLAY OPENVIEW V100 (White/Black)",
      image: INPLAYOPENVIEWV100,
      price: "PHP 1,499",
      details: "Elegant tempered glass case available in white or black.",
      specifications: "Form Factor: Mid-Tower | Material: Steel & Acrylic | Color: White/Black | Cooling Support: 120mm Fans"
    },
    {
      name: "1stPlayer MIKU 2 (Black/White)",
      image: PlayerMIKU2,
      price: "PHP 1,700",
      details: "Modern tempered glass case with good airflow, available in black or white.",
      specifications: "Form Factor: Mid-Tower | Material: Steel & Tempered Glass | Color: Black/White | Cooling Support: 120mm Fans, RGB Compatibility"
    },
    {
      name: "COOLMAN REYNA (White)",
      image: COOLMANREYNA,
      price: "PHP 1,850",
      details: "Futuristic tempered glass case in white with support for high-performance cooling.",
      specifications: "Form Factor: Mid-Tower | Material: Steel & Tempered Glass | Color: White | Cooling Support: 120mm & 140mm Fans, Water Cooling Radiator Support"
    },

    // Mesh Case
    {
      name: "KEYTECH DARKVADER W/ 2 FANS (Black)",
      image: KEYTECHROBINLITE, // Replace with actual image if available
      price: "PHP 1,199",
      details: "Mesh front panel case with 2 pre-installed fans for optimal airflow.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: Black | Cooling: 2x Fans Included"
    },
    {
      name: "INPLAY META A200 MESH W/ 3 FANS (Black)",
      image: INPLAYOPENVIEWV100, // Replace with actual image if available
      price: "PHP 1,399",
      details: "Mesh case with 3 pre-installed fans for excellent cooling, black color.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: Black | Cooling: 3x Fans Included"
    },
    {
      name: "INPLAY META A200 MESH W/ 3 FANS (White)",
      image: INPLAYOPENVIEWV100, // Replace with actual image if available
      price: "PHP 1,499",
      details: "Mesh case with 3 pre-installed fans for excellent cooling, white color.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: White | Cooling: 3x Fans Included"
    },
    {
      name: "INPLAY METEOR 30 MESH (White)",
      image: INPLAYOPENVIEWV100, // Replace with actual image if available
      price: "PHP 1,299",
      details: "Compact mesh case in white for improved airflow.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: White | Cooling Support: Mesh Front"
    },
    {
      name: "KEYTECH CUIRASS MESH (White/Black)",
      image: KEYTECHROBINLITE, // Replace with actual image if available
      price: "PHP 1,599",
      details: "Mesh case available in white or black for high airflow builds.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: White/Black | Cooling Support: Mesh Front"
    },
    {
      name: "KEYTECH VISOR (Black/White)",
      image: KEYTECHROBINLITE, // Replace with actual image if available
      price: "PHP 1,699",
      details: "Stylish mesh case available in black or white.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: Black/White | Cooling Support: Mesh Front"
    },
    {
      name: "DARKFLASH DB330M MESH (Black/White)",
      image: DARKFLASHDB330M,
      price: "PHP 1,850",
      details: "Mesh case with excellent airflow, available in black or white.",
      specifications: "Form Factor: Micro-ATX | Material: Steel & Mesh | Color: Black/White | Cooling Support: 120mm & 140mm Fans"
    },

    // Dual Chamber Case
    {
      name: "KEYTECH ROBIN CUBE (Black/White)",
      image: KEYTECHROBINVIEW, // Replace with actual image if available
      price: "PHP 1,850",
      details: "Dual chamber case for improved cable management, available in black or white.",
      specifications: "Form Factor: Cube | Material: Steel & Tempered Glass | Color: Black/White | Dual Chamber Design"
    },
    {
      name: "KEYTECH ROBIN MINI (Black)",
      image: KEYTECHROBINLITE, // Replace with actual image if available
      price: "PHP 2,050",
      details: "Compact dual chamber case in black for mini builds.",
      specifications: "Form Factor: Mini-Tower | Material: Steel & Tempered Glass | Color: Black | Dual Chamber Design"
    },
    {
      name: "KEYTECH 011 (Black/White)",
      image: KEYTECHROBINVIEW, // Replace with actual image if available
      price: "PHP 2,750",
      details: "Spacious dual chamber case inspired by the O11 design, available in black or white.",
      specifications: "Form Factor: ATX | Material: Steel & Tempered Glass | Color: Black/White | Dual Chamber Design"
    },
    {
      name: "COOLMAN SPECTRA (Black/White)",
      image: COOLMANREYNA, // Replace with actual image if available
      price: "PHP 2,850",
      details: "Dual chamber case with modern aesthetics, available in black or white.",
      specifications: "Form Factor: ATX | Material: Steel & Tempered Glass | Color: Black/White | Dual Chamber Design"
    },
    {
      name: "COOLMAN SPECTRA LUXE (Black/White)",
      image: COOLMANREYNA, // Replace with actual image if available
      price: "PHP 3,200",
      details: "Premium dual chamber case with luxe features, available in black or white.",
      specifications: "Form Factor: ATX | Material: Steel & Tempered Glass | Color: Black/White | Dual Chamber Design"
    },

    // Premium Case
    {
      name: "DEEPCOOL MATREXX V55 V3 (White, SALE)",
      image: KEYTECHROBINLITE, // Replace with actual Deepcool image if available
      price: "PHP 1,999",
      details: "Premium white case on sale, with tempered glass and spacious interior.",
      specifications: "Form Factor: ATX | Material: Steel & Tempered Glass | Color: White | Premium Build"
    },
    {
      name: "FSP CST360 MESH (Black)",
      image: KEYTECHROBINLITE, // Replace with actual FSP image if available
      price: "PHP 2,800",
      details: "Premium mesh case from FSP in black for high airflow.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: Black | Premium Build"
    },
    {
      name: "FSP CST360 MESH (White)",
      image: KEYTECHROBINLITE, // Replace with actual FSP image if available
      price: "PHP 2,995",
      details: "Premium mesh case from FSP in white for high airflow.",
      specifications: "Form Factor: ATX | Material: Steel & Mesh | Color: White | Premium Build"
    },
    {
      name: "ASUS TUF Gaming GT501 (White)",
      image: AsusMotherboard, // Replace with actual GT501 image if available
      price: "PHP 5,500",
      details: "High-end white case from ASUS TUF series, built for durability and airflow.",
      specifications: "Form Factor: ATX | Material: Steel & Tempered Glass | Color: White | Premium Build"
    },
    {
      name: "LIANLI O11 Dynamic MINI (Snow White)",
      image: LIANLIO11DynamicMINI,
      price: "PHP 6,000",
      details: "Premium small-form-factor case in snow white, designed for high-performance builds.",
      specifications: "Form Factor: Mini-Tower | Material: Aluminum & Tempered Glass | Color: Snow White | Modular Design"
    }
  ],
  brands: ["NZXT", "Cooler Master", "Lian Li", "DarkFlash", "Keytech", "Inplay", "Coolman", "FSP", "ASUS", "DEEPCOOL"]
},
// NOTE: Monitor category removed from sidebar - now only available under Peripherals section
{ name: "Peripherals", image: Peripheral, category: "Peripherals", products: [
    {
      name: "Logitech G502 HERO",
      image: LogitechG502HERO,
      price: "PHP 3,195",
      details: "High-performance gaming mouse with HERO 25K sensor for precise tracking.",
      specifications: "DPI: 100-25,600 | Buttons: 11 | Weight Tuning System: Yes | RGB: Yes"
    },
    {
      name: "Razer DeathAdder V2",
      image: RazerDeathAdderV2,
      price: "PHP 2,795",
      details: "Ergonomic gaming mouse with Focus+ Optical Sensor and Speedflex cable.",
      specifications: "DPI: 20,000 | Buttons: 8 | Weight: 82g | RGB: Yes"
    },
    {
      name: "SteelSeries Apex 3 TKL",
      image: SteelSeriesApex3KL,
      price: "PHP 2,599",
      details: "Water-resistant gaming keyboard with customizable RGB lighting.",
      specifications: "Switches: Whisper-Quiet Membrane | RGB: Yes | Connectivity: Wired | Water Resistance: IP32"
    },
    {
      name: "HyperX Alloy Origins Core",
      image: HyperXAlloyOriginsCore,
      price: "PHP 4,695",
      details: "Compact TKL mechanical keyboard with HyperX Red switches.",
      specifications: "Switches: HyperX Red (Linear) | RGB: Yes | Connectivity: Wired | Frame: Aluminum"
    },
    {
      name: "Razer BlackShark V2 X",
      image: RazerBlackSharkV2X,
      price: "PHP 2,995",
      details: "Lightweight gaming headset with 50mm Triforce drivers and HyperClear Cardioid Mic.",
      specifications: "Drivers: 50mm | Connection: 3.5mm | Noise Cancellation: Passive | Weight: 240g"
    },
    {
      name: "Logitech G435 Wireless",
      image: LogitechG435Wireless,
      price: "PHP 3,295",
      details: "Ultra-lightweight gaming headset with Bluetooth and Lightspeed Wireless.",
      specifications: "Drivers: 40mm | Connection: Bluetooth & Lightspeed | Weight: 165g | Battery Life: 18 Hours"
    },
    {
      name: "SteelSeries QcK Heavy Mouse Pad",
      image: SteelSeriesQcKHeavyMousePad,
      price: "PHP 1,495",
      details: "Thick gaming mouse pad with micro-woven cloth for precision tracking.",
      specifications: "Size: Large | Material: Cloth | Base: Non-Slip Rubber"
    },
    {
      name: "HyperX Pulsefire Haste",
      image: HyperXPulsefireHaste,
      price: "PHP 2,195",
      details: "Ultra-light honeycomb gaming mouse with Pixart 3335 sensor.",
      specifications: "DPI: 16,000 | Buttons: 6 | Weight: 59g | RGB: Yes"
    }
  ],
  brands: ["Logitech", "Razer", "SteelSeries", "HyperX"]
}
];

menuItems.forEach(category => {
  if (Array.isArray(category.products)) {
    category.products.forEach(product => {
      if (product.price) {
        // Remove any non-numeric characters except dots
        const numericPrice = product.price.toString().replaceAll(/[^\d.]/g, "");
        // Parse to float and format with 2 decimal places
        const formattedPrice = Number.parseFloat(numericPrice).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        // Add back the PHP prefix
        product.price = `PHP ${formattedPrice}`;
      } else {
        // Default price if none exists
        product.price = "PHP 0.00";
      }
    });
  }
});


// Inside PC-Parts.js
//Function for a notification in cart-icon
export const updateCartIcon = () => {
  console.log(document.querySelector(".cart-icon"))
  const cartIcon = document.querySelector(".cart-icon");
  if (!cartIcon) return; // Prevent errors if cart icon is not found

  const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
  // Filter out null/undefined items before reducing
  const cartCount = cartItems
    .filter(item => item && typeof item === 'object')
    .reduce((acc, item) => acc + (item.quantity || 0), 0);
  cartIcon.dataset.count = cartCount;
};

// Category inference patterns for legacy cart items without category
const CATEGORY_PATTERNS = [
  { pattern: /ryzen|intel|processor|core i/i, category: 'CPU' },
  { pattern: /motherboard|mobo|b550|b650|b850|x670|z790/i, category: 'Motherboard' },
  { pattern: /rtx|gtx|radeon|gpu|graphics/i, category: 'GPU' },
  { pattern: /(?:ram|memory|ddr)(?!.*(?:storage|ssd))/i, category: 'RAM' },
  { pattern: /ssd|hdd|nvme|storage|\btb\b|\bgb\b/i, category: 'Storage' },
  { pattern: /psu|power supply|watt|80\+/i, category: 'PSU' },
  { pattern: /\bcase\b|chassis|tower/i, category: 'Case' },
  { pattern: /cooler|cooling|aio|\bfan\b/i, category: 'Cooling' },
];

function inferCategoryFromName(productName) {
  const name = (productName || '').toLowerCase();
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(name)) return category;
  }
  return null;
}

const PERIPHERAL_CATEGORIES = new Set(['Mouse', 'Keyboard', 'Headphones', 'Speakers', 'Webcam']);
const isCanceledRequest = (error) => error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

function toNumericPrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replaceAll(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function prepareCartForCompatibility(cartItems) {
  let cartModified = false;
  for (const item of cartItems) {
    if (!item || item.category) continue;
    const inferredCategory = inferCategoryFromName(item.name || item.product_name);
    if (inferredCategory) {
      item.category = inferredCategory;
      cartModified = true;
    }
  }
  if (cartModified) {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }
  return cartItems
    .filter(item => item?.category && !PERIPHERAL_CATEGORIES.has(item.category));
}

async function fetchCompatibilityFromAPI(nonPeripheralCart, productsList, currentViewingCategory) {
  const scores = {};

  const response = await realtimeKioskAPI.checkCompatibilityBatch({
    contextParts: nonPeripheralCart.map(item => ({
      id: item.id,
      name: item.name || item.product_name,
      category: item.category,
      brand: item.brand,
      price: item.price,
      specifications: item.specifications || {},
      tier: item.tier || 'unknown'
    })),
    candidates: productsList.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category || currentViewingCategory,
      brand: product.brand,
      price: product.price,
      specifications: product.specifications || {},
      dimensions: product.dimensions || {},
      tier: product.tier || 'unknown'
    })),
    mode: 'candidate_filter',
    targetCategory: currentViewingCategory
  });

  const results = response?.data || response?.results || [];
  results.forEach(result => {
    const score = result.score ?? result.compatibility_score ?? result.compatibilityScore ?? 0;
    scores[result.id] = result.compatible === false ? 0 : Math.max(score, 75);
  });

  return scores;
}

function normalizeHomepagePick(pick, analysisField, defaultAnalysis) {
  const numericPrice = toNumericPrice(pick.effectivePrice || pick.salePrice || pick.price);
  return {
    ...pick,
    id: pick.id || pick.componentId,
    image: api.utils.getFullImageUrl(pick.imageUrl || pick.image_url || pick.file_path || pick.image),
    numericPrice,
    price: typeof pick.price === 'string' ? pick.price : `₱${numericPrice.toLocaleString()}`,
    localAnalysis: pick[analysisField] || pick.analysis || pick.reason || defaultAnalysis
  };
}

function normalizeSalePick(product) {
  const originalPrice = toNumericPrice(product.originalPrice || product.regularPrice || product.basePrice || product.price);
  const salePrice = toNumericPrice(product.salePrice || product.sale_price || product.effectivePrice || product.discountedPrice || product.price);
  const isDiscounted = originalPrice > 0 && salePrice > 0 && salePrice < originalPrice;

  if (!isDiscounted && product.onSale !== true) {
    return null;
  }

  const effectiveSalePrice = salePrice > 0 ? salePrice : originalPrice;
  const discountPercent = isDiscounted
    ? Math.round(((originalPrice - effectiveSalePrice) / originalPrice) * 100)
    : 0;

  return {
    ...product,
    image: api.utils.getFullImageUrl(product.imageUrl || product.image_url || product.file_path || product.image),
    originalPrice,
    salePrice: effectiveSalePrice,
    discountPercent,
    price: `₱${effectiveSalePrice.toLocaleString()}`,
    formattedOriginalPrice: `₱${originalPrice.toLocaleString()}`,
    formattedSalePrice: `₱${effectiveSalePrice.toLocaleString()}`
  };
}

async function fetchAllCategoryProducts(categories) {
  const categoryResults = await Promise.all(categories.map(async (category) => {
    try {
      const response = await stockAPI.getCatalogBootstrap({
        category, page: 1, limit: 20, sort: 'name', order: 'ASC', includeSpecRanges: false
      });
      const items = response.data?.data?.products || response.data?.data?.items || [];
      if (Array.isArray(items)) {
        return items.map(product => ({
          ...product,
          image: normalizeKioskProduct(product, { category }).image,
          price: Number.parseFloat(product.price || 0),
          category,
          stock: product.stock || 0,
          brand: product.brand || 'Unknown'
        }));
      }
    } catch (error) {
      if (!isCanceledRequest(error)) {
        console.warn(`Failed to fetch ${category} products:`, error);
      }
    }
    return [];
  }));
  return categoryResults.flat();
}

async function fetchFeaturedFallback() {
  const products = await realtimeKioskAPI.getFeaturedProducts();
  return products.map(product => ({
    ...product,
    image: api.utils.getFullImageUrl(product.imageUrl || product.image_url || product.file_path || product.image),
    price: `₱${toNumericPrice(product.effectivePrice || product.price).toLocaleString()}`
  }));
}

function extractProductsFromResponse(response) {
  if (response?.data) {
    if (Array.isArray(response.data.data?.products)) return response.data.data.products;
    if (Array.isArray(response.data.data?.items)) return response.data.data.items;
    if (Array.isArray(response.data.data)) return response.data.data;
    if (Array.isArray(response.data.products)) return response.data.products;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data.results)) return response.data.results;
  }
  if (Array.isArray(response)) return response;
  return [];
}

function normalizeProduct(product) {
  const normalizedProduct = normalizeKioskProduct(product);
  const productDescription = product.details || product.description;
  const productSpecs = product.specifications || product.specs;
  let resolvedSpecs = productSpecs;
  if (productSpecs == null || productSpecs === '' ||
    (typeof productSpecs === 'object' && Object.keys(productSpecs).length === 0)) {
    resolvedSpecs = "No specifications provided";
  }

  return {
    ...normalizedProduct,
    price: product.price ? Number(product.price.toString().replaceAll(/[^\d.]/g, "")) : null,
    details: productDescription && productDescription !== '' ? productDescription : "No details available",
    specifications: resolvedSpecs
  };
}


function PCParts() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [showFilter, setShowFilter] = useState(false); // Pop-up state
  const [priceOpen, setPriceOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [specSectionOpen, setSpecSectionOpen] = useState({});
  const specRangesRef = useRef({}); // Store min/max values for numeric specs
  const [randomHotPicks, setRandomHotPicks] = useState([]);
  const [randomValueForMoney, setRandomValueForMoney] = useState([]);
  const [randomOnSale, setRandomOnSale] = useState([]);
  const onSaleRequestRef = useRef(null);
  const homepageProductsLoadedRef = useRef(false);
  const homepageProductsScheduledRef = useRef(false);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState({}); // Track which products show full controls
  const [expandTimers, setExpandTimers] = useState({}); // Track timers for auto-collapse

  // ✅ NEW: Carousel rotation state (show 4 items at a time from pool of 8-20)
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const ITEMS_PER_PAGE = 4; // Show 4 items at a time on 1920x1080
  const ROTATION_INTERVAL = 8000; // Rotate every 8 seconds

  // ✅ COMPATIBILITY VALIDATION STATE
  // eslint-disable-next-line no-unused-vars
  const [selectedComponents, setSelectedComponents] = useState({}); // Track selected components by category
  const [compatibilityScores, setCompatibilityScores] = useState({}); // Compatibility scores for products
  // eslint-disable-next-line no-unused-vars
  const [hideIncompatible] = useState(false); // Toggle to hide incompatible products
  const [compatibilityContext, setCompatibilityContext] = useState(null); // Compatibility context for sorting
  const [isLoadingCompatibility, setIsLoadingCompatibility] = useState(false); // Loading state for compatibility checks
  const [cartItemsCount, setCartItemsCount] = useState(0); // Track non-peripheral cart items count
  const [showCompatibilityValidationModal, setShowCompatibilityValidationModal] = useState(false); // ✅ Enhanced validation modal for checkout


  // Restore selected category if coming back from ProductPage
  const [selectedItem, setSelectedItem] = useState(() => {
    const categoryIndex = location.state?.selectedCategory;
    return categoryIndex >= 0 && categoryIndex < menuItems.length ? categoryIndex : 0;
  });



  //Fucntion to notify the products being added to cart
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    // Filter out null/undefined items before reducing
    const cartCount = cartItems
      .filter(item => item && typeof item === 'object')
      .reduce((acc, item) => acc + (item.quantity || 0), 0);
    setCartCount(cartCount); // ✅ Use cartCount instead of totalItems
  }, [cart]);

  // Listen for cart updates from other components (like ProductPage)
  useEffect(() => {
    const handleStorageChange = () => {
      setCart(JSON.parse(localStorage.getItem("cart")) || []);
    };

    globalThis.addEventListener('storage', handleStorageChange);

    // Also listen for a custom event for same-window updates
    globalThis.addEventListener('cartUpdated', handleStorageChange);

    return () => {
      globalThis.removeEventListener('storage', handleStorageChange);
      globalThis.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  // ⏱️ AUTO-COLLAPSE TIMER CLEANUP - Clear all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(expandTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on unmount - expandTimers reference not needed



  //Function to compute the total price
  const getPrice = (item) => {
    if (!item?.price) {
      console.log('💰 getPrice: No item or price found', item);
      return 0;
    }

    let price = item.price;
    console.log('💰 getPrice: Input price:', price, 'Type:', typeof price);

    // Handle different price formats
    if (typeof price === "number") {
      console.log('💰 getPrice: Numeric price:', price);
      return price;
    }

    if (typeof price === "string") {
      // Remove currency symbols, commas, and other non-numeric characters
      // Keep only digits, decimal points, and minus signs
      let numericString = price.replaceAll(/[^\d.-]/g, "");

      // Handle cases like "PHP 1,234.56" or "₱1,234.56"
      if (numericString.includes(',')) {
        numericString = numericString.replaceAll(',', '');
      }

      const parsed = Number.parseFloat(numericString);
      const result = Number.isNaN(parsed) ? 0 : parsed;
      console.log('💰 getPrice: String price:', price, '→ numericString:', numericString, '→ parsed:', result);
      return result;
    }

    console.log('💰 getPrice: Unknown price format, returning 0');
    return 0;
  };

  const [totalPrice, setTotalPrice] = useState(0);

  // Function to get product quantity in cart
  const getProductQuantityInCart = (productName) => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const item = cartItems.find(item => item && item.name === productName);
    return item ? item.quantity : 0;
  };

  // ⏱️ START AUTO-COLLAPSE TIMER - Automatically collapse quantity controls after 5 seconds
  const startAutoCollapseTimer = (productId) => {
    // Clear existing timer for this product
    if (expandTimers[productId]) {
      clearTimeout(expandTimers[productId]);
    }

    // Set new timer
    const timerId = setTimeout(() => {
      setExpandedProducts(prev => ({ ...prev, [productId]: false }));
      setExpandTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[productId];
        return newTimers;
      });
    }, 60000); // 5 seconds

    // Store timer ID
    setExpandTimers(prev => ({ ...prev, [productId]: timerId }));
  };

  // TASK 5: Product Comparison State
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    const calculateTotalPrice = () => {
      const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
      console.log(`💰 Calculating total price for ${cartItems.length} cart items`);

      // Filter out null/undefined items before reducing
      const total = cartItems
        .filter(item => item && typeof item === 'object')
        .reduce((acc, item, index) => {
          const itemPrice = getPrice(item);
          const quantity = item.quantity || 1;
          const itemTotal = itemPrice * quantity;

          console.log(`💰 Item ${index + 1}: ${item.name} ×${quantity} = ${itemTotal}`);

          return acc + itemTotal;
        }, 0);

      console.log('💰 Total calculated price:', total);
      return total;
    };

    setTotalPrice(calculateTotalPrice());
  }, [cart]); // ✅ No warning, no unnecessary function dependencies




  // Listen for cart reset event in QueuingDisplay
  useEffect(() => {
    const handleCartReset = () => {
      setCartCount(0);
      setTotalPrice(0);
      localStorage.setItem("cartCount", "0");
      localStorage.setItem("cartTotal", "0");
    };

    globalThis.addEventListener("cartReset", handleCartReset);
    return () => globalThis.removeEventListener("cartReset", handleCartReset);
  }, []);

  // ✅ COMPATIBILITY: Sync cart items to selectedComponents for validation
  useEffect(() => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

    // Build selectedComponents object from cart
    const components = {};
    cartItems.forEach(item => {
      if (item?.category) {
        components[item.category] = {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price
        };
      }
    });

    setSelectedComponents(components);
    console.log('🔍 Synced cart to selectedComponents:', Object.keys(components));
  }, [cart]);

  // Function to clear cart and reset values when clicking button cancel-item and start-over
  const clearCart = () => {
    localStorage.removeItem("cart");  // Clear cart from localStorage
    setCartCount(0);                  // Reset cart count
    setTotalPrice(0);                  // Reset total price
    setSelectedComponents({});        // ✅ Clear compatibility tracking
    setCompatibilityScores({});       // ✅ Clear compatibility scores
  };

  // Cancel Order - Only clears the cart without navigation
  const handleCancelOrder = () => {
    clearCart();
  };

  // Start Over - Clears cart and redirects to "/app"
  const handleStartOver = () => {
    clearCart();
    navigate("/app");
  };




  // Category mapping from frontend to backend
  const mapCategoryToBackend = (frontendCategory) => {
    const categoryMapping = {
      'CPU': 'CPU',
      'CPU Cooler': 'Cooling', // Fix: Map CPU Cooler to Cooling
      'Cooling': 'Cooling',
      'Motherboard': 'Motherboard',
      'RAM': 'RAM',
      'Storage': 'Storage',
      'GPU': 'GPU',
      'Case': 'Case',
      'PSU': 'PSU',
      'Peripherals': null, // Special handling - will use peripheral subcategories
      'home': null
    };
    return categoryMapping[frontendCategory] || null;
  };

  // Dynamic filter state
  const [availableBrands, setAvailableBrands] = useState([]);
  const [brandCounts, setBrandCounts] = useState({}); // Store brand counts
  const [totalCategoryItems, setTotalCategoryItems] = useState(0); // Store total items in category
  const [selectedBrand, setSelectedBrand] = useState(''); // ✅ FIXED: Single brand selection (mutually exclusive)
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false); // Brand dropdown state
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 }); // ✅ FIXED: Typo in max property
  const [selectedPrice, setSelectedPrice] = useState({ min: '', max: '' });
  const specMetaRef = useRef([]); // fields definitions
  const [specFilters, setSpecFilters] = useState({}); // key -> value or {min,max}
  const [availableSpecFilters, setAvailableSpecFilters] = useState({}); // 🔥 Top 5 spec values per category
  const [sortOrder, setSortOrder] = useState({ sort: 'name', order: 'ASC' });
  const peripheralSubcategories = useMemo(() => ['Monitor','Headphones','Keyboard','Mouse','Speakers','Webcam'], []);
  const [activePeripheral, setActivePeripheral] = useState(null);

  // ✅ NEW: Loading state for performance optimization
  const [isLoading, setIsLoading] = useState(false);

  // Helper: assemble query params for backend list
  const buildQueryParams = useCallback((category) => {
    const params = { category, page: 1, limit: 60 };
    if (selectedBrand && selectedBrand !== '') params.brand = selectedBrand; // ✅ FIXED: Single brand filtering
    if (selectedPrice.min !== '' && !Number.isNaN(selectedPrice.min)) params.minPrice = selectedPrice.min;
    if (selectedPrice.max !== '' && !Number.isNaN(selectedPrice.max)) params.maxPrice = selectedPrice.max;
    // spec filters
    Object.entries(specFilters).forEach(([field, value]) => {
      if (value === '' || value == null) return;
      if (typeof value === 'object' && (value.min || value.max)) {
        const min = value.min || '';
        const max = value.max || '';
        if (min !== '' || max !== '') params[`spec_${field}`] = `${min || ''}-${max || ''}`;
      } else {
        params[`spec_${field}`] = value;
      }
    });
    params.sort = sortOrder.sort;
    params.order = sortOrder.order;
    return params;
  }, [selectedBrand, selectedPrice.min, selectedPrice.max, specFilters, sortOrder]); // ✅ FIXED: Updated dependencies

  // Helper: Fetch brands with counts for a category
  const fetchCategoryBrands = useCallback(async (category) => {
    try {
      const res = await stockAPI.getBrandsWithCounts(category);
      const data = res.data?.data || {};
      const brands = data.brands || [];
      setAvailableBrands(brands.map(b => b.name));
      const counts = {};
      brands.forEach(brand => { counts[brand.name] = brand.count; });
      setBrandCounts(counts);
      setTotalCategoryItems(data.totalItems || 0);
    } catch {
      setAvailableBrands([]);
      setBrandCounts({});
      setTotalCategoryItems(0);
    }
  }, []);

  // Helper: Fetch price range for a category
  const fetchCategoryPriceRange = useCallback(async (category) => {
    try {
      const res = await stockAPI.getPriceRange(category);
      const data = res.data?.data || res.data || {};
      if (data.min != null && data.max != null) {
        setPriceRange({ min: data.min, max: data.max });
      }
      } catch (error) {
        if (error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
          console.warn(`Failed to fetch price range for ${category}:`, error.message);
        }
      }
  }, []);

  // Helper: Fetch spec metadata and ranges for a category
  const fetchCategorySpecMeta = useCallback(async (category) => {
    try {
      const res = await stockAPI.getPartMeta(category);
      const fields = res.data?.data?.fields || [];
      specMetaRef.current = fields;

      const ranges = {};
      for (const field of fields) {
        const fieldKey = field.field_name || field.name;
        const fieldType = field.field_type || field.type || 'text';
        if (fieldType === 'number') {
          try {
            const rangeRes = await stockAPI.getSpecRange(category, fieldKey);
            const rangeData = rangeRes.data?.data ?? rangeRes.data;
            if (rangeData?.min != null && rangeData?.max != null) {
              ranges[fieldKey] = { min: rangeData.min, max: rangeData.max, totalItems: rangeData.totalItems || 0 };
            }
          } catch (err) {
            if (err?.code !== 'ERR_CANCELED' && err?.name !== 'CanceledError') {
              console.warn(`Failed to fetch range for ${fieldKey}:`, err);
            }
          }
        }
      }
      specRangesRef.current = ranges;
    } catch {
      specMetaRef.current = [];
      specRangesRef.current = {};
    }
  }, []);

  // Helper: Process raw peripheral product from API into display-ready format
  const processPeripheralProduct = useCallback((product, subcat) => ({
    ...product,
    subcategory: subcat,
    image: api.utils.getFullImageUrl(product.imageUrl || product.image_url || product.file_path || product.image),
    price: product.price ? Number(product.price.toString().replaceAll(/[^\d.]/g, "")) : null,
    details: product.details || product.description || "No details available",
    specifications: product.specifications || product.specs || "No specifications provided"
  }), []);

  // Helper: Collect brand counts from a product array
  const collectBrandCounts = useCallback((productList) => {
    const counts = {};
    for (const p of productList) {
      if (p.brand) {
        counts[p.brand] = (counts[p.brand] || 0) + 1;
      }
    }
    return counts;
  }, []);

  // Helper: Fetch and filter peripheral products across all subcategories
  // Helper: Fetch all peripheral subcategory products
  const fetchAllPeripheralSubcats = useCallback(async () => {
    const allProducts = [];
    const allBrands = new Set();
    let minPrice = Infinity, maxPrice = -Infinity;

    for (const subcat of peripheralSubcategories) {
      try {
        const params = { category: subcat, page: 1, limit: 100 };
        const response = await stockAPI.getItems(params);
        const products = response.data?.data || response.data || [];
        if (!Array.isArray(products)) continue;

        const processed = products.map(product => processPeripheralProduct(product, subcat));
        allProducts.push(...processed);

        for (const p of processed) {
          if (p.brand) allBrands.add(p.brand);
          if (p.price > 0) { minPrice = Math.min(minPrice, p.price); maxPrice = Math.max(maxPrice, p.price); }
        }
      } catch (error) {
        if (error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
          console.warn(`Failed to fetch ${subcat}:`, error.message);
        }
      }
    }
    return { allProducts, allBrands, minPrice, maxPrice };
  }, [peripheralSubcategories, processPeripheralProduct]);

  // Helper: Apply brand/price/sort filters to peripheral products
  const applyPeripheralFilters = useCallback((products, brand, price, sort) => {
    let filtered = [...products];
    if (brand && brand !== '') {
      filtered = filtered.filter(p => p.brand === brand);
    }
    if (price.min !== '' && !Number.isNaN(price.min)) {
      filtered = filtered.filter(p => p.price >= Number(price.min));
    }
    if (price.max !== '' && !Number.isNaN(price.max)) {
      filtered = filtered.filter(p => p.price <= Number(price.max));
    }
    filtered.sort((a, b) => {
      if (sort.sort === 'name') {
        const comparison = a.name.localeCompare(b.name);
        return sort.order === 'DESC' ? -comparison : comparison;
      }
      return 0;
    });
    return filtered;
  }, []);

  const fetchPeripheralProducts = useCallback(async () => {
    try {
      const { allProducts, allBrands, minPrice, maxPrice } = await fetchAllPeripheralSubcats();

      // Filter by active peripheral if selected
      let filteredProducts = allProducts;
      if (activePeripheral) {
        filteredProducts = allProducts.filter(p => p.subcategory === activePeripheral);
        const subcatBrandSet = new Set(filteredProducts.map(p => p.brand).filter(Boolean));
        setAvailableBrands(Array.from(subcatBrandSet).sort((a, b) => a.localeCompare(b)));
        setBrandCounts(collectBrandCounts(filteredProducts));
        setTotalCategoryItems(allProducts.filter(p => p.subcategory === activePeripheral).length);
      } else {
        setAvailableBrands(Array.from(allBrands).sort((a, b) => a.localeCompare(b)));
        setBrandCounts(collectBrandCounts(allProducts));
        setTotalCategoryItems(allProducts.length);
      }

      filteredProducts = applyPeripheralFilters(filteredProducts, selectedBrand, selectedPrice, sortOrder);
      setProducts(filteredProducts);

      if (minPrice !== Infinity && maxPrice !== -Infinity) {
        setPriceRange({ min: minPrice, max: maxPrice });
      }
    } catch (error) {
      console.error("Error fetching peripheral products:", error);
      setProducts([]);
    }
  }, [activePeripheral, selectedBrand, selectedPrice, sortOrder, fetchAllPeripheralSubcats, collectBrandCounts, applyPeripheralFilters]);

  // Helper: Fetch and process products for a non-peripheral category
  const fetchCategoryProducts = useCallback(async (backendCategory, selectedCategory) => {
    try {
      setIsLoading(true);
      const params = buildQueryParams(backendCategory);
      const filterKeys = Object.keys(params).filter(key => !['category', 'page', 'limit', 'sort', 'order'].includes(key));
      const canUseCatalogBootstrap = filterKeys.length === 0
        && params.sort === 'name'
        && params.order === 'ASC';

      if (canUseCatalogBootstrap) {
        try {
          const bootstrapResponse = await stockAPI.getCatalogBootstrap({
            ...params,
            includeSpecRanges: true
          });
          const bootstrapData = bootstrapResponse.data?.data || {};
          const brands = Array.isArray(bootstrapData.brands) ? bootstrapData.brands : [];
          const brandCountsFromBootstrap = {};
          brands.forEach(brand => {
            if (brand?.name) {
              brandCountsFromBootstrap[brand.name] = brand.count || 0;
            }
          });

          setAvailableBrands(brands.map(brand => brand.name).filter(Boolean));
          setBrandCounts(brandCountsFromBootstrap);
          setTotalCategoryItems(bootstrapData.totalItems || bootstrapData.pagination?.totalItems || 0);

          if (bootstrapData.priceRange?.min != null && bootstrapData.priceRange?.max != null) {
            setPriceRange({
              min: bootstrapData.priceRange.min,
              max: bootstrapData.priceRange.max
            });
          }

          specMetaRef.current = Array.isArray(bootstrapData.specFields) ? bootstrapData.specFields : [];
          specRangesRef.current = bootstrapData.specRanges || {};

          const fetchedProducts = Array.isArray(bootstrapData.products)
            ? bootstrapData.products
            : extractProductsFromResponse(bootstrapResponse);
          const updatedProducts = fetchedProducts.map(normalizeProduct);
          setProducts(updatedProducts);
          return;
        } catch (bootstrapError) {
          if (bootstrapError?.code !== 'ERR_CANCELED' && bootstrapError?.name !== 'CanceledError') {
            console.warn(`Catalog bootstrap failed for ${backendCategory}; using stock endpoints`, bootstrapError.message);
          }
        }
      }

      // Fire brands, price range, and spec meta in parallel
      Promise.allSettled([
        fetchCategoryBrands(backendCategory),
        fetchCategoryPriceRange(backendCategory),
        fetchCategorySpecMeta(backendCategory)
      ]);

      const response = await stockAPI.getItems(params);
      const fetchedProducts = extractProductsFromResponse(response);

      if (fetchedProducts.length > 0) {
        const updatedProducts = fetchedProducts.map(normalizeProduct);

        setProducts(updatedProducts);
      } else {
        // Check brand filter issue
        if (selectedBrand && selectedBrand !== '') {
          try {
            const allCategoryParams = { category: backendCategory, page: 1, limit: 200 };
            const allCategoryResponse = await stockAPI.getItems(allCategoryParams);
            const allProducts = extractProductsFromResponse(allCategoryResponse);

            const availableBrandsInCategory = new Set(allProducts.map(p => p.brand).filter(Boolean));
            if (!availableBrandsInCategory.has(selectedBrand)) {
              setSelectedBrand('');
            }
          } catch (error) {
            if (error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
              console.error("Error checking brand availability:", error);
            }
          }
        }
        setProducts([]);
      }
    } catch (error) {
      if (error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
        console.error("Error fetching products:", error);
      }
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams, selectedBrand, selectedComponents, fetchCategoryBrands, fetchCategoryPriceRange, fetchCategorySpecMeta]);

  //Function to identify the fetch products listed above
  useEffect(() => {
    if (menuItems.length > 0 && selectedItem >= 0 && selectedItem < menuItems.length) {
      const selectedCategory = menuItems[selectedItem]?.category;
      const backendCategory = mapCategoryToBackend(selectedCategory);

      // ✅ NEW: Debounce to prevent rapid API calls on quick category switches
      const debounceTimer = setTimeout(() => {

      if (selectedCategory === 'Peripherals') {
        fetchPeripheralProducts();

      } else if (backendCategory) {
        console.log("Fetching products for category:", selectedCategory, "->", backendCategory);
        fetchCategoryProducts(backendCategory, selectedCategory);
      } else {
        // For home category or unmapped categories, show empty
        setProducts([]);
      }

      }, 150); // 150ms debounce for category switches (faster response)

      return () => clearTimeout(debounceTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem, selectedBrand, selectedPrice.min, selectedPrice.max, specFilters, sortOrder, activePeripheral, buildQueryParams, peripheralSubcategories, selectedComponents]); // ✅ Added selectedComponents for compatibility filtering

  // 🔥 NEW: Extract top 5 specification filters from current products
  useEffect(() => {
    if (!products || products.length === 0) {
      setAvailableSpecFilters({});
      return;
    }

    // Get current category
    const selectedCategory = menuItems[selectedItem]?.category;
    if (!selectedCategory || selectedCategory === 'home') {
      setAvailableSpecFilters({});
      return;
    }

    // Extract top specs using utility
    const topSpecFilters = extractTopSpecFilters(products, selectedCategory);
    setAvailableSpecFilters(topSpecFilters);

    console.log(`🔍 Top spec filters for ${selectedCategory}:`, topSpecFilters);
  }, [products, selectedItem]);

  // 🎯 COMPATIBLE-FIRST SORTING SYSTEM - Detect compatibility context from localStorage AND cart items
  useEffect(() => {
    // ✅ FIX: Always re-check cart on every render and category change
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

    // 🧹 CLEANUP: Remove null/undefined items from cart permanently
    const cleanedCart = cartItems.filter(item => item !== null && item !== undefined);
    if (cleanedCart.length !== cartItems.length) {
      console.log(`🧹 Cleaned cart: removed ${cartItems.length - cleanedCart.length} null items`);
      localStorage.setItem("cart", JSON.stringify(cleanedCart));
    }

    const nonPeripheralItems = cleanedCart.filter(item => {
      if (!item) return false; // 🔥 FIX: Skip null/undefined items (redundant but safe)
      const cat = item.category || '';
      return !['Mouse', 'Keyboard', 'Headphones', 'Speakers', 'Webcam'].includes(cat);
    });

    setCartItemsCount(nonPeripheralItems.length); // Update cart count state

    // If no non-peripheral items in cart, don't show compatibility
    if (nonPeripheralItems.length === 0) {
      const hasContext = localStorage.getItem('selectedComponentContext') !== null;
      if (hasContext) {
        setCompatibilityContext(null);
        setCompatibilityScores({});
        localStorage.removeItem('selectedComponentContext');
        console.log('🛒 Cart is empty or only has peripherals - compatibility disabled');
      }
      return;
    }

    const savedContext = localStorage.getItem('selectedComponentContext');
    if (savedContext) {
      try {
        const context = JSON.parse(savedContext);
        const now = Date.now();
        const contextTime = new Date(context.timestamp).getTime();
        const age = now - contextTime;
        const ageSeconds = Math.floor(age / 1000);

        // 🔥 ROOT CAUSE FIX #2: Add debug logging for timestamp issues
        console.log('🕐 Context timestamp check:', {
          now,
          contextTime,
          contextTimeValid: !Number.isNaN(contextTime),
          age,
          ageSeconds,
          timestamp: context.timestamp,
          expiresIn: Math.floor((10 * 60 * 1000 - age) / 1000) + 's'
        });

        // 🔥 ROOT CAUSE FIX #3: Handle invalid timestamps gracefully
        if (Number.isNaN(contextTime)) {
          console.error('❌ Invalid timestamp in context, removing:', context.timestamp);
          localStorage.removeItem('selectedComponentContext');
          setCompatibilityContext(null);
          return;
        }

        // 🔥 ROOT CAUSE FIX #4: Handle negative age (future timestamps)
        if (age < 0) {
          console.warn('⚠️ Context timestamp is in the future, treating as fresh:', context.timestamp);
          setCompatibilityContext(context);
          console.log('✅ Detected compatibility context (future timestamp):', context);
          return;
        }

        // ✅ FIX: Context never expires - only clears when cart is emptied
        // This ensures compatibility badges persist indefinitely while shopping
        setCompatibilityContext(context);
        console.log('✅ Detected compatibility context:', context, `(age: ${ageSeconds}s, never expires)`);

        // Note: Context will be cleared automatically when cart is emptied
        // See the cart change listener and "Cancel Order" / "Start Over" handlers
      } catch (error) {
        console.error('Error parsing compatibility context:', error);
        localStorage.removeItem('selectedComponentContext');
        setCompatibilityContext(null);
      }
    } else if (nonPeripheralItems.length > 0) {
      // ✅ NEW: Auto-create context from cart items even without ProductPage navigation
      console.log('🛒 Creating compatibility context from cart items:', nonPeripheralItems.length);
      const firstItem = nonPeripheralItems[0];
      const autoContext = {
        componentId: firstItem.id,
        componentName: firstItem.name,
        category: firstItem.category,
        specs: firstItem.specifications || {},
        tier: firstItem.tier || 'unknown',
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('selectedComponentContext', JSON.stringify(autoContext));
      setCompatibilityContext(autoContext);
      console.log('✅ Auto-created compatibility context from cart');
    }
  }, [selectedItem]); // Only re-check when category changes - compatibilityContext removed to prevent infinite loop

  // ✅ NEW: Listen for storage events (Start Over, Cancel Order buttons clearing cart)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cart' || e.key === null) {
        console.log('🔄 Storage changed - re-checking cart state');
        const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
        const nonPeripheralItems = cartItems.filter(item => {
          if (!item) return false; // 🔥 FIX: Skip null/undefined items
          const cat = item.category || '';
          return !['Mouse', 'Keyboard', 'Headphones', 'Speakers', 'Webcam'].includes(cat);
        });
        setCartItemsCount(nonPeripheralItems.length);
      }
    };

    // Listen for storage events from other tabs/windows
    globalThis.addEventListener('storage', handleStorageChange);

    // ✅ FIX: Removed setInterval polling - causes infinite loop
    // Cart updates are handled via:
    // 1. useEffect dependencies (selectedItem, cartItemsCount, compatibilityContext)
    // 2. storage event listener for cross-tab changes
    // 3. cartUpdated custom event dispatched after cart modifications

    return () => {
      globalThis.removeEventListener('storage', handleStorageChange);
    };
  }, [cartItemsCount]);

  // Fetch compatibility scores when context is available
  // 🔥 ROOT CAUSE FIX #1: Don't clear scores on re-render, only on meaningful changes
  useEffect(() => {
    if (!compatibilityContext) {
      // Only clear if context is explicitly removed (cart emptied)
      if (Object.keys(compatibilityScores).length > 0) {
        console.log('⚠️ Compatibility context removed - clearing scores');
        setCompatibilityScores({});
      }
      return;
    }

    if (!products || products.length === 0) {
      // Don't clear existing scores, just skip fetching
      console.log('⚠️ No products to analyze - keeping existing scores');
      return;
    }

    const fetchCompatibilityScores = async () => {
      setIsLoadingCompatibility(true);
      try {
        console.log('Fetching deterministic compatibility scores for', products.length, 'products...');

        // Get all cart items for comprehensive compatibility analysis
        const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
        const nonPeripheralCart = prepareCartForCompatibility(cartItems);

        console.log('🛒 Analyzing compatibility with', nonPeripheralCart.length, 'cart items');

        // ✅ FIX: NO BADGES ON EMPTY CART - Only proceed if cart has items
        if (nonPeripheralCart.length === 0) {
          console.log('⚠️ No valid items in cart with categories - clearing compatibility scores');
          setCompatibilityScores({});
          setIsLoadingCompatibility(false);
          return;
        }

        // ✅ CRITICAL FIX: Get current viewing category to match against products
        const currentViewingCategory = menuItems[selectedItem]?.category;

        console.log('🔍 Current viewing category:', currentViewingCategory);
        console.log('🛒 Cart items categories:', nonPeripheralCart.map(item => item.category).join(', '));
        console.log('📦 Total products in view:', products.length);

        // ✅ CRITICAL FIX: Check if viewing same category as any cart item
        const cartCategories = nonPeripheralCart.map(item => item.category);
        const isViewingSameCategoryAsCart = cartCategories.includes(currentViewingCategory);

        if (isViewingSameCategoryAsCart) {
          console.log('⚠️ Viewing same category as cart item - no compatibility analysis needed');
          // 🔥 ROOT CAUSE FIX #2: Don't clear scores when viewing same category!
          // Just skip the analysis, but keep existing scores
          setIsLoadingCompatibility(false);
          return;
        }

        // Call the deterministic batch endpoint once for the current product list
        console.log('Calling deterministic compatibility analysis for', nonPeripheralCart.length, 'cart items');
        console.log('📦 Current viewing category:', currentViewingCategory);
        console.log('🔍 Products in current view:', products.length);

        const scores = {};

        try {
          const apiScores = await fetchCompatibilityFromAPI(nonPeripheralCart, products, currentViewingCategory);
          Object.assign(scores, apiScores);
        } catch (error) {
          if (!isCanceledRequest(error)) {
            console.error('Failed to fetch deterministic compatibility scores:', error);
          }
        }

        setCompatibilityScores(scores);
        console.log('Deterministic compatibility scores loaded:', Object.keys(scores).length, 'products analyzed from', nonPeripheralCart.length, 'cart items');
      } catch (error) {
        if (!isCanceledRequest(error)) {
          console.error('Failed to fetch deterministic compatibility scores:', error);
        }
        // 🔥 ROOT CAUSE FIX #2: Don't clear scores on error - keep existing ones
        // This prevents badges from disappearing if a single API call fails
        console.log('⚠️ Keeping existing compatibility scores due to API error');
      } finally {
        setIsLoadingCompatibility(false);
      }
    };

    // Debounce to avoid too many API calls
    const timer = setTimeout(fetchCompatibilityScores, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatibilityContext, products, selectedItem]); // ✅ FIX: Excluded compatibilityScores from deps to prevent infinite loop

  // ✅ CRITICAL FIX: Sort and FILTER products by compatibility
  // PHASE 1 CRITICAL FIX - Addresses Gap Analysis Priority #1
  const sortedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let sorted = [...products];

    // Apply compatibility filtering/sorting if context exists
    if (compatibilityContext && Object.keys(compatibilityScores).length > 0) {
      // 🔴 CRITICAL: Define compatibility threshold (60 = acceptable, 85 = good)
      const COMPATIBILITY_THRESHOLD = 60;

      // Separate products by compatibility score
      const compatibleProducts = sorted.filter(p => {
        const score = compatibilityScores[p.id] || 0;
        return score >= COMPATIBILITY_THRESHOLD; // Only truly compatible products
      });

      const marginalProducts = sorted.filter(p => {
        const score = compatibilityScores[p.id] || 0;
        return score > 0 && score < COMPATIBILITY_THRESHOLD; // May work but not recommended
      });

      const unscored = sorted.filter(p => {
        const score = compatibilityScores[p.id] || 0;
        return score === 0; // Products with no score (unchecked)
      });

      // Sort compatible products by score (highest first)
      compatibleProducts.sort((a, b) => {
        const scoreA = compatibilityScores[a.id] || 0;
        const scoreB = compatibilityScores[b.id] || 0;
        return scoreB - scoreA;
      });

      marginalProducts.sort((a, b) => {
        const scoreA = compatibilityScores[a.id] || 0;
        const scoreB = compatibilityScores[b.id] || 0;
        return scoreB - scoreA;
      });

      // 🔥 CRITICAL FIX: Respect hideIncompatible toggle
      if (hideIncompatible) {
        // HIDE incompatible products (score < 60)
        sorted = [...compatibleProducts, ...unscored];
        // Removed excessive logging - only log on user action
      } else {
        // SHOW ALL products but sorted by compatibility
        sorted = [...compatibleProducts, ...marginalProducts, ...unscored];
        // Removed excessive logging - only log on user action
      }
    } else {
      // No compatibility context - apply regular sorting to all products
      sorted.sort((a, b) => {
        if (sortOrder.sort === 'name') {
          const comparison = a.name.localeCompare(b.name);
          return sortOrder.order === 'DESC' ? -comparison : comparison;
        } else if (sortOrder.sort === 'price') {
          const priceA = typeof a.price === 'number' ? a.price : 0;
          const priceB = typeof b.price === 'number' ? b.price : 0;
          return sortOrder.order === 'DESC' ? priceB - priceA : priceA - priceB;
        }
        return 0;
      });
    }

    return sorted;
  }, [products, compatibilityContext, compatibilityScores, sortOrder, hideIncompatible]);



  // Function to shuffle an array randomly
  const shuffleArray = (array) => array.sort(() => Math.random() - 1);


  //Function for the HotPicks and ValueForMoney (offline deterministic)
  useEffect(() => {
    const applyHomepageProducts = (homepage) => {
      const onSalePicks = (homepage.onSale || [])
        .map(normalizeSalePick)
        .filter(Boolean)
        .slice(0, 8);

      const hotPicks = (homepage.hotPicks || [])
        .map(product => normalizeHomepagePick(product, 'reason', 'Local stock pick'))
        .slice(0, 8);

      const valuePicks = (homepage.valueForMoney || [])
        .map(product => normalizeHomepagePick(product, 'reason', 'Local value pick'))
        .slice(0, 8);

      if (onSalePicks.length > 0) {
        setRandomOnSale(onSalePicks);
      }

      if (hotPicks.length > 0 || valuePicks.length > 0) {
        setRandomHotPicks(hotPicks);
        setRandomValueForMoney(valuePicks.length ? valuePicks : hotPicks);
        return true;
      }

      return false;
    };

    const fetchHomepageProducts = async () => {
      try {
        if (cachedHomepageProducts && applyHomepageProducts(cachedHomepageProducts)) {
          return;
        }

        const homepage = await realtimeKioskAPI.getHomepageProducts(8);
        cachedHomepageProducts = homepage;
        if (applyHomepageProducts(homepage)) {
          return;
        }

        const fallback = shuffleArray(await fetchFeaturedFallback());
        const fallbackHomepage = {
          onSale: [],
          hotPicks: fallback.slice(0, 8),
          valueForMoney: fallback.slice(8, 16)
        };
        cachedHomepageProducts = fallbackHomepage;
        applyHomepageProducts(fallbackHomepage);
      } catch (error) {
        console.warn('Error loading homepage product picks:', error);
        try {
          const fallback = shuffleArray(await fetchFeaturedFallback());
          const fallbackHomepage = {
            onSale: [],
            hotPicks: fallback.slice(0, 8),
            valueForMoney: fallback.slice(8, 16)
          };
          cachedHomepageProducts = fallbackHomepage;
          applyHomepageProducts(fallbackHomepage);
        } catch {
          setRandomHotPicks([]);
          setRandomValueForMoney([]);
        }
      }
    };

    if (cachedHomepageProducts && applyHomepageProducts(cachedHomepageProducts)) {
      homepageProductsLoadedRef.current = true;
      return;
    }

    if (homepageProductsLoadedRef.current || homepageProductsScheduledRef.current) {
      return;
    }

    homepageProductsScheduledRef.current = true;
    let timerStarted = false;
    const loadTimer = setTimeout(() => {
      timerStarted = true;
      homepageProductsLoadedRef.current = true;
      fetchHomepageProducts();
    }, 0);

    return () => {
      clearTimeout(loadTimer);
      if (!timerStarted && !cachedHomepageProducts) {
        homepageProductsScheduledRef.current = false;
        homepageProductsLoadedRef.current = false;
      }
    };
  }, []); // Only run once on mount

  // Real-time On Sale products fetch (NEW)
  useEffect(() => {
    if (homepageProductsLoadedRef.current || homepageProductsScheduledRef.current) {
      return undefined;
    }

    const fetchOnSaleProducts = async () => {
      onSaleRequestRef.current?.abort();
      const controller = new AbortController();
      onSaleRequestRef.current = controller;

      try {
        console.log('Fetching real-time On Sale products...');
        const saleProducts = await realtimeKioskAPI.getOnSaleProducts(8, { signal: controller.signal });

        if (controller.signal.aborted) return;

        if (!saleProducts.length) {
          setRandomOnSale([]);
          return;
        }

        const processedProducts = saleProducts.map(product => {
          const normalizedSalePick = normalizeSalePick(product);
          if (normalizedSalePick) return normalizedSalePick;
          const originalPrice = toNumericPrice(product.price);
          const salePrice = toNumericPrice(product.salePrice || product.sale_price || product.effectivePrice || product.price);
          const discountPercent = originalPrice > 0 && salePrice > 0 && salePrice < originalPrice
            ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
            : 0;

          return {
            ...product,
            image: api.utils.getFullImageUrl(product.imageUrl || product.image_url || product.file_path || product.image),
            originalPrice,
            salePrice,
            discountPercent,
            price: `₱${salePrice.toLocaleString()}`,
            formattedOriginalPrice: `₱${originalPrice.toLocaleString()}`,
            formattedSalePrice: `₱${salePrice.toLocaleString()}`
          };
        });
        setRandomOnSale(processedProducts);
      } catch (error) {
        if (!isCanceledRequest(error)) {
          console.error('Error fetching On Sale products:', error);
        }
        setRandomOnSale([]);
      } finally {
        if (onSaleRequestRef.current === controller) {
          onSaleRequestRef.current = null;
        }
      }
    };

    fetchOnSaleProducts();

    // Set up interval to refresh On Sale products every 5 minutes for real-time updates
    const interval = setInterval(fetchOnSaleProducts, 5 * 60 * 1000);

    return () => {
      onSaleRequestRef.current?.abort();
      clearInterval(interval);
    };
  }, []);

  // Debug: Log state changes to track offline homepage recommendations
  useEffect(() => {
    console.log('Hot Picks state updated:', randomHotPicks.length, 'items');
    console.log('Value for Money state updated:', randomValueForMoney.length, 'items');
    console.log('🛒 On Sale state updated:', randomOnSale.length, 'items');
  }, [randomHotPicks, randomValueForMoney, randomOnSale]);

  // Auto-refresh local recommendations every 10 minutes to show variety
  useEffect(() => {
    const rotateRecommendations = async () => {
      try {
        const categories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case'];
        const allProducts = (await fetchAllCategoryProducts(categories))
          .map(product => normalizeHomepagePick(product, 'reason', 'Local stock pick'));

        if (allProducts.length === 0) return;

        const shuffled = shuffleArray([...allProducts]);
        const valuePicks = [...allProducts]
          .filter(product => toNumericPrice(product.numericPrice || product.price) > 0)
          .sort((a, b) => toNumericPrice(a.numericPrice || a.price) - toNumericPrice(b.numericPrice || b.price));

        setRandomHotPicks(shuffled.slice(0, 8));
        setRandomValueForMoney((valuePicks.length ? valuePicks : shuffled).slice(0, 8));
      } catch (error) {
        if (!isCanceledRequest(error)) {
          console.warn('Homepage product rotation failed:', error);
        }
      }
    };

    // Rotate every 10 minutes (600000ms)
    const rotationInterval = setInterval(rotateRecommendations, 10 * 60 * 1000);

    return () => clearInterval(rotationInterval);
  }, []); // Only run once on mount

  // ✅ NEW: Carousel auto-rotation for Hot Picks and Value for Money
  useEffect(() => {
    const carouselInterval = setInterval(() => {
      setCarouselStartIndex(prevIndex => {
        const maxItems = Math.max(randomHotPicks.length, randomValueForMoney.length);
        if (maxItems <= ITEMS_PER_PAGE) return 0; // No rotation needed

        const nextIndex = prevIndex + ITEMS_PER_PAGE;
        // Loop back to start when reaching end
        return nextIndex >= maxItems ? 0 : nextIndex;
      });
    }, ROTATION_INTERVAL);

    return () => clearInterval(carouselInterval);
  }, [randomHotPicks.length, randomValueForMoney.length]);



  //Function for every Category or Components
  const handleMenuItemClick = (index) => {
    setSelectedItem(index);
    // ✅ FIXED: Reset filters when switching categories to prevent empty results
    setSelectedBrand('');
    setSelectedPrice({ min: '', max: '' });
    setSpecFilters({});
    setSortOrder({ sort: 'name', order: 'ASC' });
    setActivePeripheral(null);
  };



  //Function for Product-List
  const handleProductClick = (category, product, index) => {
    const normalizedProduct = normalizeKioskProduct(product, { category });
    // Ensure we have a valid product with all necessary data
    console.log('🖱️ Product clicked:', { category, product, index });

    // Fallback if category is undefined - try to get from product object
    const safeCategory = category || normalizedProduct.category || product.category || "unknown-category";

    // Ensure price is a valid number before parsing
    const formattedPrice = (() => {
      if (typeof product.price === "number") return product.price;
      if (typeof product.price === "string") return Number.parseFloat(product.price.replaceAll(/[^\d.]/g, "")) || 0;
      return 0;
    })();

    // Create comprehensive product data for ProductPage
    // 🔥 CRITICAL FIX: Ensure proper handling of NULL/empty data
    const productDescription = normalizedProduct.description || product.description || product.details;
    const productSpecs = normalizedProduct.specifications || product.specifications;

    // Resolve specifications: keep valid objects, fallback to string
    const resolvedSpecs = (() => {
      if (productSpecs == null || productSpecs === '') return "No specifications provided.";
      if (typeof productSpecs === 'object' && Object.keys(productSpecs).length === 0) return "No specifications provided.";
      return productSpecs;
    })();

    const productData = {
      productName: product.name || "Unknown Product",
      productPrice: formattedPrice,
      productImage: normalizedProduct.image || "./assets/default.png",
      image: normalizedProduct.image,
      imageUrl: normalizedProduct.imageUrl,
      image_url: normalizedProduct.image_url,
      imagePath: normalizedProduct.imagePath,
      details: productDescription && productDescription !== ''
        ? productDescription
        : "No details available.",
      specifications: resolvedSpecs,
      brand: product.brand || "Unknown Brand",
      stock: product.stock || 0,
      category: normalizedProduct.category || safeCategory,
      categoryKey: normalizedProduct.categoryKey,
      id: normalizedProduct.id || product.id,
      previousCategory: selectedItem, // Store the selected category index
    };

    console.log('📦 Navigating to product page with data:', productData);

    const routeId = normalizedProduct.id || product.id || `${safeCategory}-${index}`;
    navigate(`/product/${routeId}`, {
      state: productData
    });
  };

  // TASK 5: Comparison Handlers
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
  };

  // ✅ FIX: Make event parameter optional to handle both click sources
  const handleCompareSelect = (product, e = null) => {
    if (e) {
      e.stopPropagation(); // Prevent product click navigation only if event exists
    }

    const productId = product.id || product.name;
    const isSelected = selectedForCompare.some(p => (p.id || p.name) === productId);

    console.log('🔄 Compare selection changed:', {
      product: product.name,
      productId,
      isSelected,
      currentCount: selectedForCompare.length
    });

    if (isSelected) {
      // Remove from selection
      const newSelection = selectedForCompare.filter(p => (p.id || p.name) !== productId);
      setSelectedForCompare(newSelection);
      console.log('➖ Removed product, new count:', newSelection.length);
    } else if (selectedForCompare.length < 2) {
      // Add to selection (max 2)
      const newSelection = [...selectedForCompare, product];
      setSelectedForCompare(newSelection);
      console.log('➕ Added product, new count:', newSelection.length);

      // Auto-show modal when 2 products selected
      if (newSelection.length === 2) {
        console.log('🎯 2 products selected! Ready to compare');
      }
    } else {
      // Replace oldest selection
      const newSelection = [selectedForCompare[1], product];
      setSelectedForCompare(newSelection);
      console.log('🔄 Replaced oldest selection, new count:', newSelection.length);
    }
  };

  const handleStartComparison = () => {
    console.log('🔍 Starting comparison...');
    console.log('Selected products:', selectedForCompare);
    console.log('Selected count:', selectedForCompare.length);

    if (selectedForCompare.length === 2) {
      console.log('✅ Opening comparison modal');
      setShowCompareModal(true);
    } else {
      console.warn('⚠️ Need exactly 2 products, currently have:', selectedForCompare.length);
    }
  };

  const handleCloseComparison = () => {
    setShowCompareModal(false);
  };



  // ✅ Direct add to cart (called after validation passes or user confirms)
  const addProductToCartDirect = (product) => {
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingItemIndex = existingCart.findIndex(
      item => item.name === product.name
    );

    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity =
        (existingCart[existingItemIndex].quantity || 1) + 1;
    } else {
      existingCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(existingCart));
    setCartCount(existingCart.reduce((sum, item) => sum + (item.quantity || 1), 0));
    globalThis.dispatchEvent(new Event('cartUpdated'));

    console.log('✅ Product added to cart');
  };

  // ✅ Handle add to cart from main product grid
  const handleAddToCartFromComparison = (product) => {
    console.log('🛍️ handleAddToCartFromComparison called:', product.name);
    // Add directly to cart (validation happens at checkout)
    addProductToCartDirect(product);
  };


  //Function for clickable LargeBox at Home page
  const handleLargeBoxClick = (page) => navigate(`/${page}`);


  // Toggle filter pop-up
  //Function for Filter & Sort
  const toggleFilterPopup = () => setShowFilter(!showFilter);
  const handleClearAll = () => {
    setSelectedBrand(''); // ✅ FIXED: Clear single brand selection
    setSelectedPrice({ min: priceRange.min, max: priceRange.max });
    setSpecFilters({});
    setSortOrder({ sort: 'name', order: 'ASC' });
    setActivePeripheral(null);
  };

  // ✅ ENHANCED: Brand selection handler with immediate UI feedback
  const handleBrandSelect = (brand) => {
    // Immediately update UI for instant responsiveness (no debounce for UI)
    const newBrand = brand === selectedBrand ? '' : brand;
    setSelectedBrand(newBrand);

    // The useEffect will handle the API call with debouncing automatically
  };

  // Close pop-up when clicking outside
  const handleOutsideClick = (e) => {
    if (e.target?.classList?.contains("popup-overlay")) {
      setShowFilter(false);
    }
  };

  // Extracted handlers to reduce nesting depth
  const handleQuantityDecrease = (e, product) => {
    e.stopPropagation();
    const productId = product.id || product.name;
    const qty = getProductQuantityInCart(product.name);
    if (qty === 1) {
      const updatedCart = cart.filter(item => item.name !== product.name);
      setCart(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      globalThis.dispatchEvent(new Event('cartUpdated'));
      setExpandedProducts(prev => ({ ...prev, [productId]: false }));
      if (expandTimers[productId]) {
        clearTimeout(expandTimers[productId]);
        setExpandTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[productId];
          return newTimers;
        });
      }
    } else {
      const updatedCart = cart.map(item => {
        if (item.name === product.name) {
          const newQty = item.quantity - 1;
          return { ...item, quantity: newQty, totalPrice: item.totalPrice - (item.totalPrice / item.quantity) };
        }
        return item;
      });
      setCart(updatedCart);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      globalThis.dispatchEvent(new Event('cartUpdated'));
      startAutoCollapseTimer(productId);
    }
  };

  const handleQuantityIncrease = (e, product, idx) => {
    e.stopPropagation();
    const productId = product.id || product.name;
    handleProductClick(product.category, product, idx);
    startAutoCollapseTimer(productId);
  };

  const handleExpandQuantity = (e, product) => {
    e.stopPropagation();
    const productId = product.id || product.name;
    setExpandedProducts(prev => ({ ...prev, [productId]: true }));
    startAutoCollapseTimer(productId);
  };

  const handleClearSpecFilter = (specKey) => {
    const newFilters = { ...specFilters };
    delete newFilters[specKey];
    setSpecFilters(newFilters);
  };

  const handleSetSpecFilter = (specKey, value) => {
    setSpecFilters({ ...specFilters, [specKey]: value });
  };

  const handleToggleSpecSection = (specKey) => { // NOSONAR - used in IIFE JSX below
    const newOpenState = { ...specSectionOpen };
    newOpenState[specKey] = !newOpenState[specKey];
    setSpecSectionOpen(newOpenState);
  };

  const renderSpecFilterValues = (specKey, values, currentValue) => ( // NOSONAR - used in IIFE JSX below
    <div className="filter-options">
      <button
        className={`filter-btn ${currentValue ? '' : 'active'}`}
        onClick={() => handleClearSpecFilter(specKey)}
      >All</button>
      {values.map(value => (
        <button
          key={value}
          className={`filter-btn ${currentValue === value ? 'active' : ''}`}
          onClick={() => handleSetSpecFilter(specKey, value)}
        >
          {value}
        </button>
      ))}
    </div>
  );

  const renderCancelOrderModal = () => ( // NOSONAR - used in IIFE JSX below
    <div className="pc-customized-modal-overlay">
      <div className="pc-customized-modal-background"></div>
      <div className="pc-customized-modal">
        <div className="pc-customized-modal-icon" />
        <h2 className="pc-customized-modal-title">
          ARE YOU SURE YOU WANT TO<br /><span>CANCEL ORDER?</span>
        </h2>
        <div className="pc-customized-modal-buttons">
          <button className="pc-customized-modal-btn" onClick={() => setShowCancelOrderModal(false)}>NO</button>
          <button className="pc-customized-modal-btn yes" onClick={() => { setShowCancelOrderModal(false); handleCancelOrder(); }}>Yes</button>
        </div>
      </div>
    </div>
  );

  const renderStartOverModal = () => ( // NOSONAR - used in IIFE JSX below
    <div className="pc-customized-modal-overlay">
      <div className="pc-customized-modal-background"></div>
      <div className="pc-customized-modal">
        <div className="pc-customized-modal-icon" />
        <h2 className="pc-customized-modal-title">ARE YOU SURE YOU WANT TO<br /><span>START OVER?</span></h2>
        <div className="pc-customized-modal-buttons">
          <button className="pc-customized-modal-btn" onClick={() => setShowStartOverModal(false)}>NO</button>
          <button className="pc-customized-modal-btn yes" onClick={() => { setShowStartOverModal(false); handleStartOver(); }}>Yes</button>
        </div>
      </div>
    </div>
  );


  return (() => ( // NOSONAR - IIFE pattern used for React JSX scoping
    <div className="pc-parts-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo1">
          <img src={logoComponent} alt="PC Wise" className="logo" />
        </div>

        {/* Home Button - Separated */}
        <div className="home-section">
          <button
            className={`menu-item home-button ${selectedItem === 0 ? "active" : "inactive"}`}
            onClick={() => handleMenuItemClick(0)}
          >
            <div className="menu-item-image">
              <img src={menuItems[0].image} alt={menuItems[0].name} />
            </div>
            <span className="menu-item-text">{menuItems[0].name}</span>
          </button>
        </div>

        {/* Categories Section - Separated */}
        <div className="categories-section">
          <div className="section-divider"></div>
          <div className="menu">
            {menuItems.slice(1).map((item, index) => (
              <button
                key={index + 1}
                className={`menu-item ${selectedItem === index + 1 ? "active" : "inactive"}`}
                onClick={() => handleMenuItemClick(index + 1)}
              >
                <div className="menu-item-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <span className="menu-item-text">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* Main Content with Scrollbar */}
      <div className="main-content">
        {menuItems[selectedItem].category === "home" ? (
          <div className="home-content">
            <h2 className="home-title">Welcome to PC Wise</h2>

            <section className="home-section">
              <div className="carousel-container">
                <div className="carousel-slider">
                  <button type="button" className="carousel-slide" tabIndex={0} onClick={() => handleLargeBoxClick("whats-new-1")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLargeBoxClick("whats-new-1"); }}>
                    <div className="home-large-box">
                      <img src={PCWise} className="carousel-image" alt="What's new" />
                    </div>
                  </button>
                  <button type="button" className="carousel-slide" tabIndex={0} onClick={() => handleLargeBoxClick("whats-new-2")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLargeBoxClick("whats-new-2"); }}>
                    <div className="home-large-box">
                      <img src={Frame} className="carousel-image" alt="What's new" />
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* Discounted Section */}
            <section className="home-section">
              <h3>Discounted</h3>
              <div className="home-grid">
                {randomOnSale.map((product, index) => (
                    <button
                      type="button"
                      className="home-box"
                      key={product.id}
                      tabIndex={0}
                      onClick={() => handleProductClick(product.category, product, index)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleProductClick(product.category, product, index); }}
                    >
                      <div className="home-box-image-container">
                        <KioskProductImage
                          product={product}
                          alt={product.name}
                          className="home-box-image"
                          fallbackSrc={SystemUnit1}
                          sizes="180px"
                          width="180"
                          height="180"
                        />
                        {product.discountPercent > 0 && (
                          <div className="home-sale-badge">
                            {product.discountPercent}% OFF
                          </div>
                        )}
                      </div>
                      <p className="home-box-name">{product.name}</p>
                      <div className="home-sale-pricing">
                        <p className="home-sale-price">{product.formattedSalePrice}</p>
                      </div>
                    </button>
                ))}
              </div>
            </section>


            {/* Value for Money Section */}
            {randomValueForMoney.length > 0 && (
              <section className="home-section">
                <h3>Value for Money 💰</h3>
                <div className="home-grid">
                  {/* ✅ NEW: Show carousel slice (4 items from rotating pool) */}
                  {randomValueForMoney
                    .slice(carouselStartIndex, carouselStartIndex + ITEMS_PER_PAGE)
                    .concat(
                      // Loop back to start if not enough items
                      carouselStartIndex + ITEMS_PER_PAGE > randomValueForMoney.length
                        ? randomValueForMoney.slice(0, Math.max(0, (carouselStartIndex + ITEMS_PER_PAGE) - randomValueForMoney.length))
                        : []
                    )
                    .map((product, index) => (
                    <button
                      type="button"
                      className="home-box"
                      key={product.id || index}
                      tabIndex={0}
                      onClick={() => handleProductClick(product.category, product, index)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleProductClick(product.category, product, index); }}
                    >
                      <KioskProductImage
                        product={product}
                        alt={product.name}
                        className="home-box-image"
                        fallbackSrc={SystemUnit1}
                        sizes="180px"
                        width="180"
                        height="180"
                      />
                      <p className="home-box-name">{product.name}</p>
                      <p className="home-box-price">{product.price}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Hot Picks Section */}
            {randomHotPicks.length > 0 && (
              <section className="home-section">
                <h3>Hot Picks🔥</h3>
                <div className="home-grid">
                  {/* ✅ NEW: Show carousel slice (4 items from rotating pool) */}
                  {randomHotPicks
                    .slice(carouselStartIndex, carouselStartIndex + ITEMS_PER_PAGE)
                    .concat(
                      // Loop back to start if not enough items
                      carouselStartIndex + ITEMS_PER_PAGE > randomHotPicks.length
                        ? randomHotPicks.slice(0, Math.max(0, (carouselStartIndex + ITEMS_PER_PAGE) - randomHotPicks.length))
                        : []
                    )
                    .map((product, index) => (
                    <button
                      type="button"
                      className="home-box"
                      key={product.id || index}
                      tabIndex={0}
                      onClick={() => handleProductClick(product.category, product, index)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleProductClick(product.category, product, index); }}
                    >
                      <KioskProductImage
                        product={product}
                        alt={product.name}
                        className="home-box-image"
                        fallbackSrc={SystemUnit1}
                        sizes="180px"
                        width="180"
                        height="180"
                      />
                      <p className="home-box-name">{product.name}</p>
                      <p className="home-box-price">{product.price}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          // Product List
          <>
            {/* Category Header Section */}
            <div className={`category-header-section ${menuItems[selectedItem].category === 'Peripherals' && activePeripheral === null ? 'peripheral-grid-mode' : ''}`}>
              <h2 className="category-title-parts">
                {menuItems[selectedItem].category === 'Peripherals' && activePeripheral
                  ? activePeripheral
                  : menuItems[selectedItem].name}
                <span className="category-count">[{products.length}]</span>
              </h2>

            {/* Brands & Filter Section - Hide when showing peripheral category grid */}
            {!(menuItems[selectedItem].category === 'Peripherals' && activePeripheral === null) && (
            <div className="pc-parts-brands-filter-section">
              <div className="pc-parts-brand-section">
                {/* ✅ NEW: Brand Dropdown (Single Selection) */}
                <div className="pc-parts-brand-dropdown-container">
                  <button
                    type="button"
                    className="pc-parts-brand-dropdown-trigger"
                    onClick={() => setBrandDropdownOpen(!brandDropdownOpen)}
                  >
                    <span>
                      {selectedBrand || 'All Brands'} ({selectedBrand ? (brandCounts[selectedBrand] || 0) : totalCategoryItems})
                    </span>
                    <span className={`dropdown-arrow ${brandDropdownOpen ? 'open' : ''}`}>
                      <img src={dropdown} alt="Dropdown Arrow" />
                    </span>
                  </button>

                  {brandDropdownOpen && (
                    <div className="pc-parts-brand-dropdown-menu">
                      {/* All Brands option */}
                      <button
                        type="button"
                        className={selectedBrand === '' ? 'active' : ''}
                        onClick={() => {
                          handleBrandSelect('');
                          setBrandDropdownOpen(false);
                        }}
                      >
                        All Brands ({totalCategoryItems})
                      </button>

                      {/* Individual brand options */}
                      {availableBrands && availableBrands.length > 0 ? (
                        availableBrands.map((brand) => {
                          const brandCount = brandCounts[brand] || 0;
                          const active = selectedBrand === brand;
                          return (
                            <button
                              type="button"
                              key={brand}
                              className={active ? 'active' : ''}
                              onClick={() => {
                                handleBrandSelect(brand);
                                setBrandDropdownOpen(false);
                              }}
                            >
                              {brand} ({brandCount})
                            </button>
                          );
                        })
                      ) : (
                        <button type="button" disabled>No Brands Available</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Filter & Sort Button */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginRight: '5px', }}>
                <button className="pc-parts-filter-button" onClick={toggleFilterPopup}> <img src={filter} alt="Filter Icon" />FILTER & SORT</button>

                {/* TASK 5: Compare Mode Toggle Button */}
                <button
                  className={`pc-parts-filter-button ${compareMode ? 'comparing-active' : ''}`}
                  onClick={toggleCompareMode}
                >
                  <img src={compare} alt="Compare Icon" />
                  {compareMode ? 'COMPARING...' : 'COMPARE'}
                </button>
              </div>
            </div>
            )}

            {/* TASK 5: Comparison Bar - Shows when 2 products selected (hide when modal is open) */}
            {compareMode && selectedForCompare.length > 0 && !showCompareModal && (
              <div className="comparison-floating-bar">
                <span className="comparison-floating-count">
                  {selectedForCompare.length} product{selectedForCompare.length === 1 ? '' : 's'} selected
                </span>
                {selectedForCompare.length === 2 && (
                  <button className="comparison-floating-button"
                    onClick={handleStartComparison}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                  Compare
                  </button>
                )}
                <button className="comparison-floating-clear"
                  onClick={() => setSelectedForCompare([])}
                >
                  Clear
                </button>
              </div>
            )}
            </div>

            {/* Peripheral Subcategory Boxes - Show when no specific peripheral is selected */}
            {menuItems[selectedItem].category === 'Peripherals' && activePeripheral === null ? (
              <div className="peripherals-category-grid">
                {peripheralSubcategories.map((subcat) => {
                  // Map subcategory to imported icon images
                  const subcatIcons = {
                    'Monitor': monitor,
                    'Keyboard': keyboard,
                    'Mouse': mouse,
                    'Headphones': headphone,
                    'Speaker': speaker,
                    'Speakers': speaker,
                    'Webcam': webcam
                  };

                  const iconSrc = subcatIcons[subcat] || monitor; // Default to monitor if not found

                  return (
                    <button
                      type="button"
                      key={subcat}
                      className="peripheral-category-box"
                      tabIndex={0}
                      onClick={() => setActivePeripheral(subcat)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePeripheral(subcat); } }}
                    >
                      <div className="peripheral-category-icon">
                        <img src={iconSrc} alt={`${subcat} icon`} />
                      </div>
                      <div className="peripheral-category-name">{subcat.toUpperCase()}

                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Product List */}
                <div className="scroll-container">
                  {/* REMOVED: Compatibility Context Banner - Using inline tags instead for cleaner UI */}

                  {/* FIXED: Use dedicated products-grid for consistent 3-column layout */}
                  <div className="products-grid">
                {(isLoading || isLoadingCompatibility) && (
                  <div className="loading-indicator">
                    <div className="loading-spinner"></div>
                    <p>{isLoadingCompatibility ? 'Analyzing compatibility...' : 'Loading products...'}</p>
                  </div>
                )}
                {!isLoading && !isLoadingCompatibility && sortedProducts && sortedProducts.length > 0 && (
                  sortedProducts.map((product, idx) => {
                    const productId = product.id || product.name;
                    const isSelectedForCompare = selectedForCompare.some(
                      p => (p.id || p.name) === productId
                    );

                    // ✅ FIX: Cart check for badge display
                    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
                    const hasNonPeripheralInCart = cartItems.some(item => {
                      if (!item) return false; // 🔥 FIX: Skip null/undefined items
                      const cat = item.category || '';
                      return !['Mouse', 'Keyboard', 'Headphones', 'Speakers', 'Webcam', 'Monitor'].includes(cat);
                    });

                    // 🔥 CRITICAL FIX: Get cart item categories (what user already selected)
                    const cartCategories = cartItems
                      .filter(item => {
                        if (!item) return false; // 🔥 FIX: Skip null/undefined items
                        const cat = item.category || '';
                        return !['Mouse', 'Keyboard', 'Headphones', 'Speakers', 'Webcam', 'Monitor'].includes(cat);
                      })
                      .map(item => item.category);

                    // 🔥 CRITICAL FIX: Check if current viewing category is in cart
                    const currentViewingCategory = menuItems[selectedItem]?.category;
                    const isViewingSameCategoryAsCart = cartCategories.includes(currentViewingCategory);

                    // 🔥 CRITICAL FIX: Check if this product's category is peripheral
                    const isPeripheralProduct = ['Mouse', 'Keyboard', 'Headphones', 'Speakers', 'Webcam', 'Monitor'].includes(product.category);

                    const compatibilityScore = compatibilityScores[product.id] || 0;
                    const isCompatible = compatibilityScore > 0;

                    // 🔥 CRITICAL FIX: Badge should show when:
                    // 1. Cart has non-peripheral items
                    // 2. Currently viewing category is NOT in cart (e.g., cart has CPU, viewing Cooling)
                    // 3. This product is NOT a peripheral
                    // 4. Product has compatibility score
                    const shouldShowBadge = hasNonPeripheralInCart && !isViewingSameCategoryAsCart && !isPeripheralProduct && compatibilityScore > 0;

                    // 🔍 DEBUG: Log badge conditions for first 3 products
                    if (VERBOSE_KIOSK_LOGS && idx < 3) {
                      console.log(`🏷️ Badge Check [${product.name}]:`, {
                        hasNonPeripheralInCart,
                        cartCategories,
                        currentViewingCategory,
                        isViewingSameCategoryAsCart,
                        isPeripheralProduct,
                        isCompatible,
                        compatibilityScore,
                        productCategory: product.category,
                        shouldShowBadge
                      });
                    }

                    return (
                      <div
                        role="button"
                        key={product.id || `${product.name}-${idx}`}
                        className={`product-item ${isSelectedForCompare ? 'selected-for-compare' : ''} ${shouldShowBadge ? 'compatible-product' : ''}`}
                        tabIndex={0}
                        onClick={() => {
                          // ✅ FIX: In compare mode, clicking card toggles selection
                          if (compareMode) {
                            handleCompareSelect(product);
                          } else {
                            handleProductClick(
                              menuItems[selectedItem]?.category || "unknown",
                              product,
                              idx
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (compareMode) {
                              handleCompareSelect(product);
                            } else {
                              handleProductClick(menuItems[selectedItem]?.category || "unknown", product, idx);
                            }
                          }
                        }}
                        style={{
                          cursor: 'pointer', // ✅ FIX: Always show pointer cursor
                          position: 'relative',
                          height: '229px',
                          // ✅ FIX: Background when selected in compare mode
                          backgroundColor: isSelectedForCompare ? '#03644D' : 'transparent'
                        }}
                        aria-label={compareMode ? `Toggle comparison for ${product.name}` : `View details for ${product.name}`}
                      >
                        {/* ✅ COMPATIBLE BADGE - Only show when:
                            1. Cart has non-peripheral items (CPU, Cooling, Motherboard, GPU, RAM, Storage, PSU, Case)
                            2. Currently viewing category is NOT in cart (e.g., cart has CPU, viewing Cooling - SHOW badge)
                            3. This product is NOT a peripheral (exclude Monitor, Keyboard, Mouse, etc.)
                            4. Product has compatibility score > 0
                        */}

                        {/* ✅ NOT COMPATIBLE BADGE - Only show when:
                            1. Cart has non-peripheral items
                            2. Currently viewing category is NOT in cart
                            3. This product is NOT a peripheral
                            4. Product has compatibility score = 0 (not compatible)
                        */}

                        {/* TASK 5: Compare Checkbox */}
                        {compareMode && (
                          <div className="compare-checkbox-container">
                            <input
                              type="checkbox"
                              className={`compare-checkbox ${isSelectedForCompare ? 'checked' : ''}`}
                              checked={isSelectedForCompare}
                              onChange={() => {}} // Controlled by parent click
                            />
                          </div>
                        )}

                        {/* Product Image */}
                        <div
                          className="product-image-container"
                        >
                          <KioskProductImage
                            product={product}
                            alt={product.name}
                            className="product-image"
                            fallbackSrc={SystemUnit1}
                            sizes="(max-width: 768px) 45vw, 220px"
                            width="220"
                            height="220"
                          />

                          {/* ✅ TIER BADGE REMOVED FROM KIOSK VIEW
                              Tier data is still sent to backend for deterministic compatibility filtering
                              but NOT displayed to users. This is admin-only information.

                              Previous code (REMOVED):
                              - Displayed tier badges (Entry, Mid, High, Elite)
                              - Confused users with internal classification system
                              - Replaced with Compatible/Not Compatible tags only
                          */}
                        </div>
                        {/* Product Details */}
                        <div className="product-container">
                        <div className="product-details">
                          <p className="product-names">{product.name}</p>
                          <p className="product-price">
                            ₱{(product.price && product.price > 0)
                              ? product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : "0.00"}
                          </p>

                        </div>
                        {/* Hide add-product button when in compare mode */}
                        {!compareMode && (
                          <>
                            {getProductQuantityInCart(product.name) > 0 && expandedProducts[product.id || product.name] && (
                                // STATE 2: Show full controls (delete - quantity - +)
                                <div className="pc-parts-quantity-controls">
                                  <button
                                    className="pc-parts-quantity-btn delete-btn"
                                    onClick={(e) => handleQuantityDecrease(e, product)}
                                  >
                                    {getProductQuantityInCart(product.name) === 1 ? (
                                      <img src={deleteIcon} alt="Delete" style={{ width: '13px', height: '14px' }} />
                                    ) : (
                                      <img src={minusIcon} alt="Minus" style={{ width: '14px', height: '2px' }} />
                                    )}
                                  </button>
                                  <span className="pc-parts-quantity-number">{getProductQuantityInCart(product.name)}</span>
                                  <button
                                    className="pc-parts-quantity-btn add-btn"
                                    onClick={(e) => handleQuantityIncrease(e, product, idx)}
                                  >
                                    <img src={addIcon} alt="Add" style={{ width: '14px', height: '14px' }} />
                                  </button>
                                </div>
                            )}
                            {getProductQuantityInCart(product.name) > 0 && !expandedProducts[product.id || product.name] && (
                                // STATE 1: Show just quantity number (clickable to expand)
                                <button
                                  type="button"
                                  className="pc-parts-add-product in-cart-collapsed"
                                  tabIndex={0}
                                  onClick={(e) => handleExpandQuantity(e, product)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpandQuantity(e, product); } }}
                                >
                                  {getProductQuantityInCart(product.name)}
                                </button>
                            )}
                            {getProductQuantityInCart(product.name) === 0 && (
                              // Show add button when not in cart
                              <button
                                type="button"
                                className="pc-parts-add-product"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCartFromComparison(product);
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleAddToCartFromComparison(product); } }}
                                style={{ cursor: 'pointer' }}
                              >
                                +
                              </button>
                            )}
                          </>
                        )}
                        </div>
                      </div>
                    );
                  })
                )}
                {!isLoading && !isLoadingCompatibility && (!sortedProducts || sortedProducts.length === 0) && (
                  <div className="no-products-message">
                    <p>No products available for the selected criteria.</p>
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="pc-parts-bottom-section">
        <div className="pc-parts-process-container">

          {/* Left: Cart icon, TOTAL, and price */}
          <div className="pc-parts-order-info">
            <button
              type="button"
              className="pc-parts-cart-icon"
              data-count="0"
              tabIndex={0}
              onClick={() => navigate("/order-summary", { state: { from: "pc-parts" } })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/order-summary", { state: { from: "pc-parts" } }); } }}
              style={{ cursor: 'pointer' }}
            >
              <img src={Chest} alt="Cart Icon" />
              <span className="pc-parts-notification">{cartCount}</span>
            </button>
            <div className="pc-parts-total-label">
              <span className="pc-parts-total">TOTAL</span>
              <span className="pc-parts-price">
                ₱{totalPrice > 0
                  ? totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "0.00"}
              </span>
            </div>
          </div>

          {/* Right: Order Summary and action buttons */}
          <div className="pc-parts-right-buttons">
            <button
              className={`pc-parts-order-summary ${cartCount === 0 ? 'disabled' : ''}`}
              onClick={() => {
                if (cartCount > 0) {
                  // ✅ ENHANCED: Trigger compatibility validation before navigation
                  setShowCompatibilityValidationModal(true);
                }
              }}
              disabled={cartCount === 0}
            >
              Order Summary
            </button>

            <div className="pc-parts-action-buttons">
              <button
                className="pc-parts-cancel-order"
                onClick={() => {
                  if (cartCount === 0) {
                    // When cart is empty, act as Back button
                    navigate("/transaction");
                  } else {
                    // When cart has items, show cancel modal
                    setShowCancelOrderModal(true);
                  }
                }}
              >
                {cartCount === 0 ? 'Back' : 'Cancel Order'}
              </button>
              <button className="pc-parts-start-over" onClick={() => setShowStartOverModal(true)}>Start Over</button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Comprehensive Filter & Sort Modal */}
      {showFilter && (
        <div className="popup-overlay" role="none" onClick={handleOutsideClick} onKeyDown={(e) => { if (e.key === 'Escape') handleOutsideClick(e); }}>
          <dialog open className="popup" aria-modal="true" aria-label="Filter and Sort"> {/* NOSONAR - dialog is natively interactive */}
            <div className="filter-header-top">
              <h3 className="popup-title">FILTER & SORT</h3>
              <button className="clear-all-btn" onClick={handleClearAll}>Clear All</button>
            </div>

            {/* ✅ REMOVED: Brand section (now handled outside modal) */}

            {/* Price Range Filter */}
            <div className="filter-section">
              <div className="filter-header">
                <span>PRICE RANGE</span>
                <button onClick={() => setPriceOpen(!priceOpen)} className="toggle-button">
                  {priceOpen ? "−" : "+"}
                </button>
              </div>
              {priceOpen && (
                <div className="price-filter-content">
                  <div className="price-range-display">
                    <span>₱{priceRange.min?.toLocaleString()} - ₱{priceRange.max?.toLocaleString()}</span>
                  </div>
                  <div className="price-inputs">
                    <div className="price-input-group">
                      <label>Min: ₱{selectedPrice.min || priceRange.min}</label>
                      <input
                        type="range"
                        min={priceRange.min}
                        max={priceRange.max}
                        step="100"
                        value={selectedPrice.min || priceRange.min}
                        onChange={e => setSelectedPrice(p => ({ ...p, min: e.target.value }))}
                        className="price-slider"
                      />
                    </div>
                    <div className="price-input-group">
                      <label>Max: ₱{selectedPrice.max || priceRange.max}</label>
                      <input
                        type="range"
                        min={priceRange.min}
                        max={priceRange.max}
                        step="100"
                        value={selectedPrice.max || priceRange.max}
                        onChange={e => setSelectedPrice(p => ({ ...p, max: e.target.value }))}
                        className="price-slider"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Options */}
            <div className="filter-section">
              <div className="filter-header">
                <span>SORT BY</span>
                <button onClick={() => setSortOpen(!sortOpen)} className="toggle-button">
                  {sortOpen ? "−" : "+"}
                </button>
              </div>
              {sortOpen && (
                <div className="filter-options">
                  <button
                    className={`filter-btn ${sortOrder.sort === 'name' && sortOrder.order === 'ASC' ? 'active' : ''}`}
                    onClick={() => setSortOrder({ sort: 'name', order: 'ASC' })}
                  >Name (A-Z)</button>
                  <button
                    className={`filter-btn ${sortOrder.sort === 'name' && sortOrder.order === 'DESC' ? 'active' : ''}`}
                    onClick={() => setSortOrder({ sort: 'name', order: 'DESC' })}
                  >Name (Z-A)</button>
                  <button
                    className={`filter-btn ${sortOrder.sort === 'price' && sortOrder.order === 'ASC' ? 'active' : ''}`}
                    onClick={() => setSortOrder({ sort: 'price', order: 'ASC' })}
                  >Price (Low to High)</button>
                  <button
                    className={`filter-btn ${sortOrder.sort === 'price' && sortOrder.order === 'DESC' ? 'active' : ''}`}
                    onClick={() => setSortOrder({ sort: 'price', order: 'DESC' })}
                  >Price (High to Low)</button>
                </div>
              )}
            </div>

            {/* 🔥 NEW: Top 5 Dynamic Specification Filters - Same UI as CustomizedProducts */}
            {Object.entries(availableSpecFilters).map(([specKey, values]) => {
              // Format spec key for display (convert snake_case to Title Case)
              const displayName = formatSpecKey(specKey);

              // Skip if only one value (no point filtering)
              if (values.length <= 1) return null;

              const isOpen = specSectionOpen[specKey];
              const currentValue = specFilters[specKey];

              return (
                <div key={specKey} className="filter-section">
                  <div className="filter-header">
                    <span>{displayName}</span>
                    <button
                      className="toggle-button"
                      onClick={() => handleToggleSpecSection(specKey)}
                    >
                      {isOpen ? "−" : "+"}
                    </button>
                  </div>

                  {isOpen && renderSpecFilterValues(specKey, values, currentValue)}
                </div>
              );
            })}

          </dialog>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelOrderModal && renderCancelOrderModal()}

      {/* Start Over Confirmation Modal */}
      {showStartOverModal && renderStartOverModal()}

      {/* TASK 5: Product Comparison Modal */}
      {showCompareModal && selectedForCompare.length === 2 && (
        <React.Suspense fallback={null}>
          <CompareProducts
            products={selectedForCompare}
            onClose={handleCloseComparison}
            onAddToCart={handleAddToCartFromComparison}
          />
        </React.Suspense>
      )}

      {/* ✅ Enhanced Compatibility Validation Modal for Order Summary */}
      {showCompatibilityValidationModal && (
        <React.Suspense fallback={null}>
          <CompatibilityValidationModal
            isOpen={showCompatibilityValidationModal}
            cartItems={cart}
            pageName="PC-Parts"
            onClose={() => setShowCompatibilityValidationModal(false)}
            onProceed={() => {
              setShowCompatibilityValidationModal(false);
              navigate("/order-summary", { state: { from: "pc-parts" } });
            }}
          />
        </React.Suspense>
      )}

    </div>
  ))();
}

export default PCParts;

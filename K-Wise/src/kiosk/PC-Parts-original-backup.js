import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import "./PC-Parts.css";
import "./PCCustomized.css";
import PCWise from "../assets/PCWise.webp";
import logo1 from "../assets/LOGO1.webp";
import Vector from "../assets/Vector (3).webp"
import Chest from "../assets/Chest.webp";
import Frame from "../assets/Frame 138.webp";
import { stockAPI } from "../services/api";

// Component Images
import CPU1 from "../assets/CPU1.webp";
import Ryzen from "../assets/Ryzen.webp";
import IntelCorei5 from "../assets/IntelCorei5.webp";
import IntelCorei7 from "../assets/IntelCorei7.webp";
import COOLMANREYNA from "../assets/COOLMANREYNA.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import GigabyteMotherboard from "../assets/GigabyteMotherboard.webp";
import B550MK from "../assets/B550M-K.webp";
import ASrockMotherboard from "../assets/ASrockMotherboard.webp";
import AsusMotherboard from "../assets/AsusMotherboard.webp";
import GPU1 from "../assets/GPU1.webp";
import RX550 from "../assets/RX550.webp";
import RX580 from "../assets/RX580.webp";
import RX6600 from "../assets/RX6600.webp";
import RX7600XT from "../assets/RX7600XT.webp";
import RX7700XT from "../assets/RX7700XT.webp";
import RX7800XT from "../assets/RX7800XT.webp";
import RTX4060 from "../assets/RTX4060.webp";
import RTX4060Ti from "../assets/RTX4060Ti.webp";
import RTX4060TiColorful from "../assets/RTX4060TiColorful.webp";
import RTX4070 from "../assets/RTX4070.webp";
import RTX4070Colorful from "../assets/RTX4070Colorful.webp";
import Ram from "../assets/Ram.webp";
import GB8Team from "../assets/8GBTeam.webp";
import GB16Team from "../assets/16GBTeam.webp";
import GB16Kingston from "../assets/16GBKingston.webp";
import GB16TForceDarkZa from "../assets/16GBTForceDarkZa.webp";
import GB16TFORCEBlack from "../assets/16GBTFORCEBlack.webp";
import GB16TFORCEWhite from "../assets/16GBTFORCEWhite.webp";
import GB32GSkillTridentZ from "../assets/32GBG.SKILLTridentZ.webp";
import Storage1 from "../assets/Storage1.webp";
import WDGREEN from "../assets/WDGREEN.webp";
import TFORCEVULCAN from "../assets/TFORCEVULCAN.webp";
import SAMSUNG870EVO from "../assets/SAMSUNG870EVO.webp";
import WDBLUEGEN4 from "../assets/WDBLUEGEN4.webp";
import WDGREENGEN3 from "../assets/WDGREENGEN3.webp";
import TEAMGROUPMP33PRO from "../assets/TEAMGROUPMP33PRO.webp";
import XPGSX8200PROGEN4 from "../assets/XPGSX8200PROGEN4.webp";
import PSU1 from "../assets/PSU1.webp";
import YGTKY750 from "../assets/YGTKY750.webp";
import COUGARSTC500 from "../assets/COUGARSTC500.webp";
import CORSAIRCX550 from "../assets/CORSAIRCX550.webp";
import FSPVITAGM from "../assets/FSPVITAGM.webp";
import GIGABYTEP550SS from "../assets/GIGABYTEP550SS.webp";
import GIGABYTEP550SSSILVERWhite from "../assets/GIGABYTEP550SSSILVERWhite.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import YGTMARS8 from "../assets/YGTMARS8.webp";
import KEYTECHROBINLITE from "../assets/KEYTECHROBINLITE.webp";
import KEYTECHROBINVIEW from "../assets/KEYTECHROBINVIEW.webp";
import INPLAYOPENVIEWV100 from "../assets/INPLAYOPENVIEWV100.webp";
import PlayerMIKU2 from "../assets/PlayerMIKU2.webp";
import DARKFLASHDB330M from "../assets/DARKFLASHDB330M.webp";
import LIANLIO11DynamicMINI from "../assets/LIANLIO11DynamicMINI.webp";
import Peripheral from "../assets/Peripheral.webp";
import LogitechG502HERO from "../assets/LogitechG502HERO.webp";
import RazerDeathAdderV2 from "../assets/RazerDeathAdderV2.webp";
import SteelSeriesApex3KL from "../assets/SteelSeriesApex3KL.webp";
import HyperXAlloyOriginsCore from "../assets/HyperXAlloyOriginsCore.webp";
import RazerBlackSharkV2X from "../assets/RazerBlackSharkV2X.webp";
import LogitechG435Wireless from "../assets/LogitechG435Wireless.webp";
import SteelSeriesQcKHeavyMousePad from "../assets/SteelSeriesQcKHeavyMousePad.webp";
import HyperXPulsefireHaste from "../assets/HyperXPulsefireHaste.webp";


// Sample Product Data (Replace with your database fetch logic)
export const menuItems = [
  { name: "Home", image: Vector, category: "home" },
  {
    name: "Central Processing Unit",
    image: CPU1,
    category: "cpu",
    brands: ["AMD", "Intel"],
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
  image: COOLMANREYNA,
  category: "cpucooler",
  brands: ["Deepcool", "Darkflash", "Thermalright"],
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
{
  name: "Motherboard",
  image: Motherboard1,
  category: "motherboard",
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
  name: "Graphics Card",
  image: GPU1,
  category: "graphcard",
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
  name: "Random Access Memory",
  image: Ram,
  category: "ram",
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
  category: "storage",
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
  category: "power supply",
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
  category: "case",
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
{
  name: "Monitor",
  image: "./assets/monitor.png", // Replace with your monitor image asset if available
  category: "monitor",
  products: [
    {
      name: "20' NVISION LED MONITOR (60HZ)",
      price: "PHP 2,498",
      details: "20-inch NVISION LED monitor with 60Hz refresh rate.",
      specifications: "20\" | LED | 60Hz | IN STOCK"
    },
    {
      name: "22' NVISION IPS FRAMELESS MONITOR (100HZ, Black)",
      price: "PHP 3,698",
      details: "22-inch NVISION IPS frameless monitor, 100Hz, black.",
      specifications: "22\" | IPS | Frameless | 100Hz | Black | SOLD OUT"
    },
    {
      name: "22' NVISION IPS FRAMELESS MONITOR (100HZ, White)",
      price: "PHP 3,798",
      details: "22-inch NVISION IPS frameless monitor, 100Hz, white.",
      specifications: "22\" | IPS | Frameless | 100Hz | White | SOLD OUT"
    },
    {
      name: "24' NVISION IPS FRAMELESS MONITOR (100HZ, White)",
      price: "PHP 4,498",
      details: "24-inch NVISION IPS frameless monitor, 100Hz, white.",
      specifications: "24\" | IPS | Frameless | 100Hz | White | SOLD OUT"
    },
    {
      name: "24' HKC IPS FRAMELESS MONITOR (100HZ)",
      price: "PHP 4,598",
      details: "24-inch HKC IPS frameless monitor, 100Hz.",
      specifications: "24\" | IPS | Frameless | 100Hz | SOLD OUT"
    },
    {
      name: "27' HKC IPS FRAMELESS MONITOR (100HZ)",
      price: "PHP 5,998",
      details: "27-inch HKC IPS frameless monitor, 100Hz.",
      specifications: "27\" | IPS | Frameless | 100Hz | IN STOCK"
    },
    {
      name: "24' HKC FRAMELESS MONITOR (180HZ)",
      price: "PHP 5,998",
      details: "24-inch HKC frameless monitor, 180Hz.",
      specifications: "24\" | Frameless | 180Hz | IN STOCK"
    },
    {
      name: "34' HKC MG34H2UB ULTRA WIDE CURVE (165HZ, 1440P)",
      price: "PHP 14,498",
      details: "34-inch HKC ultra wide curved monitor, 165Hz, 1440p.",
      specifications: "34\" | Ultra Wide | Curved | 165Hz | 1440p | IN STOCK"
    },
    {
      name: "24' VIEWSONIC IPS FRAMELESS MONITOR (100HZ, Black)",
      price: "PHP 4,998",
      details: "24-inch ViewSonic IPS frameless monitor, 100Hz, black.",
      specifications: "24\" | IPS | Frameless | 100Hz | Black | SOLD OUT"
    },
    {
      name: "24' VIEWSONIC IPS FRAMELESS MONITOR (100HZ, Pink)",
      price: "PHP 6,298",
      details: "24-inch ViewSonic IPS frameless monitor, 100Hz, pink.",
      specifications: "24\" | IPS | Frameless | 100Hz | Pink | IN STOCK"
    },
    {
      name: "24' VIEWSONIC IPS FRAMELESS MONITOR (240HZ)",
      price: "PHP 7,998",
      details: "24-inch ViewSonic IPS frameless monitor, 240Hz.",
      specifications: "24\" | IPS | Frameless | 240Hz | IN STOCK"
    },
    {
      name: "27' VIEWSONIC IPS FRAMELESS MONITOR (240HZ)",
      price: "PHP 9,998",
      details: "27-inch ViewSonic IPS frameless monitor, 240Hz.",
      specifications: "27\" | IPS | Frameless | 240Hz | IN STOCK"
    },
    {
      name: "27' VIEWSONIC IPS FRAMELESS MONITOR (240HZ, 1440P)",
      price: "PHP 16,998",
      details: "27-inch ViewSonic IPS frameless monitor, 240Hz, 1440p.",
      specifications: "27\" | IPS | Frameless | 240Hz | 1440p | SOLD OUT"
    },
    {
      name: "22' ACER IPS FRAMELESS MONITOR (100HZ)",
      price: "PHP 4,198",
      details: "22-inch Acer IPS frameless monitor, 100Hz.",
      specifications: "22\" | IPS | Frameless | 100Hz | IN STOCK"
    },
    {
      name: "24.5' ACER IPS FRAMELESS MONITOR (120HZ)",
      price: "PHP 5,498",
      details: "24.5-inch Acer IPS frameless monitor, 120Hz.",
      specifications: "24.5\" | IPS | Frameless | 120Hz | IN STOCK"
    },
    {
      name: "24' ACER IPS FRAMELESS MONITOR (180HZ)",
      price: "PHP 7,498",
      details: "24-inch Acer IPS frameless monitor, 180Hz.",
      specifications: "24\" | IPS | Frameless | 180Hz | IN STOCK"
    },
    {
      name: "24' ACER IPS FRAMELESS MONITOR (200HZ)",
      price: "PHP 7,998",
      details: "24-inch Acer IPS frameless monitor, 200Hz.",
      specifications: "24\" | IPS | Frameless | 200Hz | IN STOCK"
    },
    {
      name: "24' SAMSUNG IPS FRAMELESS MONITOR (100HZ)",
      price: "PHP 5,998",
      details: "24-inch Samsung IPS frameless monitor, 100Hz.",
      specifications: "24\" | IPS | Frameless | 100Hz | IN STOCK"
    },
    {
      name: "24' ASUS TUF IPS FRAMELESS MONITOR (180HZ)",
      price: "PHP 8,999",
      details: "24-inch ASUS TUF IPS frameless monitor, 180Hz.",
      specifications: "24\" | IPS | Frameless | 180Hz | IN STOCK"
    },
    {
      name: "27' ASUS TUF IPS FRAMELESS MONITOR (180HZ, 1440p)",
      price: "PHP 15,495",
      details: "27-inch ASUS TUF IPS frameless monitor, 180Hz, 1440p.",
      specifications: "27\" | IPS | Frameless | 180Hz | 1440p | IN STOCK"
    },
    {
      name: "34' ASUS TUF ULTRA WIDE CURVE (180HZ, 1440P)",
      price: "PHP 19,995",
      details: "34-inch ASUS TUF ultra wide curved monitor, 180Hz, 1440p.",
      specifications: "34\" | Ultra Wide | Curved | 180Hz | 1440p | IN STOCK"
    }
  ],
  brands: [
    "NVISION", "HKC", "VIEWSONIC", "ACER", "SAMSUNG", "ASUS"
  ]
},
  { name: "Peripherals", image: Peripheral , category: "peripherals", products: [
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
        const numericPrice = product.price.toString().replace(/[^\d.]/g, "");
        // Parse to float and format with 2 decimal places
        const formattedPrice = parseFloat(numericPrice).toLocaleString(undefined, {
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
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  cartIcon.setAttribute("data-count", cartCount);
};



function PCParts() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [showFilter, setShowFilter] = useState(false); // Pop-up state
  const [manufacturerOpen, setManufacturerOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [randomHotPicks, setRandomHotPicks] = useState([]);
  const [randomValueForMoney, setRandomValueForMoney] = useState([]);
  const [randomOnSale, setRandomOnSale] = useState([]);
  const [cart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);


  // Restore selected category if coming back from ProductPage
  const [selectedItem, setSelectedItem] = useState(() => {
    const categoryIndex = location.state?.selectedCategory;
    return categoryIndex >= 0 && categoryIndex < menuItems.length ? categoryIndex : 0;
  });



  //Fucntion to notify the products being added to cart
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    setCartCount(cartCount); // ✅ Use cartCount instead of totalItems
  }, [cart]);



  //Function to compute the total price
  const getPrice = (item) => {
    if (!item || !item.price) {
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
      let numericString = price.replace(/[^\d.-]/g, "");
      
      // Handle cases like "PHP 1,234.56" or "₱1,234.56"
      if (numericString.includes(',')) {
        numericString = numericString.replace(/,/g, '');
      }
      
      const parsed = parseFloat(numericString);
      const result = isNaN(parsed) ? 0 : parsed;
      console.log('💰 getPrice: String price:', price, '→ numericString:', numericString, '→ parsed:', result);
      return result;
    }
    
    console.log('💰 getPrice: Unknown price format, returning 0');
    return 0;
  };

  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const calculateTotalPrice = () => {
      const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
      console.log('💰 Calculating total price for cart items:', cartItems);
      
      const total = cartItems.reduce((acc, item, index) => {
        const itemPrice = getPrice(item);
        const quantity = item.quantity || 1;
        const itemTotal = itemPrice * quantity;
        
        console.log(`💰 Item ${index + 1}:`, {
          name: item.name,
          price: item.price,
          parsedPrice: itemPrice,
          quantity: quantity,
          itemTotal: itemTotal
        });
        
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

    window.addEventListener("cartReset", handleCartReset);
    return () => window.removeEventListener("cartReset", handleCartReset);
  }, []);



  // Function to clear cart and reset values when clicking button cancel-item and start-over
  const clearCart = () => {
    localStorage.removeItem("cart");  // Clear cart from localStorage
    setCartCount(0);                  // Reset cart count
    setTotalPrice(0);                  // Reset total price
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
      'cpu': 'CPU',
      'cpu-cooler': 'Cooling',
      'motherboard': 'Motherboard', 
      'ram': 'RAM',
      'storage': 'Storage',
      'graphcard': 'GPU',
      'case': 'Case',
      'power supply': 'PSU',
      'monitor': 'Monitor',
      'peripherals': 'Keyboard', // Default peripherals to keyboard for now
      'home': null
    };
    return categoryMapping[frontendCategory] || null;
  };

  //Function to identify the fetch products listed above
  useEffect(() => {
    if (menuItems.length > 0 && selectedItem >= 0 && selectedItem < menuItems.length) {
      const selectedCategory = menuItems[selectedItem]?.category;
      const backendCategory = mapCategoryToBackend(selectedCategory);

      if (backendCategory) {
        console.log("Fetching products for category:", selectedCategory, "->", backendCategory);

        // Use API call instead of static data
        const fetchProducts = async () => {
          try {
            const response = await stockAPI.getByCategory(backendCategory);
            console.log("API Response:", response);
            
            // ✅ Better handling of different response structures
            let fetchedProducts = [];
            
            if (response && response.data) {
              if (Array.isArray(response.data.products)) {
                fetchedProducts = response.data.products;
              } else if (Array.isArray(response.data)) {
                fetchedProducts = response.data;
              } else if (response.data.results && Array.isArray(response.data.results)) {
                fetchedProducts = response.data.results;
              }
            } else if (Array.isArray(response)) {
              fetchedProducts = response;
            }
            
            console.log("Processed fetchedProducts:", fetchedProducts);
            
            // ✅ Ensure we have an array before mapping
            if (Array.isArray(fetchedProducts) && fetchedProducts.length > 0) {
              const updatedProducts = fetchedProducts.map(product => ({
                ...product,
                price: product.price
                  ? Number(product.price.toString().replace(/[^\d.]/g, "")) // ✅ Extracts only numbers
                  : null,  // ✅ Use null for unavailable prices
                details: product.details || product.description || "No details available",
                specifications: product.specifications || product.specs || "No specifications provided"
              }));

              setProducts(updatedProducts);
            } else {
              console.warn("No valid products found in API response");
              // Fallback to existing sample products from menuItems if API returns empty
              const currentCategory = menuItems[selectedItem];
              setProducts(currentCategory?.products || []);
            }
          } catch (error) {
            console.error("Error fetching products:", error);
            console.log("Falling back to sample products for category:", selectedCategory);
            // Fallback to sample products from menuItems if API fails
            const currentCategory = menuItems[selectedItem];
            setProducts(currentCategory?.products || []);
          }
        };

        fetchProducts();
      } else {
        // For home category or unmapped categories, show empty
        setProducts([]);
      }
    }
  }, [selectedItem]);




  // Function to shuffle an array randomly
  const shuffleArray = (array) => array.sort(() => Math.random() - 1);


  //Function for the HotPicks and ValueForMoney (Initial Function)
  useEffect(() => {
    if (!menuItems || menuItems.length === 0) {
      console.error("menuItems is undefined or empty!");
      return;
    }

    // Extract all products and flatten the array
    const allProducts = menuItems.flatMap((category) =>
      category.products?.map((product) => ({
        ...product,
        category: category.category, // Attach category info
      })) || []
    );


    // Shuffle and select best hot picks and value-for-money products
    const shuffledProducts = shuffleArray([...allProducts]);

    setRandomHotPicks(shuffledProducts.slice(0, 5)); // Pick first 9 for Hot Picks
    setRandomValueForMoney(shuffledProducts.slice(5, 10)); // Pick next 6 for Value for Money
    setRandomOnSale(shuffledProducts.slice(10, 15));
  }, []);



  //Function for every Category or Components
  const handleMenuItemClick = (index) => setSelectedItem(index);



  //Function for Product-List
  const handleProductClick = (category, product, index) => {
    // Fallback if category is undefined
    const safeCategory = category || "unknown-category";

    // Ensure price is a valid number before parsing
    const formattedPrice =
      typeof product.price === "number"
        ? product.price
        : (typeof product.price === "string"
          ? parseFloat(product.price.replace(/[^\d.]/g, "")) || 0
          : 0);

    navigate(`/product/${safeCategory}-${index}`, {
      state: {
        productName: product.name,
        productPrice: formattedPrice,
        productImage: product.image || "./assets/default.png",
        details: product.details || "No details available.",
        specifications: product.specifications || "No specifications provided.",
        previousCategory: selectedItem, // ✅ Store the selected category index
      }
    });
  };


  //Function for clickable LargeBox at Home page
  const handleLargeBoxClick = (page) => navigate(`/${page}`);


  // Toggle filter pop-up
  //Function for Filter & Sort
  const toggleFilterPopup = () => setShowFilter(!showFilter);

  // Close pop-up when clicking outside
  const handleOutsideClick = (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("popup-overlay")) {
      setShowFilter(false);
    }
  };


  return (
    <div className="pc-parts-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo1">
          <img src={logo1} alt="PC Wise" className="logo" />
        </div>
        <div className="menu">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className={`menu-item ${selectedItem === index ? "active" : "inactive"}`}
              onClick={() => handleMenuItemClick(index)}
            >
              <div className="menu-item-image">
                <img src={item.image} alt={item.name} />
              </div>
              <span className="menu-item-text">{item.name}</span>
            </button>
          ))}
        </div>
        {/* Back Button at the Bottom */}
        <div className="back-button-container">
          <button className="back-button" onClick={() => navigate("/transaction")}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
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
                  <div className="carousel-slide" onClick={() => handleLargeBoxClick("whats-new-1")}>
                    <div className="home-large-box">
                      <img src={PCWise} className="carousel-image" alt="What's new" />
                    </div>
                  </div>
                  <div className="carousel-slide" onClick={() => handleLargeBoxClick("whats-new-2")}>
                    <div className="home-large-box">
                      <img src={Frame} className="carousel-image" alt="What's new" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Hot Picks Section */}
            <section className="home-section">
              <h3>On Sale🏷️</h3>
              <div className="home-grid">
                {randomOnSale.map((product, index) => (
                  <div
                    className="home-box"
                    key={product.id}
                    onClick={() => handleProductClick(product.category, product, index)}
                  >
                    <img src={product.image} alt={product.name} className="home-box-image" />
                    <p className="home-box-name">{product.name}</p>
                    <p className="home-box-price">{product.price}</p>
                  </div>
                ))}
              </div>
            </section>


            {/* Value for Money Section */}
            <section className="home-section">
              <h3>Value for Money💰</h3>
              <div className="home-grid">
                {randomValueForMoney.map((product, index) => (
                  <div
                    className="home-box"
                    key={product.id}
                    onClick={() => handleProductClick(product.category, product, index)}
                  >
                    <img src={product.image} alt={product.name} className="home-box-image" />
                    <p className="home-box-name">{product.name}</p>
                    <p className="home-box-price">{product.price}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="home-section">
              <h3>Hot Picks🔥</h3>
              <div className="home-grid">
                {randomHotPicks.map((product, index) => (
                  <div
                    className="home-box"
                    key={product.id}
                    onClick={() => handleProductClick(product.category, product, index)}
                  >
                    <img src={product.image} alt={product.name} className="home-box-image" />
                    <p className="home-box-name">{product.name}</p>
                    <p className="home-box-price">{product.price}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          // Product List
          <>
            {/* Product Category Header */}
            <div className="category-header">
              <h2 className="category-title">{menuItems[selectedItem].name}</h2>
              <span className="category-count">[{products.length}]</span>
            </div>

            <div className="brand-filter-container">
              <div className="brand-section">
                <p className="brand-label">Brands:</p>
                <div className="brand-list">
                  {menuItems[selectedItem].brands?.map((brand, index) => (
                    <div key={index} className="brand-item">
                      <span>{brand}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter & Sort Button */}
              <button className="filter-button" onClick={toggleFilterPopup}>FILTER & SORT</button>
            </div>


            {/* Product List */}
            <div className="scroll-container">
              <div className="grid">
                {products && products.length > 0 ? (
                  products.map((product, idx) => (
                    <button
                      key={`${product.name}-${idx}`} // ✅ Ensure unique key by combining name and index
                      className="grid-item"
                      onClick={() =>
                        handleProductClick(
                          menuItems[selectedItem]?.category || "unknown",
                          product,
                          idx
                        )
                      }
                      aria-label={`View details for ${product.name}`}
                    >
                      <div className="dot"></div>
                      {/* ✅ Product image */}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-thumbnail"
                      />
                      <div>{product.name}</div>
                      <div className="price">
                        ₱{(product.price && product.price > 0)
                          ? product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : "0.00"}
                      </div>
                    </button>
                  ))
                ) : (
                  <p>No products available.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="pc-parts-bottom-section">
        <div className="pc-parts-process-container">

          {/* Left: Cart icon, TOTAL, and price */}
          <div className="pc-parts-order-info">
            <div className="pc-parts-cart-icon" data-count="0">
              <img src={Chest} alt="Cart Icon" />
              <span className="pc-parts-notification">{cartCount}</span>
            </div>
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
              className="pc-parts-order-summary"
              onClick={() => navigate("/order-summary", { state: { from: "pc-parts" } })}
            >
              Order Summary
            </button>

            <div className="pc-parts-action-buttons">
              <button className="pc-parts-cancel-order" onClick={() => setShowCancelOrderModal(true)}> Cancel Order </button>
              <button className="pc-parts-start-over" onClick={() => setShowStartOverModal(true)}>Start Over</button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Sort Pop-up */}
      {showFilter && (
        <div className="popup-overlay" onClick={handleOutsideClick}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="popup-title">FILTER & SORT</h3>
            <p className="clear-all">Clear All</p>

            {/* Manufacturer Filter */}
            <div className="filter-section">
              <div className="filter-header">
                <span>MANUFACTURER</span>
                <button onClick={() => setManufacturerOpen(!manufacturerOpen)} className="toggle-button">
                  {manufacturerOpen ? "−" : "+"}
                </button>
              </div>
              {manufacturerOpen && (
                <div className="filter-options">
                  <button className="filter-btn active">ALL</button>
                  <button className="filter-btn">AMD</button>
                  <button className="filter-btn">Intel</button>
                </div>
              )}
            </div>

            {/* Series Filter */}
            <div className="filter-section">
              <div className="filter-header">
                <span>SERIES</span>
                <button onClick={() => setSeriesOpen(!seriesOpen)} className="toggle-button">
                  {seriesOpen ? "−" : "+"}
                </button>
              </div>
              {seriesOpen && (
                <div className="filter-options">
                  <button className="filter-btn active">ALL</button>
                  <button className="filter-btn">AMD Ryzen</button>
                  <button className="filter-btn">Intel Core</button>
                </div>
              )}
            </div>

            {/* Price Filter */}
            <div className="filter-section">
              <div className="filter-header">
                <span>PRICE</span>
                <button onClick={() => setPriceOpen(!priceOpen)} className="toggle-button">
                  {priceOpen ? "−" : "+"}
                </button>
              </div>
              {priceOpen && (
                <div className="price-slider">
                  <span>₱0</span>
                  <input type="range" min="0" max="99999" step="1000" />
                  <span>₱99999</span>
                </div>
              )}
            </div>

            {/* Games Filter */}
            <div className="filter-section">
              <div className="filter-header">
                <span>GAMES</span>
                <button onClick={() => setGamesOpen(!gamesOpen)} className="toggle-button">
                  {gamesOpen ? "−" : "+"}
                </button>
              </div>
              {gamesOpen && (
                <div className="filter-options">
                  <button className="filter-btn active">DOTA 2</button>
                  <button className="filter-btn">MINECRAFT</button>
                  <button className="filter-btn">LEFT4DEAD 2</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelOrderModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">
              ARE YOU SURE YOU WANT TO<br /><span>CANCEL ORDER?</span>
            </h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowCancelOrderModal(false)}
              >
                NO
              </button>
              <button
                className="pc-customized-modal-btn yes"
                onClick={() => {
                  setShowCancelOrderModal(false);
                  handleCancelOrder();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Over Confirmation Modal */}
      {showStartOverModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
            <div className="pc-customized-modal-icon" />
            <h2 className="pc-customized-modal-title">ARE YOU SURE YOU WANT TO<br /><span>START OVER?</span></h2>
            <div className="pc-customized-modal-buttons">
              <button
                className="pc-customized-modal-btn"
                onClick={() => setShowStartOverModal(false)}
              >
                NO
              </button>
              <button
                className="pc-customized-modal-btn yes"
                onClick={() => {
                  setShowStartOverModal(false);
                  handleStartOver();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default PCParts;

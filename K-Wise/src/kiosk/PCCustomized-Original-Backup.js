import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import "./PCCustomized.css";
import Customized from "../assets/Customized.webp";
import CPU1 from "../assets/CPU1.webp";
import CPUCooler from "../assets/CPUCooler.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import GPU1 from "../assets/GPU1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";
import PSU1 from "../assets/PSU1.webp";
import SystemUnit1 from "../assets/SystemUnit1.webp";
import RX550 from "../assets/RX550.webp";
import RX580 from "../assets/RX580.webp";
import RX7600XT from "../assets/RX7600XT.webp";
import RX7700XT from "../assets/RX7700XT.webp";
import RX7800XT from "../assets/RX7800XT.webp";
import RTX4060 from "../assets/RTX4060.webp";
import RTX4060Ti from "../assets/RTX4060Ti.webp";
import RTX4060TiColorful from "../assets/RTX4060TiColorful.webp";
import RTX4070 from "../assets/RTX4070.webp";
import RTX4070Colorful from "../assets/RTX4070Colorful.webp";
import Chest from "../assets/Chest.webp";
import RX6600 from "../assets/RX6600.webp";
import B550MK from "../assets/B550M-K.webp";
import Ryzen from "../assets/Ryzen.webp";
import IntelCorei5 from "../assets/IntelCorei5.webp";
import IntelCorei7 from "../assets/IntelCorei7.webp";
import AsusMotherboard from "../assets/AsusMotherboard.webp";
import GigabyteMotherboard from "../assets/GigabyteMotherboard.webp";
import ASrockMotherboard from "../assets/ASrockMotherboard.webp";
import GB8Team from "../assets/8GBTeam.webp";
import GB16Team from "../assets/16GBTeam.webp";
import GB16Kingston from "../assets/16GBKingston.webp";
import GB16TFORCEBlack from "../assets/16GBTFORCEBlack.webp";
import GB16TForceDarkZa from "../assets/16GBTForceDarkZa.webp";
import GB16TFORCEWhite from "../assets/16GBTFORCEWhite.webp";
import GB32GSkillTridentZ from "../assets/32GBG.SKILLTridentZ.webp";
import TFORCEVULCAN from "../assets/TFORCEVULCAN.webp";
import SAMSUNG870EVO from "../assets/SAMSUNG870EVO.webp";
import WDGREEN from "../assets/WDGREEN.webp";
import WDGREENGEN3 from "../assets/WDGREENGEN3.webp";
import WDBLUEGEN4 from "../assets/WDBLUEGEN4.webp";
import TEAMGROUPMP33PRO from "../assets/TEAMGROUPMP33PRO.webp";
import XPGSX8200PROGEN4 from "../assets/XPGSX8200PROGEN4.webp";
import YGTKY750 from "../assets/YGTKY750.webp";
import COUGARSTC500 from "../assets/COUGARSTC500.webp";
import CORSAIRCX550 from "../assets/CORSAIRCX550.webp";
import FSPVITAGM from "../assets/FSPVITAGM.webp";
import GIGABYTEP550SS from "../assets/GIGABYTEP550SS.webp";
import GIGABYTEP550SSSILVERWhite from "../assets/GIGABYTEP550SSSILVERWhite.webp";
import YGTMARS8 from "../assets/YGTMARS8.webp";
import KEYTECHROBINLITE from "../assets/KEYTECHROBINLITE.webp";
import KEYTECHROBINVIEW from "../assets/KEYTECHROBINVIEW.webp";
import INPLAYOPENVIEWV100 from "../assets/INPLAYOPENVIEWV100.webp";
import PlayerMIKU2 from "../assets/PlayerMIKU2.webp";
import DARKFLASHDB330M from "../assets/DARKFLASHDB330M.webp";
import COOLMANREYNA from "../assets/COOLMANREYNA.webp";
import LIANLIO11DynamicMINI from "../assets/LIANLIO11DynamicMINI.webp";
import LogitechG502HERO from "../assets/LogitechG502HERO.webp";
import RazerDeathAdderV2 from "../assets/RazerDeathAdderV2.webp";
import SteelSeriesApex3KL from "../assets/SteelSeriesApex3KL.webp";
import HyperXAlloyOriginsCore from "../assets/HyperXAlloyOriginsCore.webp";
import RazerBlackSharkV2X from "../assets/RazerBlackSharkV2X.webp";
import LogitechG435Wireless from "../assets/LogitechG435Wireless.webp";
import SteelSeriesQcKHeavyMousePad from "../assets/SteelSeriesQcKHeavyMousePad.webp";
import HyperXPulsefireHaste from "../assets/HyperXPulsefireHaste.webp";
import NVISIONLed from "../assets/NVISIONLed.webp";
import MSIMotherboard from "../assets/MSIMotherboard.webp";
import Monitor from "../assets/Monitor.webp";
import Peripheral from "../assets/Peripheral.webp";
import NVISIONFrameless from "../assets/NVISIONFrameless.webp";
import HKCFrameless from "../assets/HKCFrameless.webp";
import VIEWSONICFrameless from "../assets/VIEWSONICFrameless.webp";
import ACERFrameless from "../assets/ACERFrameless.webp";
import SAMSUNGFrameless from "../assets/SAMSUNGFrameless.webp";
import ASUSFrameless from "../assets/ASUSFrameless.webp";
import ASUSUltraWide from "../assets/ASUSUltraWide.webp";


// Sample Product Data (Replace with your database fetch logic)
export const menuItems = [
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
        specifications: {
          "Core Count": "4 Cores",
          "Thread Count": "4 Threads",
          "Base Clock": "3.6 GHz",
          "Boost Clock": "4.0 GHz",
          "L3 Cache": "4MB",
          "Graphics": "Radeon Vega 8",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 5 3400G (AM4) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 3,995",
        details: "A versatile APU with Vega 11 graphics, suitable for gaming and productivity without a discrete GPU.",
        specifications: {
          "Core Count": "4 Cores",
          "Thread Count": "8 Threads",
          "Base Clock": "3.7 GHz",
          "Boost Clock": "4.2 GHz",
          "L3 Cache": "4MB",
          "Graphics": "Radeon RX Vega 11",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 5 5500 (AM4) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 4,150",
        details: "A 6-core processor for smooth gaming and multitasking, based on Zen 3 architecture.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "3.6 GHz",
          "Boost Clock": "4.2 GHz",
          "L3 Cache": "16MB",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 5 5600 (AM4) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 5,485",
        details: "Zen 3-based 6-core CPU for high-performance gaming and productivity.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "3.5 GHz",
          "Boost Clock": "4.4 GHz",
          "L3 Cache": "32MB",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 5 4600G (AM4) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 5,495",
        details: "APU with integrated Radeon graphics, perfect for budget gaming and office PCs.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "3.7 GHz",
          "Boost Clock": "4.2 GHz",
          "L3 Cache": "8MB",
          "Graphics": "Radeon Graphics",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 5 5600GT (AM4) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 7,185",
        details: "High-performance 6-core CPU with integrated graphics, great for gaming and creative work.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "3.9 GHz",
          "Boost Clock": "4.4 GHz",
          "L3 Cache": "16MB",
          "Graphics": "Radeon Graphics",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 7 5700X (AM4) (TTP)",
        image: Ryzen,
        price: "PHP 7,895",
        details: "8-core, 16-thread CPU for demanding gaming and content creation tasks.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "3.4 GHz",
          "Boost Clock": "4.6 GHz",
          "L3 Cache": "32MB",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 7 5700G (AM4) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 8,495",
        details: "Powerful APU with 8 cores and integrated Radeon graphics for all-around performance.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "3.8 GHz",
          "Boost Clock": "4.6 GHz",
          "L3 Cache": "16MB",
          "Graphics": "Radeon Graphics",
          "TDP": "65W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 7 5700X3D (AM4) (TTP)",
        image: Ryzen,
        price: "PHP 11,995",
        details: "Advanced gaming processor with 3D V-Cache for enhanced gaming performance.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "3.0 GHz",
          "Boost Clock": "4.1 GHz",
          "L3 Cache": "96MB",
          "TDP": "105W",
          "Socket": "AM4"
        }
      },
      {
        name: "AMD RYZEN 5 8400F (AM5) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 8,495",
        details: "Latest 6-core Zen 4 CPU for AM5 platform, ideal for gaming and multitasking.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "4.2 GHz",
          "Boost Clock": "4.7 GHz",
          "L3 Cache": "16MB",
          "TDP": "65W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 5 7600 (AM5) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 10,495",
        details: "Zen 4 CPU with high clock speeds and efficiency for next-gen gaming.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "3.8 GHz",
          "Boost Clock": "5.1 GHz",
          "L3 Cache": "32MB",
          "TDP": "65W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 7 8700F (AM5) (TTP) W/ AMD COOLER",
        image: Ryzen,
        price: "PHP 11,495",
        details: "8-core Zen 4 processor for AM5, designed for gaming and productivity.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "4.1 GHz",
          "Boost Clock": "5.0 GHz",
          "L3 Cache": "16MB",
          "TDP": "65W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 7 7700 (AM5) (TTP)",
        image: Ryzen,
        price: "PHP 12,750",
        details: "High-end Zen 4 CPU for AM5, perfect for gaming and creative workloads.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "3.8 GHz",
          "Boost Clock": "5.3 GHz",
          "L3 Cache": "32MB",
          "TDP": "65W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 5 8600G (AM5) (BOXED)",
        image: Ryzen,
        price: "PHP 12,750",
        details: "Zen 4 APU with integrated Radeon 760M graphics for entry-level gaming.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "4.3 GHz",
          "Boost Clock": "5.0 GHz",
          "L3 Cache": "16MB",
          "Graphics": "Radeon 760M",
          "TDP": "65W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 7 8700G (AM5) (BOXED)",
        image: Ryzen,
        price: "PHP 17,830",
        details: "Top-tier APU with 8 cores and Radeon 780M graphics for gaming without a discrete GPU.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "4.2 GHz",
          "Boost Clock": "5.1 GHz",
          "L3 Cache": "16MB",
          "Graphics": "Radeon 780M",
          "TDP": "65W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 7 9700x (AM5) (BOXED)",
        image: Ryzen,
        price: "PHP 23,320",
        details: "High-performance Zen 5 CPU for enthusiasts and creators.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "3.8 GHz",
          "Boost Clock": "5.5 GHz",
          "L3 Cache": "32MB",
          "TDP": "120W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 9 9900x (AM5) (BOXED)",
        image: Ryzen,
        price: "PHP 28,630",
        details: "Flagship 12-core Zen 5 processor for extreme gaming and workstation use.",
        specifications: {
          "Core Count": "12 Cores",
          "Thread Count": "24 Threads",
          "Base Clock": "4.4 GHz",
          "Boost Clock": "5.6 GHz",
          "L3 Cache": "64MB",
          "TDP": "120W",
          "Socket": "AM5"
        }
      },
      {
        name: "AMD RYZEN 7 9800X3D (AM5) (BOXED)",
        image: Ryzen,
        price: "PHP 32,995",
        details: "Zen 5 CPU with 3D V-Cache for ultimate gaming performance.",
        specifications: {
          "Core Count": "8 Cores",
          "Thread Count": "16 Threads",
          "Base Clock": "4.0 GHz",
          "Boost Clock": "5.6 GHz",
          "L3 Cache": "96MB",
          "TDP": "120W",
          "Socket": "AM5"
        }
      },
      {
        name: "Intel Core i5 12400F *12th GEN (BOX TYPE)",
        image: IntelCorei5,
        price: "PHP 7,480",
        details: "12th Gen Intel Core i5 with 6 performance cores, great for gaming and productivity.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "2.5 GHz",
          "Boost Clock": "4.4 GHz",
          "L3 Cache": "18MB",
          "TDP": "65W",
          "Socket": "LGA 1700"
        }
      },
      {
        name: "Intel Core i5 12400 *12th GEN (BOX TYPE)",
        image: IntelCorei5,
        price: "PHP 8,495",
        details: "12th Gen i5 with integrated UHD 730 graphics, suitable for office and light gaming.",
        specifications: {
          "Core Count": "6 Cores",
          "Thread Count": "12 Threads",
          "Base Clock": "2.5 GHz",
          "Boost Clock": "4.4 GHz",
          "L3 Cache": "18MB",
          "Graphics": "UHD 730",
          "TDP": "65W",
          "Socket": "LGA 1700"
        }
      },
      {
        name: "Intel Core i5 14400F *14th GEN (BOX TYPE)",
        image: IntelCorei5,
        price: "PHP 9,370",
        details: "Latest 14th Gen i5 with hybrid architecture for improved efficiency and performance.",
        specifications: {
          "Core Count": "10 Cores (6P+4E)",
          "Thread Count": "16 Threads",
          "Base Clock": "2.5 GHz",
          "Boost Clock": "4.7 GHz",
          "L3 Cache": "20MB",
          "TDP": "65W",
          "Socket": "LGA 1700"
        }
      },
      {
        name: "Intel Core i5 14400 *14th GEN (BOX TYPE)",
        image: IntelCorei5,
        price: "PHP 11,190",
        details: "14th Gen i5 with integrated graphics, ideal for modern office and gaming PCs.",
        specifications: {
          "Core Count": "10 Cores (6P+4E)",
          "Thread Count": "16 Threads",
          "Base Clock": "2.5 GHz",
          "Boost Clock": "4.7 GHz",
          "L3 Cache": "20MB",
          "Graphics": "UHD 730",
          "TDP": "65W",
          "Socket": "LGA 1700"
        }
      },
      {
        name: "Intel Core i7 14700F *14th GEN (BOX TYPE)",
        image: IntelCorei7,
        price: "PHP 19,090",
        details: "High-end 14th Gen i7 with 20 cores for advanced gaming and multitasking.",
        specifications: {
          "Core Count": "20 Cores (8P+12E)",
          "Thread Count": "28 Threads",
          "Base Clock": "2.1 GHz",
          "Boost Clock": "5.4 GHz",
          "L3 Cache": "33MB",
          "TDP": "65W",
          "Socket": "LGA 1700"
        }
      },
      {
        name: "Intel Core i7 14700 *14th GEN (BOX TYPE)",
        image: IntelCorei7,
        price: "PHP 20,499",
        details: "14th Gen i7 with integrated graphics, perfect for high-end desktops.",
        specifications: {
          "Core Count": "20 Cores (8P+12E)",
          "Thread Count": "28 Threads",
          "Base Clock": "2.1 GHz",
          "Boost Clock": "5.4 GHz",
          "L3 Cache": "33MB",
          "Graphics": "UHD 770",
          "TDP": "65W",
          "Socket": "LGA 1700"
        }
      }
    ]
  },
  {
    name: "CPU Cooler",
    image: CPUCooler,
    category: "cpu-cooler",
    products: [
      {
        name: "DEEPCOOL Intel (Intel 1st - 11th Gen)",
        image: COOLMANREYNA,
        price: "PHP 250",
        details: "Basic Deepcool air cooler for Intel 1st to 11th Gen CPUs.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Intel 1st-11th Gen",
          "Fan Size": "92mm",
          "Cooling Method": "Aluminum Heatsink",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL AMD (AM3 / AM4)",
        image: COOLMANREYNA,
        price: "PHP 250",
        details: "Basic Deepcool air cooler for AMD AM3 and AM4 sockets.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "AMD AM3/AM4",
          "Fan Size": "92mm",
          "Cooling Method": "Aluminum Heatsink",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL GAMMAX AG200",
        image: COOLMANREYNA,
        price: "PHP 790",
        details: "Compact air cooler for mainstream CPUs.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Single",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL GAMMAX AG300",
        image: COOLMANREYNA,
        price: "PHP 960",
        details: "Efficient air cooler for better thermal performance.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Single",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL GAMMAX 400 V2 RED (SALE)",
        image: COOLMANREYNA,
        price: "PHP 899",
        details: "Popular air cooler with red LED fan, on sale.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "LED": "Red",
          "Tower": "Single"
        }
      },
      {
        name: "DEEPCOOL AK400 (Black)",
        image: COOLMANREYNA,
        price: "PHP 1,499",
        details: "High-performance black air cooler for gaming CPUs.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Single",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL AK400 (White)",
        image: COOLMANREYNA,
        price: "PHP 1,595",
        details: "High-performance white air cooler for gaming CPUs.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Single",
          "Color": "White"
        }
      },
      {
        name: "DEEPCOOL AK400 (Pink)",
        image: COOLMANREYNA,
        price: "PHP 1,998",
        details: "High-performance pink air cooler for gaming CPUs.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Single",
          "Color": "Pink"
        }
      },
      {
        name: "DEEPCOOL AG500 DIGITAL (Black)",
        image: COOLMANREYNA,
        price: "PHP 2,195",
        details: "Digital display air cooler, black edition.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Dual",
          "Display": "Digital",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL AG500 DIGITAL (White)",
        image: COOLMANREYNA,
        price: "PHP 2,295",
        details: "Digital display air cooler, white edition.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Dual",
          "Display": "Digital",
          "Color": "White"
        }
      },
      {
        name: "DEEPCOOL AK500 (Black)",
        image: COOLMANREYNA,
        price: "PHP 2,650",
        details: "High-end black air cooler for powerful CPUs.",
        specifications: {
          "Type": "Air Cooler",
          "Supported Sockets": "Universal",
          "Fan Size": "120mm",
          "Tower": "Single",
          "Color": "Black"
        }
      },
      {
        name: "Darkflash Nebula DN-240 AIO 240 (Black/White)",
        image: COOLMANREYNA,
        price: "PHP 3,480",
        details: "240mm AIO liquid cooler, available in black or white.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "240mm",
          "Fan Size": "2x 120mm",
          "Color": "Black/White"
        }
      },
      {
        name: "Darkflash Nebula DN-360 AIO 360 (Black/White)",
        image: COOLMANREYNA,
        price: "PHP 4,180",
        details: "360mm AIO liquid cooler, available in black or white.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "360mm",
          "Fan Size": "3x 120mm",
          "Color": "Black/White"
        }
      },
      {
        name: "THERMALRIGHT FROZEN WARFRAME 240 DIGITAL",
        image: COOLMANREYNA,
        price: "PHP 4,799",
        details: "240mm AIO with digital display and RGB.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "240mm",
          "Fan Size": "2x 120mm",
          "Display": "Digital",
          "RGB": "Yes"
        }
      },
      {
        name: "DEEPCOOL LE520 AIO 240 (Black)",
        image: COOLMANREYNA,
        price: "PHP 3,799",
        details: "240mm AIO liquid cooler, black edition.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "240mm",
          "Fan Size": "2x 120mm",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL LE520 AIO 240 (White)",
        image: COOLMANREYNA,
        price: "PHP 3,999",
        details: "240mm AIO liquid cooler, white edition.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "240mm",
          "Fan Size": "2x 120mm",
          "Color": "White"
        }
      },
      {
        name: "DEEPCOOL LS520 SE AIO 240 DIGITAL (Black)",
        image: COOLMANREYNA,
        price: "PHP 5,499",
        details: "Premium 240mm AIO with digital display.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "240mm",
          "Fan Size": "2x 120mm",
          "Display": "Digital",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL MYSTIQUE AIO 360 (Black)",
        image: COOLMANREYNA,
        price: "PHP 8,995",
        details: "High-end 360mm AIO liquid cooler, black edition.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "360mm",
          "Fan Size": "3x 120mm",
          "Display": "Digital",
          "Color": "Black"
        }
      },
      {
        name: "DEEPCOOL MYSTIQUE AIO 360 (White)",
        image: COOLMANREYNA,
        price: "PHP 9,499",
        details: "High-end 360mm AIO liquid cooler, white edition.",
        specifications: {
          "Type": "AIO Liquid Cooler",
          "Radiator Size": "360mm",
          "Fan Size": "3x 120mm",
          "Display": "Digital",
          "Color": "White"
        }
      }
    ],
    brands: ["Deepcool", "Darkflash", "Thermalright"]
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
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.1",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE A520M-K V2",
        image: GigabyteMotherboard,
        price: "PHP 3,499",
        details: "Affordable A520 chipset motherboard for Ryzen 3rd/4th Gen CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B450M-K",
        image: GigabyteMotherboard,
        price: "PHP 3,799",
        details: "A budget-friendly microATX motherboard supporting AMD Ryzen processors with basic connectivity.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "2x DDR4 (up to 32GB)",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.1",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B450M DS3H V3",
        image: GigabyteMotherboard,
        price: "PHP 4,199",
        details: "A solid microATX motherboard with extended durability and hybrid digital VRM design.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "4x DDR4 (up to 64GB)",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI/DVI",
          "USB": "USB 3.1",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE A520M DS3H",
        image: GigabyteMotherboard,
        price: "PHP 3,995",
        details: "Affordable A520 chipset motherboard for Ryzen CPUs, supports up to 64GB RAM.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE A520M DS3H AC *WIFI *Bluetooth",
        image: GigabyteMotherboard,
        price: "PHP 4,999",
        details: "A520 motherboard with built-in WiFi and Bluetooth for wireless connectivity.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B550M-K",
        image: B550MK,
        price: "PHP 5,199",
        details: "Entry-level B550 motherboard with PCIe 4.0 support for Ryzen 3000/5000 CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "AORUS ELITE B550M AX *WIFI *Bluetooth",
        image: ASrockMotherboard,
        price: "PHP 7,699",
        details: "Feature-rich B550 motherboard with WiFi, Bluetooth, and reinforced PCIe slots.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 4.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B650M GAMING *WIFI *Bluetooth",
        image: GigabyteMotherboard,
        price: "PHP 7,199",
        details: "AM5 motherboard with WiFi and Bluetooth, ready for next-gen Ryzen CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0/5.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B650M K",
        image: GigabyteMotherboard,
        price: "PHP 7,490",
        details: "Affordable AM5 motherboard for DDR5 memory and Ryzen 7000 series CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "2x DDR5",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS TUF GAMING A620M-PLUS *WIFI *Bluetooth",
        image: AsusMotherboard,
        price: "PHP 8,899",
        details: "Durable AM5 motherboard with WiFi, Bluetooth, and gaming features.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 4.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE GA-B650M-D3HP-AX *WIFI *Bluetooth",
        image: GigabyteMotherboard,
        price: "PHP 8,999",
        details: "AM5 motherboard with advanced connectivity and wireless features.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 4.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B650 EAGLE-AX *WIFI *Bluetooth",
        image: GigabyteMotherboard,
        price: "PHP 10,495",
        details: "High-end AM5 motherboard with WiFi, Bluetooth, and robust power delivery.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 3× M.2 (PCIe 5.0/4.0 NVMe/SATA)"
        }
      },
      {
        name: "AORUS B650M ELITE AX ICE *WIFI *Bluetooth *WHITE",
        image: ASrockMotherboard,
        price: "PHP 12,490",
        details: "Premium white AM5 motherboard with WiFi, Bluetooth, and gaming aesthetics.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Color": "White",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 5.0/4.0 NVMe/SATA)"
        }
      },
      {
        name: "AORUS B650 ELITE AX V2 *WIFI *Bluetooth",
        image: ASrockMotherboard,
        price: "PHP 12,600",
        details: "Elite AM5 motherboard with advanced wireless and gaming features.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 5.0/4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE X870 GAMING *WIFI *Bluetooth",
        image: GigabyteMotherboard,
        price: "PHP 13,995",
        details: "Top-tier AM5 motherboard for enthusiasts, with WiFi and Bluetooth.",
        specifications: {
          "Form Factor": "ATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4–6× SATA 6 Gb/s, 2–3× M.2 (PCIe 5.0/4.0 NVMe/SATA)"
        }
      },
      {
        name: "RAMSTA H310M Support *6,7,8,9th GEN",
        image: GigabyteMotherboard,
        price: "PHP 3,499",
        details: "Entry-level Intel motherboard supporting 6th to 9th Gen CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1151",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.0",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "RAMSTA H510M Support *10-11th GEN",
        image: GigabyteMotherboard,
        price: "PHP 3,399",
        details: "Budget Intel motherboard for 10th and 11th Gen Core processors.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1200",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE H510M-H (DDR4) *10-11th GEN",
        image: GigabyteMotherboard,
        price: "PHP 3,995",
        details: "Reliable Intel motherboard for 10th/11th Gen CPUs with DDR4 support.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1200",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE H610M-H (DDR4) *12-14th GEN",
        image: GigabyteMotherboard,
        price: "PHP 4,999",
        details: "Intel motherboard for 12th to 14th Gen CPUs, supports DDR4 memory.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1700",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS PRIME H610M-K (DDR5)*12-14th GEN",
        image: AsusMotherboard,
        price: "PHP 5,995",
        details: "Intel motherboard for 12th-14th Gen CPUs with DDR5 support.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1700",
          "Memory Slots": "2x DDR5",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS ROG STRIX B460-F GAMING *10th GEN",
        image: AsusMotherboard,
        price: "PHP 6,495",
        details: "Gaming motherboard for Intel 10th Gen CPUs with robust features.",
        specifications: {
          "Form Factor": "ATX",
          "Socket": "LGA 1200",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "6× SATA 6 Gb/s, 2× M.2 (PCIe 3.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS ROG STRIX Z490-E GAMING *10th-11TH GEN",
        image: AsusMotherboard,
        price: "PHP 7,995",
        details: "High-end gaming motherboard for Intel 10th/11th Gen CPUs.",
        specifications: {
          "Form Factor": "ATX",
          "Socket": "LGA 1200",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "6× SATA 6 Gb/s, 3× M.2 (PCIe 3.0/4.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS PRIME A520M-K",
        image: AsusMotherboard,
        price: "PHP 3,599",
        details: "Affordable A520 chipset motherboard for Ryzen processors with essential features.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI/DVI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "MSI B450M PRO MAX II",
        image: MSIMotherboard,
        price: "PHP 4,199",
        details: "Reliable B450M motherboard supporting Ryzen 1st to 3rd Gen CPUs, good for budget builds.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 3.0",
          "Video Output": "HDMI/DVI",
          "USB": "USB 3.1",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe NVMe/SATA)"
        }
      },
      {
        name: "MSI B550M-A PRO",
        image: MSIMotherboard,
        price: "PHP 5,499",
        details: "B550 chipset motherboard with PCIe 4.0 support and durability-focused design.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM4",
          "Memory Slots": "4x DDR4",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS B650M-AYW WIFI *WIFI *Bluetooth",
        image: AsusMotherboard,
        price: "PHP 8,499",
        details: "AM5 motherboard with built-in WiFi and Bluetooth, supporting Ryzen 7000 series CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 5.0/4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE GA-B650M-D3HP",
        image: GigabyteMotherboard,
        price: "PHP 7,599",
        details: "AM5 motherboard with DDR5 support for Ryzen 7000 processors, non-WiFi version.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 4.0",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B850M D3HP",
        image: GigabyteMotherboard,
        price: "PHP 9,299",
        details: "Next-gen B850 chipset motherboard for AM5 with enhanced stability and DDR5 support.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 5.0 NVMe/SATA)"
        }
      },
      {
        name: "AORUS B850 AORUS ELITE WIFI 7 *WIFI *Bluetooth",
        image: ASrockMotherboard,
        price: "PHP 12,899",
        details: "Premium B850 motherboard with WiFi 7, Bluetooth, and high-end gaming features.",
        specifications: {
          "Form Factor": "ATX",
          "Socket": "AM5",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi 7, Bluetooth",
          "Storage": "6× SATA 6 Gb/s, 3× M.2 (PCIe 5.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B650I-AX *WIFI *Bluetooth (ITX MOBO)",
        image: GigabyteMotherboard,
        price: "PHP 10,199",
        details: "Compact ITX AM5 motherboard with built-in WiFi and Bluetooth for small form factor builds.",
        specifications: {
          "Form Factor": "Mini-ITX",
          "Socket": "AM5",
          "Memory Slots": "2x DDR5",
          "PCIe": "PCIe 5.0",
          "USB": "USB 3.2",
          "Wireless": "WiFi, Bluetooth",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe 5.0 NVMe/SATA)"
        }
      },
      {
        name: "ASUS PRIME H610M-R D4 (DDR4) *12-14th GEN",
        image: AsusMotherboard,
        price: "PHP 4,699",
        details: "Entry-level Intel H610 motherboard supporting DDR4 memory and 12th-14th Gen CPUs.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1700",
          "Memory Slots": "2x DDR4",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI/DVI",
          "USB": "USB 3.2",
          "Storage": "4× SATA 6 Gb/s, 1× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      },
      {
        name: "GIGABYTE B760M DS3H AX (DDR5) *12-14th GEN",
        image: GigabyteMotherboard,
        price: "PHP 6,499",
        details: "Intel B760 motherboard with DDR5 support, WiFi AX, and solid connectivity.",
        specifications: {
          "Form Factor": "MicroATX",
          "Socket": "LGA 1700",
          "Memory Slots": "4x DDR5",
          "PCIe": "PCIe 4.0",
          "Video Output": "HDMI",
          "USB": "USB 3.2",
          "Wireless": "WiFi AX",
          "Storage": "4× SATA 6 Gb/s, 2× M.2 (PCIe 4.0 NVMe/SATA)"
        }
      }
    ],
    brands: ["ASUS", "MSI", "Gigabyte", "ASRock", "RAMSTA"]
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
        specifications: {
          "Capacity": "8GB",
          "Type": "DDR4",
          "Speed": "3200MHz",
          "CAS Latency": "CL22",
          "Voltage": "1.2V",
          "ECC": "Non-ECC",
          "Buffered": "Unbuffered"
        }
      },
      {
        name: "16GB Team Elite Plus DDR4 3200MHz",
        image: GB16Team,
        price: "PHP 2,199",
        details: "A single-stick high-speed memory designed for multitasking and gaming.",
        specifications: {
          "Capacity": "16GB",
          "Type": "DDR4",
          "Speed": "3200MHz",
          "CAS Latency": "CL22",
          "Voltage": "1.2V",
          "ECC": "Non-ECC",
          "Buffered": "Unbuffered"
        }
      },
      {
        name: "16GB Kingston Fury Beast DDR4 3200MHz",
        image: GB16Kingston,
        price: "PHP 2,399",
        details: "Reliable and durable RAM with Kingston’s Fury Beast design for enhanced cooling.",
        specifications: {
          "Capacity": "16GB",
          "Type": "DDR4",
          "Speed": "3200MHz",
          "CAS Latency": "CL16",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "Heat Spreader": "Yes"
        }
      },
      {
        name: "16GB T-Force DarkZa Kit (2x8GB) 3600MHz",
        image: GB16TForceDarkZa,
        price: "PHP 2,499",
        details: "Optimized for gaming and high-performance computing with fast speeds.",
        specifications: {
          "Capacity": "16GB (2x8GB)",
          "Type": "DDR4",
          "Speed": "3600MHz",
          "CAS Latency": "CL18",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "Heat Spreader": "Yes"
        }
      },
      {
        name: "16GB T-FORCE DELTA RGB TUF (2x8GB) 3600MHz Black",
        image: GB16TFORCEBlack,
        price: "PHP 3,195",
        details: "A stylish RGB RAM module certified by ASUS TUF Gaming Alliance.",
        specifications: {
          "Capacity": "16GB (2x8GB)",
          "Type": "DDR4",
          "Speed": "3600MHz",
          "CAS Latency": "CL18",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "RGB": "Yes"
        }
      },
      {
        name: "16GB T-FORCE DELTA RGB (2x8GB) 3600MHz White",
        image: GB16TFORCEWhite,
        price: "PHP 3,195",
        details: "An aesthetically pleasing white RAM with vibrant RGB lighting.",
        specifications: {
          "Capacity": "16GB (2x8GB)",
          "Type": "DDR4",
          "Speed": "3600MHz",
          "CAS Latency": "CL18",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "RGB": "Yes"
        }
      },
      {
        name: "32GB T-Force DarkZa Kit (2x16GB) 3600MHz",
        image: GB16TForceDarkZa,
        price: "PHP 3,995",
        details: "A dual-stick RAM kit for content creators and heavy multitasking.",
        specifications: {
          "Capacity": "32GB (2x16GB)",
          "Type": "DDR4",
          "Speed": "3600MHz",
          "CAS Latency": "CL18",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "Heat Spreader": "Yes"
        }
      },
      {
        name: "32GB T-FORCE DELTA RGB (2x16GB) 3600MHz Black",
        image: GB16TFORCEBlack,
        price: "PHP 4,995",
        details: "Premium high-capacity RGB RAM for gaming and workstation setups.",
        specifications: {
          "Capacity": "32GB (2x16GB)",
          "Type": "DDR4",
          "Speed": "3600MHz",
          "CAS Latency": "CL18",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "RGB": "Yes"
        }
      },
      {
        name: "32GB G.SKILL Trident Z RGB (2x16GB) 3600MHz",
        image: GB32GSkillTridentZ,
        price: "PHP 5,495",
        details: "High-performance RAM with aggressive heat spreaders and customizable RGB lighting.",
        specifications: {
          "Capacity": "32GB (2x16GB)",
          "Type": "DDR4",
          "Speed": "3600MHz",
          "CAS Latency": "CL16",
          "Voltage": "1.35V",
          "XMP": "2.0",
          "RGB": "Yes"
        }
      },
      {
        name: "16GB TEAM ELITE PLUS DDR5 5600 Gold",
        image: GB16Team,
        price: "PHP 2,895",
        details: "An entry-level DDR5 module with improved bandwidth and energy efficiency.",
        specifications: {
          "Capacity": "16GB",
          "Type": "DDR5",
          "Speed": "5600MHz",
          "CAS Latency": "CL46",
          "Voltage": "1.1V",
          "ECC": "Non-ECC",
          "Buffered": "Unbuffered"
        }
      },
      {
        name: "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz Black",
        image: GB16TFORCEBlack,
        price: "PHP 3,395",
        details: "Fast DDR5 RAM with stunning RGB effects and high overclocking potential.",
        specifications: {
          "Capacity": "16GB",
          "Type": "DDR5",
          "Speed": "6000MHz",
          "CAS Latency": "CL36",
          "Voltage": "1.35V",
          "XMP": "3.0",
          "RGB": "Yes"
        }
      },
      {
        name: "16GB T-FORCE DELTA RGB (1x16GB) 6000MHz White",
        image: GB16TFORCEWhite,
        price: "PHP 3,495",
        details: "A high-speed DDR5 RAM module designed for next-gen performance.",
        specifications: {
          "Capacity": "16GB",
          "Type": "DDR5",
          "Speed": "6000MHz",
          "CAS Latency": "CL36",
          "Voltage": "1.35V",
          "XMP": "3.0",
          "RGB": "Yes"
        }
      },
      {
        name: "32GB T-FORCE DELTA RGB Kit (2x16GB) 6400MHz Black",
        image: GB16TFORCEBlack,
        price: "PHP 7,499",
        details: "A top-tier RAM kit for overclocking and extreme gaming performance.",
        specifications: {
          "Capacity": "32GB (2x16GB)",
          "Type": "DDR5",
          "Speed": "6400MHz",
          "CAS Latency": "CL32",
          "Voltage": "1.4V",
          "XMP": "3.0",
          "RGB": "Yes"
        }
      },
      {
        name: "32GB T-FORCE DELTA RGB Kit (2x16GB) 6400MHz White",
        image: GB16TFORCEWhite,
        price: "PHP 7,699",
        details: "Premium white DDR5 RAM kit for high-end gaming and creative workstations.",
        specifications: {
          "Capacity": "32GB (2x16GB)",
          "Type": "DDR5",
          "Speed": "6400MHz",
          "CAS Latency": "CL32",
          "Voltage": "1.4V",
          "XMP": "3.0",
          "RGB": "Yes"
        }
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
        specifications: {
          "Capacity": "240GB",
          "Type": "SATA III SSD",
          "Read Speed": "545MB/s",
          "Write Speed": "465MB/s",
          "Form Factor": "2.5-inch",
          "NAND": "3D NAND"
        }
      },
      {
        name: "256GB T-FORCE VULCAN Z",
        image: TFORCEVULCAN,
        price: "PHP 1,399",
        details: "A budget-friendly SATA SSD with solid performance for general computing.",
        specifications: {
          "Capacity": "256GB",
          "Type": "SATA III SSD",
          "Read Speed": "550MB/s",
          "Write Speed": "500MB/s",
          "Form Factor": "2.5-inch",
          "NAND": "3D NAND"
        }
      },
      {
        name: "512GB T-FORCE VULCAN Z",
        image: TFORCEVULCAN,
        price: "PHP 2,449",
        details: "A larger capacity SATA SSD offering reliable speeds and durability.",
        specifications: {
          "Capacity": "512GB",
          "Type": "SATA III SSD",
          "Read Speed": "550MB/s",
          "Write Speed": "500MB/s",
          "Form Factor": "2.5-inch",
          "NAND": "3D NAND"
        }
      },
      {
        name: "500GB SAMSUNG 870 EVO",
        image: SAMSUNG870EVO,
        price: "PHP 3,199",
        details: "One of the best SATA SSDs for performance and reliability.",
        specifications: {
          "Capacity": "500GB",
          "Type": "SATA III SSD",
          "Read Speed": "560MB/s",
          "Write Speed": "530MB/s",
          "Form Factor": "2.5-inch",
          "NAND": "3D V-NAND"
        }
      },
      {
        name: "1TB T-FORCE VULCAN Z",
        image: TFORCEVULCAN,
        price: "PHP 3,799",
        details: "High-capacity SATA SSD for gaming and productivity workloads.",
        specifications: {
          "Capacity": "1TB",
          "Type": "SATA III SSD",
          "Read Speed": "550MB/s",
          "Write Speed": "500MB/s",
          "Form Factor": "2.5-inch",
          "NAND": "3D NAND"
        }
      },
      {
        name: "500GB WESTERN DIGITAL SN3000 GEN4",
        image: WDBLUEGEN4,
        price: "PHP 2,995",
        details: "Gen4 NVMe SSD for faster boot and load times.",
        specifications: {
          "Capacity": "500GB",
          "Type": "NVMe PCIe Gen4",
          "Read Speed": "4000MB/s",
          "Write Speed": "3500MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "500GB WESTERN DIGITAL BLUE GEN4",
        image: WDBLUEGEN4,
        price: "PHP 3,295",
        details: "A Gen4 NVMe SSD delivering significant performance improvements over Gen3.",
        specifications: {
          "Capacity": "500GB",
          "Type": "NVMe PCIe Gen4",
          "Read Speed": "4100MB/s",
          "Write Speed": "2000MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "1TB WESTERN DIGITAL GREEN GEN3",
        image: WDGREENGEN3,
        price: "PHP 3,695",
        details: "A cost-effective NVMe SSD for faster data transfers than SATA drives.",
        specifications: {
          "Capacity": "1TB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "3200MB/s",
          "Write Speed": "3000MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "2TB WESTERN DIGITAL GREEN GEN3",
        image: WDGREENGEN3,
        price: "PHP 7,495",
        details: "High-capacity NVMe SSD for large storage needs and fast performance.",
        specifications: {
          "Capacity": "2TB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "3200MB/s",
          "Write Speed": "3000MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "250GB GIGABYTE 4000E GEN4",
        image: WDBLUEGEN4,
        price: "PHP 1,499",
        details: "Entry-level Gen4 NVMe SSD for fast boot and application load times.",
        specifications: {
          "Capacity": "250GB",
          "Type": "NVMe PCIe Gen4",
          "Read Speed": "4000MB/s",
          "Write Speed": "1800MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "512GB TEAMGROUP MP33 PRO",
        image: TEAMGROUPMP33PRO,
        price: "PHP 2,699",
        details: "A budget NVMe SSD with decent speed improvements over SATA SSDs.",
        specifications: {
          "Capacity": "512GB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "1700MB/s",
          "Write Speed": "1400MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "1TB XPG SX8200 PRO GEN4",
        image: XPGSX8200PROGEN4,
        price: "PHP 4,099",
        details: "A high-end Gen4 SSD delivering impressive speed for gaming and heavy workloads.",
        specifications: {
          "Capacity": "1TB",
          "Type": "NVMe PCIe Gen4",
          "Read Speed": "5000MB/s",
          "Write Speed": "4400MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "256GB ADATA LEGEND 710 W/HEATSINK",
        image: XPGSX8200PROGEN4,
        price: "PHP 1,599",
        details: "Compact NVMe SSD with heatsink for improved thermal performance.",
        specifications: {
          "Capacity": "256GB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "2400MB/s",
          "Write Speed": "1800MB/s",
          "Form Factor": "M.2 2280",
          "Heatsink": "Yes"
        }
      },
      {
        name: "512GB ADATA LEGEND 710 W/HEATSINK",
        image: XPGSX8200PROGEN4,
        price: "PHP 2,699",
        details: "Mid-capacity NVMe SSD with heatsink for enhanced cooling.",
        specifications: {
          "Capacity": "512GB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "2400MB/s",
          "Write Speed": "1800MB/s",
          "Form Factor": "M.2 2280",
          "Heatsink": "Yes"
        }
      },
      {
        name: "1TB ADATA LEGEND 710 W/HEATSINK",
        image: XPGSX8200PROGEN4,
        price: "PHP 3,699",
        details: "Large capacity NVMe SSD with heatsink for gaming and productivity.",
        specifications: {
          "Capacity": "1TB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "2400MB/s",
          "Write Speed": "1800MB/s",
          "Form Factor": "M.2 2280",
          "Heatsink": "Yes"
        }
      },
      {
        name: "1TB ADATA LEGEND 860 W/HEATSINK GEN4",
        image: XPGSX8200PROGEN4,
        price: "PHP 4,195",
        details: "Gen4 NVMe SSD with heatsink for high-speed data transfer and gaming.",
        specifications: {
          "Capacity": "1TB",
          "Type": "NVMe PCIe Gen4",
          "Read Speed": "5000MB/s",
          "Write Speed": "4500MB/s",
          "Form Factor": "M.2 2280",
          "Heatsink": "Yes"
        }
      },
      {
        name: "500GB SAMSUNG 980 NVME",
        image: SAMSUNG870EVO,
        price: "PHP 3,795",
        details: "Reliable NVMe SSD for fast boot and application load times.",
        specifications: {
          "Capacity": "500GB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "3100MB/s",
          "Write Speed": "2600MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "500GB SAMSUNG 970 Evo Plus",
        image: SAMSUNG870EVO,
        price: "PHP 4,095",
        details: "High-performance NVMe SSD for demanding workloads and gaming.",
        specifications: {
          "Capacity": "500GB",
          "Type": "NVMe PCIe Gen3",
          "Read Speed": "3500MB/s",
          "Write Speed": "3200MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "2TB SAMSUNG 990 EVO",
        image: SAMSUNG870EVO,
        price: "PHP 9,495",
        details: "Top-tier NVMe SSD for extreme performance and large storage needs.",
        specifications: {
          "Capacity": "2TB",
          "Type": "NVMe PCIe Gen4",
          "Read Speed": "5000MB/s",
          "Write Speed": "4200MB/s",
          "Form Factor": "M.2 2280"
        }
      }
    ],
    brands: ["Samsung", "Western Digital", "Crucial", "Seagate"]
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
        specifications: {
          "Memory": "4GB GDDR5",
          "Memory Bus": "128-bit",
          "Core Clock": "1183 MHz",
          "Cooling": "Single Fan",
          "Outputs": "HDMI, DVI, DisplayPort",
          "DirectX": "12",
          "PCIe Interface": "PCIe 3.0 x16",
          "Power Connector": "None (powered by PCIe slot)",
        }
      },
      {
        name: "8GB RX580 XFX GTS XXX Edition *(DUALFAN)",
        image: RX580,
        price: "PHP 6,995",
        details: "Mid-range AMD GPU with dual fan cooling for smooth 1080p gaming.",
        specifications: {
          "Memory": "8GB GDDR5",
          "Memory Bus": "256-bit",
          "Boost Clock": "1366 MHz",
          "Cooling": "Dual Fan",
          "Outputs": "1x HDMI, 3x DisplayPort, 1x DVI",
          "DirectX": "12",
          "PCIe Interface": "PCIe 3.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RX6600 ASROCK CHALLENGER *(DUALFAN)",
        image: RX6600,
        price: "PHP 13,495",
        details: "Efficient RDNA2 GPU with dual fan cooling, great for 1080p high settings.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2491 MHz",
          "Cooling": "Dual Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x8",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RX6600 GIGABYTE EAGLE *TRI FAN",
        image: RX6600,
        price: "PHP 13,799",
        details: "Triple fan RX6600 for enhanced cooling and quiet operation.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2491 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x8",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "16GB RX7600XT GIGABYTE GAMING OC *TRI FAN",
        image: RX7600XT,
        price: "PHP 23,995",
        details: "High-performance 16GB GPU with triple fan cooling for demanding games.",
        specifications: {
          "Memory": "16GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2755 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x8",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "12GB RX7700XT GIGABYTE GAMING OC *TRI FAN",
        image: RX7700XT,
        price: "PHP 27,995",
        details: "Powerful 1440p gaming GPU with triple fan design.",
        specifications: {
          "Memory": "12GB GDDR6",
          "Memory Bus": "192-bit",
          "Boost Clock": "2544 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "2x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "2x 8-pin",
        }
      },
      {
        name: "16GB RX7800XT SAPPHIRE PURE *TRI FAN *White",
        image: RX7800XT,
        price: "PHP 33,795",
        details: "Premium white triple fan GPU for high-end gaming and content creation.",
        specifications: {
          "Memory": "16GB GDDR6",
          "Memory Bus": "256-bit",
          "Boost Clock": "2430 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "2x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "2x 8-pin",
        }
      },
      {
        name: "16GB RX7800XT GIGABYTE GAMING OC *TRI FAN",
        image: RX7800XT,
        price: "PHP 33,995",
        details: "Triple fan RX7800XT for top-tier 1440p gaming performance.",
        specifications: {
          "Memory": "16GB GDDR6",
          "Memory Bus": "256-bit",
          "Boost Clock": "2430 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "2x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "2x 8-pin",
        }
      },
      {
        name: "8GB RTX4060 GALAX 1-Click OC 2X *(DUALFAN)",
        image: RTX4060,
        price: "PHP 17,795",
        details: "NVIDIA Ada Lovelace GPU with dual fan cooling and 1-Click OC feature.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2460 MHz",
          "Cooling": "Dual Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x8",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RTX4060 GIGABYTE EAGLE *TRI FAN",
        image: RTX4060,
        price: "PHP 19,995",
        details: "Triple fan RTX4060 for efficient cooling and quiet operation.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2460 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x8",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RTX4060 GIGABYTE EAGLE ICE *TRI FAN *WHITE",
        image: RTX4060,
        price: "PHP 20,495",
        details: "White edition RTX4060 with triple fan cooling for stylish builds.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2460 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x8",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RTX4060Ti GIGABYTE EAGLE *TRI FAN",
        image: RTX4060Ti,
        price: "PHP 24,999",
        details: "Triple fan RTX4060Ti for advanced gaming and creative workloads.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2535 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RTX4060Ti GIGABYTE EAGLE ICE *WHITE(TRI FAN)",
        image: RTX4060Ti,
        price: "PHP 25,999",
        details: "White triple fan RTX4060Ti for high-performance and aesthetics.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2535 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 2x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RTX4060Ti Colorful NB DUO",
        image: RTX4060TiColorful,
        price: "PHP 22,999",
        details: "Colorful NB DUO RTX4060Ti with dual fan cooling for efficient gaming.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2535 MHz",
          "Cooling": "Dual Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "8GB RTX4060Ti IGAME ULTRA OC *WHITE(TRI FAN)",
        image: RTX4060Ti,
        price: "PHP 24,995",
        details: "White triple fan IGAME ULTRA OC for advanced gaming and overclocking.",
        specifications: {
          "Memory": "8GB GDDR6",
          "Memory Bus": "128-bit",
          "Boost Clock": "2580 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "12GB RTX4070 GALAX 1-Click OC 2X *(DUALFAN)",
        image: RTX4070,
        price: "PHP 33,995",
        details: "High-end RTX4070 with dual fan cooling and 1-Click OC for smooth 1440p gaming.",
        specifications: {
          "Memory": "12GB GDDR6X",
          "Memory Bus": "192-bit",
          "Boost Clock": "2475 MHz",
          "Cooling": "Dual Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "12GB RTX4070 IGAME ULTRA OC*WHITE(TRI FAN)",
        image: RTX4070,
        price: "PHP 34,695",
        details: "Premium white triple fan RTX4070 for top-tier gaming and creative work.",
        specifications: {
          "Memory": "12GB GDDR6X",
          "Memory Bus": "192-bit",
          "Boost Clock": "2505 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 8-pin",
        }
      },
      {
        name: "16GB RTX4070Ti Super IGAME ULTRA W OC *WHITE(TRI FAN)",
        image: RTX4070Colorful,
        price: "PHP 48,495",
        details: "Flagship RTX4070Ti Super with white triple fan cooling for ultimate performance.",
        specifications: {
          "Memory": "16GB GDDR6X",
          "Memory Bus": "256-bit",
          "Boost Clock": "2655 MHz",
          "Cooling": "Triple Fan",
          "Outputs": "1x HDMI, 3x DisplayPort",
          "DirectX": "12 Ultimate",
          "PCIe Interface": "PCIe 4.0 x16",
          "Power Connector": "1x 16-pin (12VHPWR)",
        }
      }
    ],
    brands: ["NVIDIA", "AMD", "ASRock", "Gigabyte", "Sapphire", "Colorful", "GALAX"]
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
        specifications: {
          "Form Factor": "Mid-Tower",
          "Pre-installed PSU": "700W",
          "Material": "Steel & Plastic",
          "Cooling Support": "Basic Airflow"
        }
      },

      // Tempered Glass Case
      {
        name: "KEYTECH ROBIN LITE (Black/White)",
        image: KEYTECHROBINLITE,
        price: "PHP 1,480",
        details: "Minimalist tempered glass case available in black or white.",
        specifications: {
          "Form Factor": "Mid-Tower",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Cooling Support": "120mm Fans"
        }
      },
      {
        name: "KEYTECH ROBIN VIEW (Black/White)",
        image: KEYTECHROBINVIEW,
        price: "PHP 1,480",
        details: "Tempered glass case with a stylish view panel, available in black or white.",
        specifications: {
          "Form Factor": "Mid-Tower",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Cooling Support": "120mm Fans"
        }
      },
      {
        name: "INPLAY OPENVIEW V100 (White/Black)",
        image: INPLAYOPENVIEWV100,
        price: "PHP 1,499",
        details: "Elegant tempered glass case available in white or black.",
        specifications: {
          "Form Factor": "Mid-Tower",
          "Material": "Steel & Acrylic",
          "Color": "White/Black",
          "Cooling Support": "120mm Fans"
        }
      },
      {
        name: "1stPlayer MIKU 2 (Black/White)",
        image: PlayerMIKU2,
        price: "PHP 1,700",
        details: "Modern tempered glass case with good airflow, available in black or white.",
        specifications: {
          "Form Factor": "Mid-Tower",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Cooling Support": "120mm Fans, RGB Compatibility"
        }
      },
      {
        name: "COOLMAN REYNA (White)",
        image: COOLMANREYNA,
        price: "PHP 1,850",
        details: "Futuristic tempered glass case in white with support for high-performance cooling.",
        specifications: {
          "Form Factor": "Mid-Tower",
          "Material": "Steel & Tempered Glass",
          "Color": "White",
          "Cooling Support": "120mm & 140mm Fans, Water Cooling Radiator Support"
        }
      },

      // Mesh Case
      {
        name: "KEYTECH DARKVADER W/ 2 FANS (Black)",
        image: KEYTECHROBINLITE,
        price: "PHP 1,199",
        details: "Mesh front panel case with 2 pre-installed fans for optimal airflow.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "Black",
          "Cooling": "2x Fans Included"
        }
      },
      {
        name: "INPLAY META A200 MESH W/ 3 FANS (Black)",
        image: INPLAYOPENVIEWV100,
        price: "PHP 1,399",
        details: "Mesh case with 3 pre-installed fans for excellent cooling, black color.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "Black",
          "Cooling": "3x Fans Included"
        }
      },
      {
        name: "INPLAY META A200 MESH W/ 3 FANS (White)",
        image: INPLAYOPENVIEWV100,
        price: "PHP 1,499",
        details: "Mesh case with 3 pre-installed fans for excellent cooling, white color.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "White",
          "Cooling": "3x Fans Included"
        }
      },
      {
        name: "INPLAY METEOR 30 MESH (White)",
        image: INPLAYOPENVIEWV100,
        price: "PHP 1,299",
        details: "Compact mesh case in white for improved airflow.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "White",
          "Cooling Support": "Mesh Front"
        }
      },
      {
        name: "KEYTECH CUIRASS MESH (White/Black)",
        image: KEYTECHROBINLITE,
        price: "PHP 1,599",
        details: "Mesh case available in white or black for high airflow builds.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "White/Black",
          "Cooling Support": "Mesh Front"
        }
      },
      {
        name: "KEYTECH VISOR (Black/White)",
        image: KEYTECHROBINLITE,
        price: "PHP 1,699",
        details: "Stylish mesh case available in black or white.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "Black/White",
          "Cooling Support": "Mesh Front"
        }
      },
      {
        name: "DARKFLASH DB330M MESH (Black/White)",
        image: DARKFLASHDB330M,
        price: "PHP 1,850",
        details: "Mesh case with excellent airflow, available in black or white.",
        specifications: {
          "Form Factor": "Micro-ATX",
          "Material": "Steel & Mesh",
          "Color": "Black/White",
          "Cooling Support": "120mm & 140mm Fans"
        }
      },

      // Dual Chamber Case
      {
        name: "KEYTECH ROBIN CUBE (Black/White)",
        image: KEYTECHROBINVIEW,
        price: "PHP 1,850",
        details: "Dual chamber case for improved cable management, available in black or white.",
        specifications: {
          "Form Factor": "Cube",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Design": "Dual Chamber"
        }
      },
      {
        name: "KEYTECH ROBIN MINI (Black)",
        image: KEYTECHROBINLITE,
        price: "PHP 2,050",
        details: "Compact dual chamber case in black for mini builds.",
        specifications: {
          "Form Factor": "Mini-Tower",
          "Material": "Steel & Tempered Glass",
          "Color": "Black",
          "Design": "Dual Chamber"
        }
      },
      {
        name: "KEYTECH 011 (Black/White)",
        image: KEYTECHROBINVIEW,
        price: "PHP 2,750",
        details: "Spacious dual chamber case inspired by the O11 design, available in black or white.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Design": "Dual Chamber"
        }
      },
      {
        name: "COOLMAN SPECTRA (Black/White)",
        image: COOLMANREYNA,
        price: "PHP 2,850",
        details: "Dual chamber case with modern aesthetics, available in black or white.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Design": "Dual Chamber"
        }
      },
      {
        name: "COOLMAN SPECTRA LUXE (Black/White)",
        image: COOLMANREYNA,
        price: "PHP 3,200",
        details: "Premium dual chamber case with luxe features, available in black or white.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Tempered Glass",
          "Color": "Black/White",
          "Design": "Dual Chamber"
        }
      },

      // Premium Case
      {
        name: "DEEPCOOL MATREXX V55 V3 (White, SALE)",
        image: KEYTECHROBINLITE,
        price: "PHP 1,999",
        details: "Premium white case on sale, with tempered glass and spacious interior.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Tempered Glass",
          "Color": "White",
          "Build": "Premium"
        }
      },
      {
        name: "FSP CST360 MESH (Black)",
        image: KEYTECHROBINLITE,
        price: "PHP 2,800",
        details: "Premium mesh case from FSP in black for high airflow.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "Black",
          "Build": "Premium"
        }
      },
      {
        name: "FSP CST360 MESH (White)",
        image: KEYTECHROBINLITE,
        price: "PHP 2,995",
        details: "Premium mesh case from FSP in white for high airflow.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Mesh",
          "Color": "White",
          "Build": "Premium"
        }
      },
      {
        name: "ASUS TUF Gaming GT501 (White)",
        image: AsusMotherboard,
        price: "PHP 5,500",
        details: "High-end white case from ASUS TUF series, built for durability and airflow.",
        specifications: {
          "Form Factor": "ATX",
          "Material": "Steel & Tempered Glass",
          "Color": "White",
          "Build": "Premium"
        }
      },
      {
        name: "LIANLI O11 Dynamic MINI (Snow White)",
        image: LIANLIO11DynamicMINI,
        price: "PHP 6,000",
        details: "Premium small-form-factor case in snow white, designed for high-performance builds.",
        specifications: {
          "Form Factor": "Mini-Tower",
          "Material": "Aluminum & Tempered Glass",
          "Color": "Snow White",
          "Design": "Modular"
        }
      }
    ],
    brands: ["NZXT", "Cooler Master", "Lian Li", "DarkFlash", "Keytech", "Inplay", "Coolman", "FSP", "ASUS", "DEEPCOOL"]
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
        specifications: {
          "Wattage": "750W",
          "Certification": "Non-Certified",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "500W COUGAR STC500 80+ White",
        image: COUGARSTC500,
        price: "PHP 2,280",
        details: "An entry-level 80+ White certified PSU for basic system builds.",
        specifications: {
          "Wattage": "500W",
          "Certification": "80+ White",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "550W CORSAIR CX550 80+ Bronze",
        image: CORSAIRCX550,
        price: "PHP 2,995",
        details: "A reliable 80+ Bronze PSU for mid-range gaming and workstation builds.",
        specifications: {
          "Wattage": "550W",
          "Certification": "80+ Bronze",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "650W CORSAIR CX650 80+ Bronze",
        image: CORSAIRCX550,
        price: "PHP 3,485",
        details: "A durable PSU with Bronze efficiency, ideal for mid-range gaming PCs.",
        specifications: {
          "Wattage": "650W",
          "Certification": "80+ Bronze",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "750W CORSAIR CX750 80+ Bronze",
        image: CORSAIRCX550,
        price: "PHP 3,985",
        details: "A high-capacity PSU for gaming and workstation builds with decent efficiency.",
        specifications: {
          "Wattage": "750W",
          "Certification": "80+ Bronze",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "850W CORSAIR RM850e 80+ GOLD FM",
        image: CORSAIRCX550,
        price: "PHP 8,195",
        details: "A fully modular, high-performance PSU with Gold efficiency for powerful builds.",
        specifications: {
          "Wattage": "850W",
          "Certification": "80+ Gold",
          "Modularity": "Fully Modular",
          "Fan": "135mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "850W FSP VITA GM 80+ GOLD PCIE 5.1 FM",
        image: FSPVITAGM,
        price: "PHP 7,300",
        details: "Gold-certified, fully modular PSU with PCIe 5.1 support for high-end systems.",
        specifications: {
          "Wattage": "850W",
          "Certification": "80+ Gold",
          "PCIe": "5.1",
          "Modularity": "Fully Modular",
          "Fan": "135mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "850W FSP VITA GM 80+ GOLD PCIE 5.1 FM (White)",
        image: FSPVITAGM,
        price: "PHP 7,495",
        details: "White edition, Gold-certified, fully modular PSU with PCIe 5.1 support.",
        specifications: {
          "Wattage": "850W",
          "Certification": "80+ Gold",
          "PCIe": "5.1",
          "Modularity": "Fully Modular",
          "Fan": "135mm",
          "Form Factor": "Standard ATX",
          "Color": "White"
        }
      },
      {
        name: "1000W FSP VITA GM 80+ GOLD PCIE 5.1 FM",
        image: FSPVITAGM,
        price: "PHP 8,500",
        details: "A high-capacity, fully modular PSU designed for extreme performance systems.",
        specifications: {
          "Wattage": "1000W",
          "Certification": "80+ Gold",
          "PCIe": "5.1",
          "Modularity": "Fully Modular",
          "Fan": "135mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "650W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
        image: CORSAIRCX550,
        price: "PHP 2,995",
        details: "Bronze certified PSU with ATX 3.1 standard for modern builds.",
        specifications: {
          "Wattage": "650W",
          "Certification": "80+ Bronze",
          "ATX Version": "3.1",
          "Modularity": "Non-Modular",
          "Fan": "120mm"
        }
      },
      {
        name: "750W COOLERMASTER MWE V3 80+ Bronze ATX 3.1",
        image: CORSAIRCX550,
        price: "PHP 3,485",
        details: "Reliable Bronze PSU with ATX 3.1 standard for gaming and workstation PCs.",
        specifications: {
          "Wattage": "750W",
          "Certification": "80+ Bronze",
          "ATX Version": "3.1",
          "Modularity": "Non-Modular",
          "Fan": "120mm"
        }
      },
      {
        name: "750W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
        image: CORSAIRCX550,
        price: "PHP 6,995",
        details: "Gold certified, fully modular PSU with ATX 3.1 for high-end builds.",
        specifications: {
          "Wattage": "750W",
          "Certification": "80+ Gold",
          "ATX Version": "3.1",
          "Modularity": "Fully Modular",
          "Fan": "135mm"
        }
      },
      {
        name: "850W COOLERMASTER MWE V2 80+ GOLD ATX 3.1 FM",
        image: CORSAIRCX550,
        price: "PHP 7,995",
        details: "High-wattage, Gold certified, fully modular PSU for demanding systems.",
        specifications: {
          "Wattage": "850W",
          "Certification": "80+ Gold",
          "ATX Version": "3.1",
          "Modularity": "Fully Modular",
          "Fan": "135mm"
        }
      },
      {
        name: "650W MSI MAG A650BN 80+ Bronze",
        image: CORSAIRCX550,
        price: "PHP 3,350",
        details: "Bronze certified PSU from MSI for reliable power delivery.",
        specifications: {
          "Wattage": "650W",
          "Certification": "80+ Bronze",
          "Modularity": "Non-Modular",
          "Fan": "120mm"
        }
      },
      {
        name: "750W MSI MAG A750BN 80+ Bronze PCIE5",
        image: CORSAIRCX550,
        price: "PHP 4,295",
        details: "Bronze certified PSU with PCIe 5 support for modern GPUs.",
        specifications: {
          "Wattage": "750W",
          "Certification": "80+ Bronze",
          "PCIe": "5",
          "Modularity": "Non-Modular",
          "Fan": "120mm"
        }
      },
      {
        name: "750W MSI MAG A750GL 80+ GOLD PCIE5 FM",
        image: CORSAIRCX550,
        price: "PHP 5,995",
        details: "Gold certified, fully modular PSU with PCIe 5 for high-end graphics cards.",
        specifications: {
          "Wattage": "750W",
          "Certification": "80+ Gold",
          "PCIe": "5",
          "Modularity": "Fully Modular",
          "Fan": "135mm"
        }
      },
      {
        name: "550W GIGABYTE P550SS 80+ SILVER",
        image: GIGABYTEP550SS,
        price: "PHP 2,395",
        details: "A budget Silver-rated PSU for stable and efficient performance.",
        specifications: {
          "Wattage": "550W",
          "Certification": "80+ Silver",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "550W GIGABYTE P550SS 80+ SILVER White",
        image: GIGABYTEP550SSSILVERWhite,
        price: "PHP 2,495",
        details: "A stylish white variant of the P550SS, providing stable power efficiency.",
        specifications: {
          "Wattage": "550W",
          "Certification": "80+ Silver",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX",
          "Color": "White"
        }
      },
      {
        name: "650W GIGABYTE P650SS 80+ SILVER White",
        image: GIGABYTEP550SSSILVERWhite,
        price: "PHP 3,600",
        details: "White edition, Silver certified PSU for mid-range builds.",
        specifications: {
          "Wattage": "650W",
          "Certification": "80+ Silver",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX",
          "Color": "White"
        }
      },
      {
        name: "650W GIGABYTE P650G 80+ GOLD",
        image: GIGABYTEP550SS,
        price: "PHP 3,985",
        details: "Gold certified PSU for efficient and stable power delivery.",
        specifications: {
          "Wattage": "650W",
          "Certification": "80+ Gold",
          "Modularity": "Non-Modular",
          "Fan": "120mm",
          "Form Factor": "Standard ATX"
        }
      },
      {
        name: "850W AORUS ELITE P850W PCIE5 80+ PLATINUM FULLY MODULAR PSU",
        image: GIGABYTEP550SS,
        price: "PHP 8,450",
        details: "Platinum certified, fully modular PSU with PCIe 5 for enthusiast builds.",
        specifications: {
          "Wattage": "850W",
          "Certification": "80+ Platinum",
          "PCIe": "5",
          "Modularity": "Fully Modular",
          "Fan": "135mm",
          "Form Factor": "Standard ATX"
        }
      }
    ],
    brands: ["Corsair", "EVGA", "Seasonic", "FSP", "Cooler Master", "MSI", "Gigabyte", "AORUS"]
  },
  {
    name: "Monitor",
    image: Monitor,
    category: "monitor",
    products: [
      {
        name: "20' NVISION LED MONITOR (60HZ)",
        image: NVISIONLed,
        price: "PHP 2,498",
        details: "20-inch NVISION LED monitor with 60Hz refresh rate.",
        specifications: {
          "Size": "20\"",
          "Panel": "LED",
          "Refresh Rate": "60Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "22' NVISION IPS FRAMELESS MONITOR (100HZ, Black)",
        image: NVISIONFrameless,
        price: "PHP 3,698",
        details: "22-inch NVISION IPS frameless monitor, 100Hz, black.",
        specifications: {
          "Size": "22\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Color": "Black",
          "Status": "SOLD OUT"
        }
      },
      {
        name: "22' NVISION IPS FRAMELESS MONITOR (100HZ, White)",
        image: NVISIONFrameless,
        price: "PHP 3,798",
        details: "22-inch NVISION IPS frameless monitor, 100Hz, white.",
        specifications: {
          "Size": "22\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Color": "White",
          "Status": "SOLD OUT"
        }
      },
      {
        name: "24' NVISION IPS FRAMELESS MONITOR (100HZ, White)",
        image: NVISIONFrameless,
        price: "PHP 4,498",
        details: "24-inch NVISION IPS frameless monitor, 100Hz, white.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Color": "White",
          "Status": "SOLD OUT"
        }
      },
      {
        name: "24' HKC IPS FRAMELESS MONITOR (100HZ)",
        image: HKCFrameless,
        price: "PHP 4,598",
        details: "24-inch HKC IPS frameless monitor, 100Hz.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Status": "SOLD OUT"
        }
      },
      {
        name: "27' HKC IPS FRAMELESS MONITOR (100HZ)",
        image: HKCFrameless,
        price: "PHP 5,998",
        details: "27-inch HKC IPS frameless monitor, 100Hz.",
        specifications: {
          "Size": "27\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' HKC FRAMELESS MONITOR (180HZ)",
        image: HKCFrameless,
        price: "PHP 5,998",
        details: "24-inch HKC frameless monitor, 180Hz.",
        specifications: {
          "Size": "24\"",
          "Design": "Frameless",
          "Refresh Rate": "180Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "34' HKC MG34H2UB ULTRA WIDE CURVE (165HZ, 1440P)",
        image: HKCFrameless,
        price: "PHP 14,498",
        details: "34-inch HKC ultra wide curved monitor, 165Hz, 1440p.",
        specifications: {
          "Size": "34\"",
          "Aspect": "Ultra Wide",
          "Design": "Curved",
          "Refresh Rate": "165Hz",
          "Resolution": "1440p",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' VIEWSONIC IPS FRAMELESS MONITOR (100HZ, Black)",
        image: VIEWSONICFrameless,
        price: "PHP 4,998",
        details: "24-inch ViewSonic IPS frameless monitor, 100Hz, black.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Color": "Black",
          "Status": "SOLD OUT"
        }
      },
      {
        name: "24' VIEWSONIC IPS FRAMELESS MONITOR (100HZ, Pink)",
        image: VIEWSONICFrameless,
        price: "PHP 6,298",
        details: "24-inch ViewSonic IPS frameless monitor, 100Hz, pink.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Color": "Pink",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' VIEWSONIC IPS FRAMELESS MONITOR (240HZ)",
        image: VIEWSONICFrameless,
        price: "PHP 7,998",
        details: "24-inch ViewSonic IPS frameless monitor, 240Hz.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "240Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "27' VIEWSONIC IPS FRAMELESS MONITOR (240HZ)",
        image: VIEWSONICFrameless,
        price: "PHP 9,998",
        details: "27-inch ViewSonic IPS frameless monitor, 240Hz.",
        specifications: {
          "Size": "27\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "240Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "27' VIEWSONIC IPS FRAMELESS MONITOR (240HZ, 1440P)",
        image: VIEWSONICFrameless,
        price: "PHP 16,998",
        details: "27-inch ViewSonic IPS frameless monitor, 240Hz, 1440p.",
        specifications: {
          "Size": "27\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "240Hz",
          "Resolution": "1440p",
          "Status": "SOLD OUT"
        }
      },
      {
        name: "22' ACER IPS FRAMELESS MONITOR (100HZ)",
        image: ACERFrameless,
        price: "PHP 4,198",
        details: "22-inch Acer IPS frameless monitor, 100Hz.",
        specifications: {
          "Size": "22\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24.5' ACER IPS FRAMELESS MONITOR (120HZ)",
        image: ACERFrameless,
        price: "PHP 5,498",
        details: "24.5-inch Acer IPS frameless monitor, 120Hz.",
        specifications: {
          "Size": "24.5\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "120Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' ACER IPS FRAMELESS MONITOR (180HZ)",
        image: ACERFrameless,
        price: "PHP 7,498",
        details: "24-inch Acer IPS frameless monitor, 180Hz.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "180Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' ACER IPS FRAMELESS MONITOR (200HZ)",
        image: ACERFrameless,
        price: "PHP 7,998",
        details: "24-inch Acer IPS frameless monitor, 200Hz.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "200Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' SAMSUNG IPS FRAMELESS MONITOR (100HZ)",
        image: SAMSUNGFrameless,
        price: "PHP 5,998",
        details: "24-inch Samsung IPS frameless monitor, 100Hz.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "100Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "24' ASUS TUF IPS FRAMELESS MONITOR (180HZ)",
        image: ASUSFrameless,
        price: "PHP 8,999",
        details: "24-inch ASUS TUF IPS frameless monitor, 180Hz.",
        specifications: {
          "Size": "24\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "180Hz",
          "Status": "IN STOCK"
        }
      },
      {
        name: "27' ASUS TUF IPS FRAMELESS MONITOR (180HZ, 1440p)",
        image: ASUSFrameless,
        price: "PHP 15,495",
        details: "27-inch ASUS TUF IPS frameless monitor, 180Hz, 1440p.",
        specifications: {
          "Size": "27\"",
          "Panel": "IPS",
          "Design": "Frameless",
          "Refresh Rate": "180Hz",
          "Resolution": "1440p",
          "Status": "IN STOCK"
        }
      },
      {
        name: "34' ASUS TUF ULTRA WIDE CURVE (180HZ, 1440P)",
        image: ASUSUltraWide,
        price: "PHP 19,995",
        details: "34-inch ASUS TUF ultra wide curved monitor, 180Hz, 1440p.",
        specifications: {
          "Size": "34\"",
          "Aspect": "Ultra Wide",
          "Design": "Curved",
          "Refresh Rate": "180Hz",
          "Resolution": "1440p",
          "Status": "IN STOCK"
        }
      }
    ],
    brands: ["NVISION", "HKC", "VIEWSONIC", "ACER", "SAMSUNG", "ASUS"]
  },
  {
    name: "Peripherals", image: Peripheral, category: "peripherals", products: [
      {
        name: "Logitech G502 HERO",
        image: LogitechG502HERO,
        price: "PHP 3,195",
        details: "High-performance gaming mouse with HERO 25K sensor for precise tracking.",
        specifications: {
          "DPI": "100-25,600",
          "Buttons": "11",
          "Weight Tuning System": "Yes",
          "RGB": "Yes"
        }
      },
      {
        name: "Razer DeathAdder V2",
        image: RazerDeathAdderV2,
        price: "PHP 2,795",
        details: "Ergonomic gaming mouse with Focus+ Optical Sensor and Speedflex cable.",
        specifications: {
          "DPI": "20,000",
          "Buttons": "8",
          "Weight": "82g",
          "RGB": "Yes"
        }
      },
      {
        name: "SteelSeries Apex 3 TKL",
        image: SteelSeriesApex3KL,
        price: "PHP 2,599",
        details: "Water-resistant gaming keyboard with customizable RGB lighting.",
        specifications: {
          "Switches": "Whisper-Quiet Membrane",
          "RGB": "Yes",
          "Connectivity": "Wired",
          "Water Resistance": "IP32"
        }
      },
      {
        name: "HyperX Alloy Origins Core",
        image: HyperXAlloyOriginsCore,
        price: "PHP 4,695",
        details: "Compact TKL mechanical keyboard with HyperX Red switches.",
        specifications: {
          "Switches": "HyperX Red (Linear)",
          "RGB": "Yes",
          "Connectivity": "Wired",
          "Frame": "Aluminum"
        }
      },
      {
        name: "Razer BlackShark V2 X",
        image: RazerBlackSharkV2X,
        price: "PHP 2,995",
        details: "Lightweight gaming headset with 50mm Triforce drivers and HyperClear Cardioid Mic.",
        specifications: {
          "Drivers": "50mm",
          "Connection": "3.5mm",
          "Noise Cancellation": "Passive",
          "Weight": "240g"
        }
      },
      {
        name: "Logitech G435 Wireless",
        image: LogitechG435Wireless,
        price: "PHP 3,295",
        details: "Ultra-lightweight gaming headset with Bluetooth and Lightspeed Wireless.",
        specifications: {
          "Drivers": "40mm",
          "Connection": "Bluetooth & Lightspeed",
          "Weight": "165g",
          "Battery Life": "18 Hours"
        }
      },
      {
        name: "SteelSeries QcK Heavy Mouse Pad",
        image: SteelSeriesQcKHeavyMousePad,
        price: "PHP 1,495",
        details: "Thick gaming mouse pad with micro-woven cloth for precision tracking.",
        specifications: {
          "Size": "Large",
          "Material": "Cloth",
          "Base": "Non-Slip Rubber"
        }
      },
      {
        name: "HyperX Pulsefire Haste",
        image: HyperXPulsefireHaste,
        price: "PHP 2,195",
        details: "Ultra-light honeycomb gaming mouse with Pixart 3335 sensor.",
        specifications: {
          "DPI": "16,000",
          "Buttons": "6",
          "Weight": "59g",
          "RGB": "Yes"
        }
      }
    ],
    brands: ["Logitech", "Razer", "SteelSeries", "HyperX"]
  }
];


menuItems.forEach(category => {
  if (Array.isArray(category.products)) {
    category.products.forEach(product => {
      if (product.price) {
        // Remove PHP prefix and any non-numeric characters except dots and commas
        const numericPrice = product.price.toString().replace(/[^0-9.,]/g, "");
        // Parse to float and format with 2 decimal places
        const formattedPrice = parseFloat(numericPrice.replace(/,/g, "")).toLocaleString(undefined, {
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
  const cartCount = cartItems.reduce((acc, item) => acc + (item ? item.quantity || 0 : 0), 0);
  cartIcon.setAttribute("data-count", cartCount);
};


const getPrice = (item) => {
  if (!item || !item.price) return 0;
  return typeof item.price === "number"
    ? item.price
    : parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
};




// Compatibility helpers (mirroring PCUpgrade logic)
const getSpec = (product, key) => {
  try {
    const specs = product?.specifications || {};
    const entry = Object.entries(specs).find(([k]) => k.toLowerCase() === String(key).toLowerCase());
    return entry ? String(entry[1]) : '';
  } catch { return ''; }
};
const norm = (s) => String(s || '').toUpperCase();
const normSocket = (s) => norm(s).replace(/\s|-/g, '');
const getCpuSocket = (cpu) => normSocket(getSpec(cpu, 'Socket'));
const getMoboSocket = (mobo) => normSocket(getSpec(mobo, 'Socket'));
const moboMemType = (mobo) => {
  const raw = norm(getSpec(mobo, 'Memory Slots') || getSpec(mobo, 'Memory'));
  if (raw.includes('DDR5')) return 'DDR5';
  if (raw.includes('DDR4')) return 'DDR4';
  return '';
};
const ramType = (ram) => {
  const raw = norm(getSpec(ram, 'Type'));
  if (raw.includes('DDR5')) return 'DDR5';
  if (raw.includes('DDR4')) return 'DDR4';
  return '';
};
const parsePsuWattage = (psu) => {
  const src = getSpec(psu, 'Wattage') || psu?.name || '';
  const m = String(src).match(/([0-9]{3,4})\s*W/i);
  return m ? parseInt(m[1], 10) : 0;
};
const recommendWattForGpu = (gpu) => {
  const name = norm(gpu?.name);
  if (name.includes('4070 TI') || name.includes('4070TI')) return 750;
  if (name.includes('4070')) return 650;
  if (name.includes('4060 TI') || name.includes('4060TI')) return 600;
  if (name.includes('4060')) return 550;
  if (name.includes('RX 7800') || name.includes('RX7800')) return 700;
  if (name.includes('RX 7700') || name.includes('RX7700')) return 650;
  if (name.includes('RX 7600') || name.includes('RX7600')) return 600;
  if (name.includes('RX 6600') || name.includes('RX6600')) return 500;
  if (name.includes('RX 580') || name.includes('RX580')) return 500;
  if (name.includes('RX 550') || name.includes('RX550')) return 350;
  return 450;
};
const getMoboFormFactor = (mobo) => norm(getSpec(mobo, 'Form Factor'));
const caseSupportsMobo = (caseProd, moboFormFactor) => {
  const ff = norm(getSpec(caseProd, 'Form Factor'));
  const m = norm(moboFormFactor);
  if (m.includes('ATX')) return ff.includes('ATX');
  if (m.includes('MICROATX') || m.includes('MICRO-ATX')) return ff.includes('ATX') || ff.includes('MICRO');
  if (m.includes('MINI')) return true;
  return true;
};

const moboSupportsNvme = (mobo) => {
  try {
    const str = norm(Object.values(mobo?.specifications || {}).join(' '));
    return /(M\.2|M2|NVME)/.test(str);
  } catch { return true; }
};
const moboSupportsSata = (mobo) => {
  try {
    const str = norm(Object.values(mobo?.specifications || {}).join(' '));
    return /SATA/.test(str);
  } catch { return true; }
};
const detectStorageKind = (product) => {
  const t = norm(getSpec(product, 'Type'));
  const n = norm(product?.name);
  if (t.includes('NVME') || /(NVME|M\.2|M2)/.test(n)) return 'NVMe';
  if (t.includes('SATA') || /SATA/.test(n) || /HDD|HARD DISK/.test(n)) return 'SATA';
  // default to SATA if unclear
  return 'SATA';
};

// CPU ↔ Cooler helpers
const parseCpuTdpWatts = (cpu) => {
  const t = getSpec(cpu, 'TDP') || '';
  const m = String(t).match(/([0-9]{2,3})\s*W/i);
  return m ? parseInt(m[1], 10) : 0;
};
const estimateCoolerTdpCapacity = (cooler) => {
  const name = norm(cooler?.name);
  if (name.includes('360')) return 260;
  if (name.includes('280')) return 220;
  if (name.includes('240')) return 200;
  if (name.includes('120')) return 140;
  if (name.includes('AK500')) return 220;
  if (name.includes('AG500')) return 190;
  if (name.includes('AK400')) return 150;
  if (name.includes('GAMMAX 400')) return 130;
  if (name.includes('AG300')) return 110;
  if (name.includes('AG200')) return 95;
  if (name.includes('INTEL 1ST') || name.includes('1ST-11TH') || name.includes('AMD (AM3') || name.includes('AM3/AM4')) return 70;
  return 120;
};
const coolerSupportsSocket = (cooler, socketNorm, cpuIsAMD) => {
  const sup = norm(getSpec(cooler, 'Supported Sockets') || getSpec(cooler, 'Socket'));
  if (sup.includes('UNIVERSAL')) return true;
  if (!socketNorm) return true;
  if (sup.replace(/\s|-/g, '').includes(socketNorm)) return true;
  if (cpuIsAMD && sup.includes('AMD')) return true;
  if (!cpuIsAMD && sup.includes('INTEL')) return true;
  const name = norm(cooler?.name).replace(/\s|-/g, '');
  if (name.includes(socketNorm)) return true;
  return false;
};
const coolerMeetsCpuTdp = (cooler, cpu) => {
  const cpuTdp = parseCpuTdpWatts(cpu);
  if (!cpuTdp) return true; // unknown TDP
  const headroom = cpuTdp >= 105 ? 1.35 : 1.25;
  const capacity = estimateCoolerTdpCapacity(cooler);
  return capacity >= Math.ceil(cpuTdp * headroom);
};

function PCCustomized() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [selectedItem, setSelectedItem] = useState(0); // Start with CPU as default
  const [unlockedCategories, setUnlockedCategories] = useState([0]); // Only CPU unlocked initially
  const [cartCount, setCartCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);

  // Keep refs to each step container for targeted scroll
  const stepRefs = useRef([]);
  // Flag: returning from product add action
  const cameFromAdd = !!(location.state && (location.state.added || location.state.fromAdd || location.state.returnAction === 'added'));

  // Force manual scroll restoration to prevent the browser from resetting to top
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    return () => {
      if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Unlock the next category when a product is added to the current one
  useEffect(() => {
    const newUnlocked = [];
    for (let i = 0; i < menuItems.length; i++) {
      if (cart[i]) {
        newUnlocked.push(i);
      } else {
        // Unlock the next category after the last filled one
        newUnlocked.push(i);
        break;
      }
    }
    setUnlockedCategories(newUnlocked);
  }, [cart]);

  useEffect(() => {
    if (location.state && typeof location.state.selectedCategory === "number") {
      setSelectedItem(location.state.selectedCategory);
    }
  }, [location.state]);

  // Restore scroll position unless we are coming back from an add action
  useLayoutEffect(() => {
    const savedRaw = sessionStorage.getItem('pc-customized-scroll');
    const savedY = savedRaw ? parseInt(savedRaw, 10) : null;

    if (cameFromAdd) {
      // Ignore previous scroll restoration; focus logic handled in next effect
      try { sessionStorage.removeItem('pc-customized-scroll'); } catch (e) { }
      return;
    }

    const scrollToY = (y) => {
      if (typeof y !== 'number' || isNaN(y)) return;
      window.scrollTo(0, y);
    };

    if (savedY !== null && !isNaN(savedY)) {
      // Try immediate scroll before paint
      scrollToY(savedY);
    }
  }, [cameFromAdd]);

  // Fallback retries after mount to handle late layout/image loads
  useEffect(() => {
    const savedRaw = sessionStorage.getItem('pc-customized-scroll');
    const savedY = savedRaw ? parseInt(savedRaw, 10) : null;

    if (!cameFromAdd && savedY !== null && !isNaN(savedY)) {
      const attempts = [0, 50, 150, 300, 600];
      attempts.forEach((delay, idx) => {
        setTimeout(() => {
          window.scrollTo(0, savedY);
          if (idx === attempts.length - 1) {
            sessionStorage.removeItem('pc-customized-scroll');
          }
        }, delay);
      });
      return;
    }

    // If we added a product, focus the next active/unlocked step instead
    if (cameFromAdd) {
      const tryScrollNextActive = () => {
        const active = document.querySelector('.pc-customizer-step.unlocked-step.active-step');
        if (active && typeof active.scrollIntoView === 'function') {
          active.scrollIntoView({ behavior: 'auto', block: 'center' });
          return true;
        }
        // Fallback to computed next index via refs
        const last = Array.isArray(cart) ? cart.findLastIndex((x) => x) : -1;
        let next = Math.min(last + 1, menuItems.length - 1);
        // Skip hidden categories (monitor/peripherals)
        const hidden = new Set(['monitor', 'peripherals']);
        while (next < menuItems.length && hidden.has(menuItems[next]?.category)) next++;
        const fallbackIdx = (location.state && typeof location.state.selectedCategory === 'number') ? location.state.selectedCategory : 0;
        const el = stepRefs.current[next] || stepRefs.current[fallbackIdx];
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
          return true;
        }
        return false;
      };
      [0, 100, 250, 400].forEach((delay) => setTimeout(tryScrollNextActive, delay));
      return;
    }

    // Default: if we have a selectedCategory, at least center it
    if (location.state && typeof location.state.selectedCategory === 'number') {
      const el = stepRefs.current[location.state.selectedCategory];
      if (el && typeof el.scrollIntoView === 'function') {
        const attempts = [0, 100, 250];
        attempts.forEach((delay) => {
          setTimeout(() => el.scrollIntoView({ behavior: 'auto', block: 'center' }), delay);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

    const count = cartItems.reduce(
      (acc, item) => acc + (item?.quantity || 0),
      0
    );

    const total = cartItems.reduce((acc, item) => {
      if (!item || typeof item !== "object") return acc;
      const quantity = item.quantity || 0;
      const price = getPrice(item) || 0;
      return acc + price * quantity;
    }, 0);

    setCartCount(count);
    setTotalPrice(total);
  }, []);





  const handleMenuItemClick = (index) => {
    // Only allow clicking unlocked categories
    if (!unlockedCategories.includes(index)) return;

    const selectedCategory = menuItems[index];
    if (!selectedCategory.products || selectedCategory.products.length === 0) {
      alert(`No products available for ${selectedCategory.name}.`);
      return;
    }

    // Build current selections by category key
    const getPart = (key) => {
      const i = menuItems.findIndex(mi => mi.category === key);
      return i >= 0 ? cart[i] : undefined;
    };
    const cpu = getPart('cpu');
    const mobo = getPart('motherboard');
    const ram = getPart('ram');
    const gpu = getPart('graphcard');
    const psu = getPart('power supply');
    const pcCase = getPart('case');

    // Start with all products and filter by compatibility based on already-selected parts
    let productsToSend = selectedCategory.products || [];
    switch (selectedCategory.category) {
      case 'cpu':
        if (mobo) {
          const s = getMoboSocket(mobo);
          if (s) productsToSend = productsToSend.filter(p => getCpuSocket(p) === s);
        }
        // If a cooler is already selected, ensure CPU candidates fit the cooler (socket + TDP)
        if (pcCase /* placeholder to keep ordering safe */ || true) {
          const cooler = getPart('cpu-cooler');
          if (cooler) {
            productsToSend = productsToSend.filter(p => {
              const socket = getCpuSocket(p);
              const isAMD = norm(p?.name).includes('AMD') || socket.startsWith('AM');
              return coolerSupportsSocket(cooler, socket, isAMD) && coolerMeetsCpuTdp(cooler, p);
            });
          }
        }
        break;
      case 'cpu-cooler':
        if (cpu) {
          const socket = getCpuSocket(cpu);
          const isAMD = norm(cpu?.name).includes('AMD') || socket.startsWith('AM');
          let filtered = (productsToSend || []).filter(p => coolerSupportsSocket(p, socket, isAMD)).filter(p => coolerMeetsCpuTdp(p, cpu));
          if (!filtered.length) {
            filtered = (productsToSend || []).filter(p => coolerSupportsSocket(p, socket, isAMD));
          }
          productsToSend = filtered;
        }
        break;
      case 'motherboard':
        if (cpu) {
          const s = getCpuSocket(cpu);
          if (s) productsToSend = productsToSend.filter(p => getMoboSocket(p) === s);
        }
        if (ram) {
          const rt = ramType(ram);
          if (rt) productsToSend = productsToSend.filter(p => (moboMemType(p) || '').includes(rt));
        }
        break;
      case 'ram':
        if (mobo) {
          const mt = moboMemType(mobo);
          if (mt) productsToSend = productsToSend.filter(p => (ramType(p) || '') === mt);
        }
        break;
      case 'power supply':
        if (gpu) {
          const need = recommendWattForGpu(gpu);
          productsToSend = productsToSend.filter(p => parsePsuWattage(p) >= need);
        }
        break;
      case 'graphcard':
        if (psu) {
          const have = parsePsuWattage(psu);
          productsToSend = productsToSend.filter(p => recommendWattForGpu(p) <= have);
        }
        break;
      case 'case':
        if (mobo) {
          const mf = getMoboFormFactor(mobo);
          productsToSend = productsToSend.filter(p => caseSupportsMobo(p, mf));
        }
        break;
      case 'storage':
        if (mobo) {
          const supportsNvme = moboSupportsNvme(mobo);
          const supportsSata = moboSupportsSata(mobo);
          const hasAnyInfo = !!(supportsNvme || supportsSata);
          productsToSend = productsToSend.filter(p => {
            const kind = detectStorageKind(p);
            if (!hasAnyInfo) return true; // if motherboard storage capability is unknown, do not filter
            if (kind === 'NVMe') return supportsNvme;
            if (kind === 'SATA') return supportsSata;
            return true;
          });
        }
        break;
      default:
        break;
    }

    if (!productsToSend.length) {
      if (selectedCategory.category === 'storage') {
        // For storage, silently fall back without alert
        productsToSend = selectedCategory.products || [];
      } else {
        alert('No compatible products found for the current selection. Showing all options.');
        productsToSend = selectedCategory.products || [];
      }
    }

    // Save scroll position to restore after returning
    try {
      sessionStorage.setItem('pc-customized-scroll', String(window.scrollY || window.pageYOffset || 0));
    } catch (e) { /* ignore */ }

    navigate("/customized-products", {
      state: {
        categoryName: selectedCategory.name,
        products: productsToSend,
        brands: selectedCategory.brands,
        categoryIndex: index,
      },
    });
  };

  const clearCart = () => {
    localStorage.removeItem("cart");  // Clear cart from localStorage
    setCart([]);                      // Reset cart state
    setCartCount(0);                  // Reset cart count
    setTotalPrice(0);                 // Reset total price
    setSelectedItem(0);               // Go back to CPU step
    setUnlockedCategories([0]);       // Only CPU unlocked
  };

  const handleStartOver = () => {
    clearCart();
    try {
      localStorage.removeItem("customOrders");
    } catch (e) {
      // ignore storage errors
    }
    navigate("/app");
  };

  const itemsToShow = menuItems.filter(mi => mi.category !== 'monitor' && mi.category !== 'peripherals');

  return (
    <div className="pc-customizer-container">
      {/* Header */}
      <div className="pc-customizer-header">
        <img src={Customized} alt="Logo" className="pc-customizer-logo" />
        <div className="pc-customizer-title-container">
          <h1 className="pc-customizer-title">PC CUSTOMIZER</h1>
          <p className="pc-customizer-subtitle">Create your own PC</p>
        </div>
      </div>

      {/* Steps */}
      <div className="pc-customizer-steps">
        {itemsToShow.map((item) => {
          const index = menuItems.findIndex(mi => mi.category === item.category);
          let stepClass = "pc-customizer-step ";

          // If this step has a product selected, always show as selected (big/active look)
          if (cart[index]) {
            stepClass += "selected-step unlocked-step ";
          }
          // If this is the next step after the last selected product, make it active and unlocked
          else if (
            // Find the last filled index in cart
            cart.findLastIndex(item => item) + 1 === index
          ) {
            stepClass += "active-step unlocked-step ";
          }
          // All others are inactive and locked
          else {
            stepClass += "inactive-step locked-step ";
          }

          return (
            <div key={index} className="pc-customizer-step-container" ref={el => stepRefs.current[index] = el}>
              <p className="step-subtitle">Step {index + 1}: Choose a {item.name.toLowerCase()}</p>
              <div
                className={stepClass}
                onClick={() => handleMenuItemClick(index)}
              >
                <div className="step-icon">
                  <img
                    src={cart[index]?.image || item.image}
                    alt={item.name}
                  />
                </div>
                <div className="step-details">
                  <p className="step-title">
                    {cart[index]?.name || item.name}
                  </p>
                  <p className="step-price">
                    {cart[index]?.price ? `${cart[index].price}` : ""}
                  </p>
                </div>
                <div
                  className={`step-add-minus-icon${cart[index] ? " minus-active" : ""}`}
                  onClick={e => {
                    e.stopPropagation();
                    if (cart[index]) {
                      // Remove product from this step
                      const newCart = [...cart];
                      newCart[index] = undefined;
                      setCart(newCart);
                      localStorage.setItem("cart", JSON.stringify(newCart));
                      setCartCount(newCart.filter(Boolean).reduce((acc, item) => acc + (item?.quantity || 0), 0));
                      setTotalPrice(newCart.filter(Boolean).reduce((acc, item) => acc + (getPrice(item) * (item?.quantity || 1)), 0));
                    }
                  }}
                >
                  {cart[index] ? (
                    <FontAwesomeIcon icon={faMinus} className="step-minus-icon" />
                  ) : (
                    <FontAwesomeIcon icon={faPlus} className="step-add-icon" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pc-customized-bottom-section">
        <div className="pc-customized-process-container">

          {/* Left: Cart icon, TOTAL, and price */}
          <div className="pc-customized-order-info">
            <div className="pc-customized-cart-icon" data-count="0">
              <img src={Chest} alt="Cart Icon" />
              <span className="pc-customized-notification">{cartCount}</span>
            </div>
            <div className="pc-customized-total-label">
              <span className="pc-customized-total">TOTAL</span>
              <span className="pc-customized-price">
                ₱{totalPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>

          {/* Right: Order Summary and action buttons */}
          <div className="pc-customized-right-buttons">
            <button
              className="pc-customized-order-summary"
              onClick={() => navigate("/ordersum-custom", { state: { from: "pc-customized", selectedCategory: selectedItem } })}
            >
              Order Summary
            </button>

            <div className="pc-customized-action-buttons">
              <button className="pc-customized-cancel-order" onClick={() => setShowCancelOrderModal(true)}> Cancel Order </button>
              <button className="pc-customized-start-over" onClick={() => setShowStartOverModal(true)}>Start Over</button>
            </div>
          </div>
        </div>
      </div>

      {showCancelOrderModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
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
                  clearCart();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartOverModal && (
        <div className="pc-customized-modal-overlay">
          <div className="pc-customized-modal-background"></div>
          <div className="pc-customized-modal">
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

export default PCCustomized;
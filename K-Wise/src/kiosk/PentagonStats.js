import React, { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import "./PentagonStats.css";

const PentagonStats = ({ cartItems = [] }) => {
  const [stats, setStats] = useState({
    CPU: 1,
    GPU: 1,
    Power: 1,
    Storage: 1,
    RAM: 1,
  });

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return; // Prevent unnecessary updates

    setStats((prevStats) => {
      const newStats = { ...prevStats };

      cartItems.forEach((item) => {
        if (item.category === "CPU") newStats.CPU = Math.min(newStats.CPU + item.value, 10);
        if (item.category === "GPU") newStats.GPU = Math.min(newStats.GPU + item.value, 10);
        if (item.category === "Power Supply") newStats.Power = Math.min(newStats.Power + item.value, 10);
        if (item.category === "Storage") newStats.Storage = Math.min(newStats.Storage + item.value, 10);
        if (item.category === "RAM") newStats.RAM = Math.min(newStats.RAM + item.value, 10);
      });

      return newStats;
    });
  }, [cartItems]); // Depend only on `cartItems`

  const data = [
    { category: "CPU", value: stats.CPU },
    { category: "GPU", value: stats.GPU },
    { category: "Power", value: stats.Power },
    { category: "Storage", value: stats.Storage },
    { category: "RAM", value: stats.RAM },
  ];

  return (
    <div className="pentagon-stats-container">
      <RadarChart cx={200} cy={200} outerRadius={150} width={400} height={400} data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" />
        <PolarRadiusAxis angle={30} domain={[0, 10]} />
        <Radar name="Stats" dataKey="value" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
      </RadarChart>
    </div>
  );
};

export default PentagonStats;

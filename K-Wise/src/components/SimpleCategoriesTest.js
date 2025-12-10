/**
 * QUICK FIX: Simple Categories Test Component
 * This will help us verify if the basic API connection works
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Vector from "../assets/Vector (3).webp";
import CPU1 from "../assets/CPU1.webp";
import GPU1 from "../assets/GPU1.webp";
import Motherboard1 from "../assets/Motherboard1.webp";
import Ram from "../assets/Ram.webp";
import Storage1 from "../assets/Storage1.webp";

const SimpleCategoriesTest = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔄 Fetching categories...');
        const response = await axios.get('http://localhost:5000/api/kiosk/categories');
        console.log('📦 Response:', response.data);

        if (response.data.success) {
          const apiCategories = response.data.data;
          
          // Add home + transform categories
          const homeCategory = { name: "Home", category: "home", image: Vector, productCount: 0 };
          const transformedCategories = apiCategories.map(cat => ({
            name: cat.name,
            category: cat.category.toLowerCase(),
            image: getImageForCategory(cat.category.toLowerCase()),
            productCount: cat.productCount
          }));
          
          const allCategories = [homeCategory, ...transformedCategories];
          setCategories(allCategories);
          console.log('✅ Categories set:', allCategories.length);
        } else {
          throw new Error(response.data.message || 'API returned unsuccessful');
        }
      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        setError(err.message);
        // Fallback categories
        setCategories([
          { name: "Home", category: "home", image: Vector, productCount: 0 },
          { name: "Error - Click to retry", category: "error", image: CPU1, productCount: 0 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getImageForCategory = (category) => {
    const imageMap = {
      cpu: CPU1,
      gpu: GPU1,
      motherboard: Motherboard1,
      ram: Ram,
      memory: Ram,
      storage: Storage1,
    };
    return imageMap[category] || CPU1;
  };

  if (loading) return <div style={{ padding: '20px', color: 'white' }}>Loading categories...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', background: '#001a14', minHeight: '100vh' }}>
      <h2 style={{ color: 'white' }}>Categories Test ({categories.length} categories)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {categories.map((cat, index) => (
          <div
            key={index}
            style={{
              background: '#03644d',
              color: 'white',
              padding: '10px',
              borderRadius: '5px',
              minWidth: '150px',
              textAlign: 'center'
            }}
          >
            <img
              src={cat.image}
              alt={cat.name}
              style={{ width: '40px', height: '40px', marginBottom: '5px' }}
            />
            <div>{cat.name}</div>
            <div style={{ fontSize: '12px' }}>({cat.productCount} items)</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleCategoriesTest;
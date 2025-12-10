/**
 * TASK 12: KIOSK IDLE SCREENSAVER
 * Displays K-Wise branding and featured products after 2 minutes of inactivity
 */

import React, { useState, useEffect } from 'react';
import './KioskScreensaver.css';

const KioskScreensaver = ({ isActive, onWake, featuredProducts = [] }) => {
    const [currentProductIndex, setCurrentProductIndex] = useState(0);

    useEffect(() => {
        if (!isActive || featuredProducts.length === 0) return;

        const interval = setInterval(() => {
            setCurrentProductIndex((prev) => (prev + 1) % featuredProducts.length);
        }, 5000); // Change product every 5 seconds

        return () => clearInterval(interval);
    }, [isActive, featuredProducts.length]);

    if (!isActive) return null;

    const currentProduct = featuredProducts[currentProductIndex];

    return (
        <div className="kiosk-screensaver" onClick={onWake}>
            <div className="screensaver-content">
                <div className="brand-section">
                    <h1 className="brand-logo">K-WISE</h1>
                    <p className="brand-tagline">Your Trusted PC Partner</p>
                </div>

                {currentProduct && (
                    <div className="featured-product fade-in">
                        <h3 className="featured-label">Featured Product</h3>
                        <div className="product-showcase">
                            {currentProduct.image_url && (
                                <img 
                                    src={currentProduct.image_url} 
                                    alt={currentProduct.name}
                                    className="product-image"
                                />
                            )}
                            <div className="product-info">
                                <h2 className="product-name">{currentProduct.name}</h2>
                                <p className="product-category">{currentProduct.category}</p>
                                <p className="product-price">₱{currentProduct.price?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="wake-instruction">
                    <p>👆 Touch screen to continue</p>
                </div>
            </div>
        </div>
    );
};

export default KioskScreensaver;

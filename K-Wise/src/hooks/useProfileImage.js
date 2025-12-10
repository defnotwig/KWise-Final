import React, { useState } from 'react';
import { getFullImageUrl } from '../utils/networkConfig';

export const ProfileImage = ({ 
    userInfo, 
    className = '', 
    fallbackContent = null, 
    onLoad = () => {}, 
    onError = () => {} 
}) => {
    const [hasError, setHasError] = useState(false);

    const getProfileImageUrl = () => {
        const imagePath = userInfo?.profile_image || userInfo?.profileImage;
        if (!imagePath) return null;
        
        // Handle different image path formats using network config
        if (imagePath.startsWith('http')) {
            return getFullImageUrl(imagePath);
        }
        
        // For local images, construct the URL with network-aware base URL
        return getFullImageUrl(`/uploads/${imagePath.replace(/^\/+/, '')}`);
    };

    const imageUrl = getProfileImageUrl();

    // If no image URL or error occurred, show fallback
    if (!imageUrl || hasError) {
        return fallbackContent || (
            <div className={`profile-fallback ${className}`}>
                {(userInfo?.displayName || userInfo?.display_name || userInfo?.name || 'A').charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt="Profile"
            className={className}
            onLoad={onLoad}
            onError={(e) => {
                console.log('ProfileImage load error:', e.target.src);
                setHasError(true); // Use React state instead of DOM manipulation
                onError(e);
            }}
            crossOrigin="anonymous"
            style={{
                objectFit: 'cover',
                borderRadius: '50%'
            }}
        />
    );
};

export default ProfileImage;

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiX, FiUser, FiCamera, FiSave } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getServerBaseUrl } from '../../utils/networkConfig';
import './UserProfile.css';

const UserProfile = ({ isOpen, onClose }) => {
    const { currentUser, updateCurrentUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        birthDate: '',
        imageFile: null
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (currentUser && isOpen) {
            // Format birth date for HTML date input (YYYY-MM-DD)
            const formatBirthDate = (dateValue) => {
                if (!dateValue) return '';
                const date = new Date(dateValue);
                if (Number.isNaN(date.getTime())) return '';
                
                // Get local date components to avoid timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            setFormData({
                name: currentUser.name || '',
                displayName: currentUser.displayName || currentUser.display_name || currentUser.name || '',
                birthDate: formatBirthDate(currentUser.birthDate || currentUser.birth_date),
                imageFile: null
            });
            
            // Set existing profile image if available
            if (currentUser.profileImage || currentUser.profile_image) {
                const imagePath = currentUser.profileImage || currentUser.profile_image;
                setImagePreview(`${getServerBaseUrl()}/uploads/${imagePath}`);
            } else {
                // Clear preview if no image
                setImagePreview('');
            }
        }
    }, [currentUser, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file (JPG, PNG, WebP)');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB');
                return;
            }

            setFormData(prev => ({
                ...prev,
                imageFile: file
            }));

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
            
            // Clear any previous errors
            setError('');
        }
    };

    const updateBirthDate = (target, serverData) => {
        const birthDate = serverData.birth_date || serverData.birthDate;
        if (birthDate) {
            target.birthDate = birthDate;
            target.birth_date = birthDate;
        } else if (currentUser.role === 'superadmin' && formData.birthDate) {
            target.birthDate = formData.birthDate;
            target.birth_date = formData.birthDate;
        }
    };

    const applyProfileUpdate = (data) => {
        setSuccess('Profile updated successfully!');
        
        // Update context with new data
        if (updateCurrentUser) {
            const updatedUser = {
                ...currentUser,
                name: formData.name,
                displayName: formData.displayName,
                display_name: formData.displayName,
                profileImage: data.data.profileImage || data.data.profile_image,
                profile_image: data.data.profileImage || data.data.profile_image
            };
            
            updateBirthDate(updatedUser, data.data);
            updateCurrentUser(updatedUser);
        }

        // Update image preview with full URL if image exists
        if (data.data.profileImage) {
            setImagePreview(`${getServerBaseUrl()}/uploads/${data.data.profileImage}`);
        }

        // Close modal after success message (no page reload needed)
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const formPayload = new FormData();
            formPayload.append('name', formData.name);
            formPayload.append('displayName', formData.displayName);
            
            // Only allow superadmin to edit birth date
            if (currentUser.role === 'superadmin') {
                formPayload.append('birthDate', formData.birthDate);
            }
            
            if (formData.imageFile) {
                formPayload.append('profileImage', formData.imageFile);
            }

            const response = await fetch(`${getServerBaseUrl()}/api/users/${currentUser.id}/profile`, {
                method: 'PUT',
                credentials: "include",
                body: formPayload
            });

            const data = await response.json();

            if (data.success) {
                applyProfileUpdate(data);
            } else {
                setError(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setError('An error occurred while updating profile');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="user-profile-modal-overlay">
            <div className="user-profile-modal">
                <div className="user-profile-header">
                    <h2>Edit Profile</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="user-profile-form">
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* Profile Image Section */}
                    <div className="profile-image-section">
                        <div className="profile-image-container">
                            {imagePreview ? (
                                <img 
                                    src={imagePreview} 
                                    alt="Profile Preview" 
                                    className="profile-image-preview"
                                />
                            ) : (
                                <div className="profile-image-placeholder">
                                    <FiUser size={40} />
                                </div>
                            )}
                        </div>
                        
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                            id="profileImageInput"
                        />
                        <label htmlFor="profileImageInput" className="upload-btn">
                            <FiCamera /> Choose Image
                        </label>
                        <p className="upload-hint">At least 256 x 256px PNG or JPG file.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="profile-form">
                        {/* Full Name */}
                        <div className="form-group">
                            <label htmlFor="name">Full name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Ludwig Rivera"
                            />
                        </div>

                        {/* Display Name */}
                        <div className="form-group">
                            <label htmlFor="displayName">Display name</label>
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                required
                                placeholder="Emily"
                            />
                        </div>

                        {/* Birth Date - Only for superadmin */}
                        {currentUser?.role === 'superadmin' && (
                            <div className="form-group">
                                <label htmlFor="birthDate">Birth Date</label>
                                <input
                                    type="date"
                                    id="birthDate"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleInputChange}
                                />
                                <p className="field-hint"></p>
                            </div>
                        )}

                        <div className="form-actions">
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={isLoading}
                            >
                                <FiSave /> {isLoading ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

UserProfile.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default UserProfile;

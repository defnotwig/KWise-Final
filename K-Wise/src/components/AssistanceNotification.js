import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AssistanceNotification.css';

const AssistanceNotification = ({ io }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentRequest, setCurrentRequest] = useState(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClickPrompt, setShowClickPrompt] = useState(false);

  // Define stopNotificationSound early so it can be used in handleAcknowledge
  const stopNotificationSound = useCallback(() => {
    if (!audioRef.current) return;
    
    console.log('🛑 Stopping notification sound...');
    console.log('Was playing:', isPlaying);
    console.log('Was looping:', audioRef.current.loop);
    
    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
      setIsPlaying(false);
      console.log('✅ Notification sound stopped');
    } catch (error) {
      console.error('❌ Error stopping sound:', error);
    }
  }, [isPlaying]);

  // Memoize handleAcknowledge to avoid ESLint warning
  const handleAcknowledge = useCallback(async () => {
    if (!currentRequest) return;

    // If sound never played, try to start it with user interaction before acknowledging
    if (!isPlaying && audioRef.current && showClickPrompt) {
      console.log('🎯 Confirm clicked - attempting to play sound with user interaction before acknowledging');
      audioRef.current.loop = true;
      audioRef.current.volume = 1.0;
      
      try {
        await audioRef.current.play();
        console.log('✅ Audio started playing from Confirm button');
        setIsPlaying(true);
        setShowClickPrompt(false);
        // Let it play briefly before stopping
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('❌ Failed to play on Confirm:', err);
        // Continue with acknowledgment even if audio fails
      }
    }

    try {
      // Get admin info from localStorage (correct key is 'currentUser')
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) {
        console.error('❌ No user found in localStorage');
        alert('User session not found. Please log in again.');
        return;
      }
      
      const user = JSON.parse(userStr);
      console.log('👤 Acknowledging as:', user.name, '(ID:', user.id, ')');
      
      const response = await fetch(`http://localhost:5000/api/assistance/${currentRequest.id}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: user.id,
          admin_name: user.name || user.username || 'Admin'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Assistance acknowledged:', result);
      
      // Stop the notification sound
      stopNotificationSound();
      
      // Clear current request and move to next
      setCurrentRequest(null);
      setPendingRequests(prev => prev.filter(req => req.id !== currentRequest.id));
      
    } catch (error) {
      console.error('❌ Error acknowledging assistance:', error);
      alert('Failed to acknowledge assistance. Please try again.');
    }
  }, [currentRequest, stopNotificationSound, isPlaying, showClickPrompt]); // Added dependencies

  useEffect(() => {
    if (!io) return;

    // Listen for incoming assistance requests
    io.on('assistance:request', (request) => {
      console.log('🔔 Assistance request received:', request);
      
      // Add to pending requests
      setPendingRequests(prev => [...prev, request]);
      
      // Show notification immediately for first request
      // Don't call playNotificationSound here - audio element not rendered yet
      if (!currentRequest) {
        setCurrentRequest(request);
      }
    });

    // Listen for acknowledged requests (cleanup)
    io.on('assistance:acknowledged', (data) => {
      console.log('✅ Assistance acknowledged:', data);
      setPendingRequests(prev => prev.filter(req => req.id !== data.id));
      if (currentRequest?.id === data.id) {
        handleAcknowledge();
      }
    });

    return () => {
      io.off('assistance:request');
      io.off('assistance:acknowledged');
    };
  }, [io, currentRequest, handleAcknowledge]); // Added handleAcknowledge

  // Auto-advance to next pending request when current is dismissed
  useEffect(() => {
    if (!currentRequest && pendingRequests.length > 0) {
      const nextRequest = pendingRequests[0];
      setCurrentRequest(nextRequest);
      // Don't call playNotificationSound here - will be handled by the audio play effect below
    }
  }, [currentRequest, pendingRequests]);

  useEffect(() => {
    if (currentRequest && audioRef.current && !isPlaying) {
      console.log('🔄 Modal rendered with audio element - attempting playback...');
      // Small delay to ensure DOM is fully updated
      const playTimer = setTimeout(() => {
        playNotificationSound();
      }, 100);
      
      return () => clearTimeout(playTimer);
    }
  }, [currentRequest, isPlaying]);

  const playNotificationSound = () => {
    if (!audioRef.current) {
      console.error('❌ Audio element ref not available');
      return;
    }

    console.log('🔊 Attempting to play notification sound...');
    
    try {
      // Stop any currently playing audio first
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Enable looping BEFORE playing
      audioRef.current.loop = true;
      audioRef.current.volume = 1.0; // Ensure volume is at maximum
      
      // WORKAROUND: Try muted autoplay first (browsers allow this)
      // Then show prompt to unmute
      console.log('🔇 Attempting muted autoplay first...');
      audioRef.current.muted = true;
      
      const mutedPlayPromise = audioRef.current.play();
      
      if (mutedPlayPromise !== undefined) {
        mutedPlayPromise
          .then(() => {
            console.log('✅ Muted autoplay successful - now attempting to unmute...');
            // Try to unmute immediately
            audioRef.current.muted = false;
            console.log('✅ Notification sound playing in LOOP mode');
            console.log('🔁 Loop enabled:', audioRef.current.loop);
            console.log('🔊 Volume:', audioRef.current.volume);
            console.log('🔇 Muted:', audioRef.current.muted);
            console.log('⏱️ Duration:', audioRef.current.duration);
            setIsPlaying(true);
            setShowClickPrompt(false); // Hide prompt since it's playing
          })
          .catch(err => {
            console.error('❌ Muted autoplay failed, trying unmuted:', err);
            // If muted autoplay fails, try unmuted
            audioRef.current.muted = false;
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('✅ Notification sound playing in LOOP mode');
                  console.log('🔁 Loop enabled:', audioRef.current.loop);
                  console.log('🔊 Volume:', audioRef.current.volume);
                  console.log('⏱️ Duration:', audioRef.current.duration);
                  setIsPlaying(true);
                })
                .catch(finalErr => {
                  console.error('❌ Error playing notification sound:', finalErr);
                  console.error('Error name:', finalErr.name);
                  console.error('Error message:', finalErr.message);
                  
                  // Handle specific error types
                  if (finalErr.name === 'NotAllowedError') {
                    console.warn('⚠️ Audio autoplay blocked by browser - user interaction required');
                    console.log('💡 Showing click prompt to user');
                    setShowClickPrompt(true);
                    // Don't retry automatically - wait for user click
                  } else if (finalErr.name === 'NotSupportedError') {
                    console.error('❌ Audio format not supported by browser');
                  } else if (finalErr.name === 'AbortError') {
                    console.warn('⚠️ Audio playback aborted - retrying...');
                    // Retry after a short delay
                    setTimeout(() => {
                      audioRef.current.play().catch(e => console.error('❌ Retry failed:', e));
                    }, 100);
                  }
                });
            }
          });
      }
    } catch (error) {
      console.error('❌ Exception in playNotificationSound:', error);
    }
  };

  const handleDismiss = () => {
    // If sound never played, try to start it with user interaction before dismissing
    if (!isPlaying && audioRef.current && showClickPrompt) {
      console.log('🎯 Dismiss clicked - attempting to play sound with user interaction');
      audioRef.current.loop = true;
      audioRef.current.volume = 1.0;
      audioRef.current.play()
        .then(() => {
          console.log('✅ Audio started playing from Dismiss button');
          setIsPlaying(true);
          setShowClickPrompt(false);
          // Let it play briefly before stopping
          setTimeout(() => {
            stopNotificationSound();
            setCurrentRequest(null);
            if (currentRequest) {
              setPendingRequests(prev => prev.filter(req => req.id !== currentRequest.id));
            }
          }, 500);
        })
        .catch(err => {
          console.error('❌ Failed to play on Dismiss:', err);
          // Still dismiss even if audio fails
          stopNotificationSound();
          setCurrentRequest(null);
          if (currentRequest) {
            setPendingRequests(prev => prev.filter(req => req.id !== currentRequest.id));
          }
        });
    } else {
      stopNotificationSound();
      setCurrentRequest(null);
      // Remove from pending list
      if (currentRequest) {
        setPendingRequests(prev => prev.filter(req => req.id !== currentRequest.id));
      }
    }
  };

  // Fallback: If audio isn't playing and user clicks modal, try to play
  const handleModalClick = () => {
    if (!isPlaying && currentRequest && audioRef.current) {
      console.log('🖱️ User clicked modal - attempting to play audio with user interaction');
      setShowClickPrompt(false); // Hide prompt after user clicks
      
      // Try to play audio with user interaction
      audioRef.current.loop = true;
      audioRef.current.volume = 1.0;
      audioRef.current.play()
        .then(() => {
          console.log('✅ Audio started playing after user interaction');
          console.log('🔁 Loop enabled:', audioRef.current.loop);
          console.log('🔊 Volume:', audioRef.current.volume);
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('❌ Still failed to play after user click:', err);
          console.error('Error name:', err.name);
          console.error('Error message:', err.message);
          // Show alert only if it's still blocked
          if (err.name === 'NotAllowedError') {
            alert('❌ Audio is blocked by your browser. Please check your browser audio settings and ensure autoplay is allowed for this site.');
          }
        });
    }
  };

  return (
    <>
      {/* Hidden audio element - Always rendered so ref is available */}
      <audio
        ref={audioRef}
        src="/sounds/bellding-254774.mp3"
        preload="auto"
        playsInline
        muted={false}
        onError={(e) => {
          console.error('❌ Audio file failed to load:', e);
          console.error('Audio error code:', audioRef.current?.error?.code);
          console.error('Audio error message:', audioRef.current?.error?.message);
          console.error('Audio src:', audioRef.current?.src);
          console.error('Audio readyState:', audioRef.current?.readyState);
        }}
        onCanPlay={() => {
          console.log('✅ Audio file ready to play');
          console.log('Audio src:', audioRef.current?.src);
          console.log('Audio duration:', audioRef.current?.duration);
          console.log('Audio readyState:', audioRef.current?.readyState);
        }}
        onPlay={() => console.log('▶️ Audio started playing')}
        onPause={() => console.log('⏸️ Audio paused')}
        onEnded={() => console.log('⏹️ Audio ended (should loop)')}
        onLoadedMetadata={() => console.log('📊 Audio metadata loaded')}
      />

      {/* Notification Modal - Only shown when there's a request */}
      {currentRequest && (
      <div className="assistance-notification-overlay">
        <div className="assistance-notification-modal" onClick={handleModalClick}>
          <div className="assistance-notification-header">
            <div className="assistance-icon-pulse">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
              </svg>
            </div>
            <h2>Assistance Request</h2>
            {isPlaying && (
              <div style={{
                fontSize: '14px',
                color: '#fff',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite'
                }}></span>
                <span>Alert Sound Playing</span>
              </div>
            )}
            {!isPlaying && showClickPrompt && (
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffeb3b',
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                padding: '12px 20px',
                borderRadius: '8px',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '2px solid #ffeb3b',
                animation: 'pulse 1s infinite'
              }}>
                <span style={{ fontSize: '24px' }}>🔔</span>
                <span>CLICK ANYWHERE ON THIS MODAL TO ENABLE ALERT SOUND</span>
                <span style={{ fontSize: '24px' }}>🔔</span>
              </div>
            )}
          </div>

          <div className="assistance-notification-body">
            <p className="assistance-message">
              <strong>Kiosk {currentRequest.kiosk_id}</strong> is requesting assistance!
            </p>
            <p className="assistance-details">
              Request Type: <span className="assistance-type">{currentRequest.request_type || 'Assisted Service'}</span>
            </p>
            <p className="assistance-time">
              {new Date(currentRequest.requested_at).toLocaleTimeString()}
            </p>
            
            {pendingRequests.length > 1 && (
              <p className="assistance-queue">
                +{pendingRequests.length - 1} more request{pendingRequests.length > 2 ? 's' : ''} waiting
              </p>
            )}
          </div>

          <div className="assistance-notification-footer">
            <button 
              className="assistance-btn assistance-btn-dismiss"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
            <button 
              className="assistance-btn assistance-btn-confirm"
              onClick={handleAcknowledge}
            >
              ✓ Confirm - I'm On My Way
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default AssistanceNotification;

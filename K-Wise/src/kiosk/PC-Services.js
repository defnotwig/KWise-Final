import React from "react";
import { useNavigate } from "react-router-dom";
import "./PC-Services.css"; // Create a new CSS file for services
import PC_Services from "../assets/PCServices.webp";
// Import your service icons
import CheckUp from "../assets/CheckUp.webp";
import PCUpgrade from "../assets/PCUpgrade.webp";
import PCCleaning from "../assets/PCCleaning.webp";

function PCServices() {
  const navigate = useNavigate();

  return (
    <div className="services-container">
      <div className="services-header">
        <img src={PC_Services} alt="PC Services" className="services-image" />
        <div className="services-title">
          <h1 className="services-name">PC SERVICES</h1>
          <p className="select-text">Select a service</p>
        </div>
      </div>

      
        <div className="services-grid">
          <div className="service-row">
            {/* PC Check Up Service */}
            <div className="service-card" onClick={() => navigate("/pc-checkup")}>
              <img className="check-up" src={CheckUp} alt="PC Check Up" />
              <h3>PC CHECK UP</h3>
              <p>PREVENT THE CRASH</p>
            </div>

            {/* PC Upgrade Service */}
            <div className="service-card" onClick={() => navigate("/pc-upgrade")}>
              <img className="pc-upgrade" src={PCUpgrade} alt="PC Upgrade" />
              <h3>PC UPGRADE</h3>
              <p>PERFORM FASTER</p>
            </div>
            </div>
          

          {/* PC Cleaning Service */}
          <div className="service-card wide" onClick={() => navigate("/pc-cleaning-assessment")}>
            <div className="service-content">
              <img className="pc-cleaning" src={PCCleaning} alt="PC Cleaning" />
              <div className="text-content">
                <h3>PC CLEANING</h3>
                <p>DUST OFF THE LAG</p>
              </div>
            </div>
        </div>
      </div>
      <div className="services-bottom-section">
        <button onClick={() => navigate("/transaction")} className="back-button-services">Back</button>
      </div>
    </div>
  );
}

export default PCServices;

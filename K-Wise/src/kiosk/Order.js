import { useNavigate } from "react-router-dom";
import "./Order.css";
import Group6 from '../assets/Group 6.webp'; // Assisted Service Icon
import Group7 from '../assets/Group 7.webp'; // Self-Order Icon

function Order() {
  const navigate = useNavigate();

  //Function for selecting if you want to be assisted or a self-service
  const handleSelectService = (serviceType) => {
    if (serviceType === "assisted") {
      navigate("/assisted-service");  // ✅ Correctly navigate to AssistedService.js
    } else {
      navigate("/transaction", { state: { serviceType } });
    }
  };

  return (
    <div className="order-container">
      {/* Left Side - Assisted Service */}
      <div className="order-option assisted" onClick={() => handleSelectService("assisted")}>
        <img src={Group6} alt="Assisted Service" />
        <p>ASSISTED SERVICE</p>
      </div>

      {/* Right Side - Self-Order */}
      <div className="order-option self-order" onClick={() => handleSelectService("self-order")}>
        <img src={Group7} alt="Self-Order" />
        <p>SELF-ORDER</p>
      </div>
    </div>
  );
}

export default Order;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Transac-components.css";
import Components from "../assets/Components.webp";
import BuildPC from "../assets/BuildPC.webp";
import PCServices from "../assets/PCServices.webp";

function Transaction() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handleStart = () => {
    localStorage.setItem("orderOrigin", currentBox.title); // "COMPONENTS", "BUILD YOUR PC", "PC SERVICES"
    navigate(currentBox.link);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };


  const boxData = [
    {
      image: Components,
      title: "COMPONENTS",
      subtext: "Browse and purchase individual PC parts",
      link: "/pc-parts",
      width: "800px",
      height: "600px",
    },
    {
      image: BuildPC,
      title: "BUILD AND CUSTOMIZE",
      subtext: "Create your dream PC with customizable build options",
      link: "/pcbuild-category",
      width: "800px",
      height: "700px",
    },
    {
      image: PCServices,
      title: "PC SERVICES",
      subtext: "Expert help for upgrades, diagnostics, repairs, and cleaning",
      link: "/pc-services",
      width: "800px",
      height: "800px",
    },
  ];

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + boxData.length) % boxData.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % boxData.length);
  };

  const currentBox = boxData[currentIndex];

  return (
    <div 
      className="background"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <h2 className="main-title">{currentBox.title}</h2>

      <div className="carousel">
        <button className="arrow left" onClick={handlePrev}>
          &#9664;
        </button>
        <div className="main-box">
          <img src={currentBox.image} alt="Selected" className="component" style={{ width: currentBox.width, height: currentBox.height }} />
        </div>
        <button className="arrow right" onClick={handleNext}>
          &#9654;
        </button>
      </div>

      <div className="navigation">
        <button className="start-btn" onClick={handleStart}>
          GET STARTED
        </button>
        <p className="subtext">{currentBox.subtext}</p>
      </div>
    </div>
  );
}

export default Transaction;

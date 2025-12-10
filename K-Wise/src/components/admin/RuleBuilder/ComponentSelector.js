import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiPackage } from 'react-icons/fi';

/**
 * ComponentSelector - Drag-and-drop component picker
 * Allows users to select PC components for compatibility rules
 */
const ComponentSelector = ({ selectedComponents, onComponentSelect }) => {
  const [availableComponents, setAvailableComponents] = useState([]);
  const [searchTerm1, setSearchTerm1] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState(null);

  const categories = [
    'all', 'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 
    'PSU', 'Case', 'Cooling', 'Peripherals'
  ];

  const loadComponents = async () => {
    setLoading(true);
    try {
      const url = categoryFilter === 'all'
        ? 'http://localhost:5000/api/stock'
        : `http://localhost:5000/api/stock?category=${categoryFilter}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAvailableComponents(data.data || []);
      }
    } catch (error) {
      console.error('Error loading components:', error);
      setAvailableComponents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load available components
  useEffect(() => {
    loadComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // Filter components for slot 1
  const filteredComponents1 = availableComponents.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm1.toLowerCase()) ||
    comp.model?.toLowerCase().includes(searchTerm1.toLowerCase())
  );

  // Filter components for slot 2
  const filteredComponents2 = availableComponents.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm2.toLowerCase()) ||
    comp.model?.toLowerCase().includes(searchTerm2.toLowerCase())
  );

  // Drag handlers
  const handleDragStart = (e, component) => {
    setDraggedComponent(component);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e, slot) => {
    e.preventDefault();
    if (draggedComponent) {
      onComponentSelect(slot, draggedComponent);
      setDraggedComponent(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedComponent(null);
  };

  const handleRemoveComponent = (slot) => {
    onComponentSelect(slot, null);
    if (slot === 'component1') setSearchTerm1('');
    if (slot === 'component2') setSearchTerm2('');
  };

  const handleComponentClick = (component, slot) => {
    onComponentSelect(slot, component);
  };

  return (
    <div className="component-selector">
      <h2>Select Components</h2>
      <p className="section-description">
        Select two components to create a compatibility rule. Drag and drop or click to select.
      </p>

      {/* Category Filter */}
      <div className="category-filter">
        <label>Filter by Category:</label>
        <div className="category-buttons">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="component-selection-grid">
        {/* Component 1 Slot */}
        <div className="component-slot">
          <h3>Component 1</h3>
          
          {selectedComponents.component1 ? (
            <div className="selected-component">
              <div className="component-card">
                <div className="component-icon">
                  <FiPackage size={32} />
                </div>
                <div className="component-details">
                  <h4>{selectedComponents.component1.name}</h4>
                  <p className="component-category">{selectedComponents.component1.category}</p>
                  <p className="component-model">{selectedComponents.component1.model}</p>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveComponent('component1')}
                  title="Remove component"
                >
                  <FiX />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="drop-zone"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'component1')}
            >
              <FiPackage size={48} />
              <p>Drag component here or search below</p>
            </div>
          )}

          {/* Search for Component 1 */}
          {!selectedComponents.component1 && (
            <div className="component-search">
              <div className="search-input">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchTerm1}
                  onChange={(e) => setSearchTerm1(e.target.value)}
                />
              </div>
              <div className="component-list">
                {loading ? (
                  <div className="loading-spinner">Loading...</div>
                ) : filteredComponents1.length > 0 ? (
                  filteredComponents1.slice(0, 10).map(component => (
                    <div
                      key={component.id}
                      className="component-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, component)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleComponentClick(component, 'component1')}
                    >
                      <FiPackage />
                      <div className="component-info">
                        <span className="component-name">{component.name}</span>
                        <span className="component-meta">
                          {component.category} {component.model && `| ${component.model}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    {searchTerm1 ? 'No components found' : 'Type to search components'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Component 2 Slot */}
        <div className="component-slot">
          <h3>Component 2</h3>
          
          {selectedComponents.component2 ? (
            <div className="selected-component">
              <div className="component-card">
                <div className="component-icon">
                  <FiPackage size={32} />
                </div>
                <div className="component-details">
                  <h4>{selectedComponents.component2.name}</h4>
                  <p className="component-category">{selectedComponents.component2.category}</p>
                  <p className="component-model">{selectedComponents.component2.model}</p>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveComponent('component2')}
                  title="Remove component"
                >
                  <FiX />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="drop-zone"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'component2')}
            >
              <FiPackage size={48} />
              <p>Drag component here or search below</p>
            </div>
          )}

          {/* Search for Component 2 */}
          {!selectedComponents.component2 && (
            <div className="component-search">
              <div className="search-input">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchTerm2}
                  onChange={(e) => setSearchTerm2(e.target.value)}
                />
              </div>
              <div className="component-list">
                {loading ? (
                  <div className="loading-spinner">Loading...</div>
                ) : filteredComponents2.length > 0 ? (
                  filteredComponents2.slice(0, 10).map(component => (
                    <div
                      key={component.id}
                      className="component-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, component)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleComponentClick(component, 'component2')}
                    >
                      <FiPackage />
                      <div className="component-info">
                        <span className="component-name">{component.name}</span>
                        <span className="component-meta">
                          {component.category} {component.model && `| ${component.model}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    {searchTerm2 ? 'No components found' : 'Type to search components'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedComponents.component1 && selectedComponents.component2 && (
        <div className="selection-summary">
          <div className="summary-header">
            <h4>Selected Components</h4>
          </div>
          <div className="summary-content">
            <div className="summary-item">
              <span className="label">Component 1:</span>
              <span className="value">
                {selectedComponents.component1.name} ({selectedComponents.component1.category})
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Component 2:</span>
              <span className="value">
                {selectedComponents.component2.name} ({selectedComponents.component2.category})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentSelector;

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const { isAuthenticated, activeOrg } = useAuth();
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBrands() {
      if (!isAuthenticated || !activeOrg) {
        setBrands([]);
        setSelectedBrand(null);
        return;
      }

      setLoading(true);
      try {
        const { data } = await apiClient.get('/brands');
        const brandList = data.data || [];
        setBrands(brandList);

        const savedBrandId = localStorage.getItem('postpilot_active_brand_id');
        const active = brandList.find((b) => b.id === savedBrandId) || brandList[0] || null;

        setSelectedBrand(active);
        if (active) {
          localStorage.setItem('postpilot_active_brand_id', active.id);
        }
      } catch (err) {
        console.warn('Failed to load brands from API:', err.message);
        setBrands([]);
        setSelectedBrand(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBrands();
  }, [isAuthenticated, activeOrg]);

  const selectBrand = (brand) => {
    setSelectedBrand(brand);
    if (brand) {
      localStorage.setItem('postpilot_active_brand_id', brand.id);
    } else {
      localStorage.removeItem('postpilot_active_brand_id');
    }
  };

  const reloadBrands = async () => {
    try {
      const { data } = await apiClient.get('/brands');
      const list = data.data || [];
      setBrands(list);
      return list;
    } catch {
      return [];
    }
  };

  const createBrand = async (brandData) => {
    const { data } = await apiClient.post('/brands', brandData);
    const newBrand = data.data;
    const updated = await reloadBrands();
    const created = updated.find((b) => b.id === newBrand?.id) || newBrand;
    if (created) selectBrand(created);
    return created;
  };

  const updateBrand = async (brandId, brandData) => {
    const { data } = await apiClient.patch(`/brands/${brandId}`, brandData);
    const updatedBrand = data.data;
    await reloadBrands();
    if (selectedBrand?.id === brandId) {
      setSelectedBrand(updatedBrand);
    }
    return updatedBrand;
  };

  const deleteBrand = async (brandId) => {
    await apiClient.delete(`/brands/${brandId}`);
    const remaining = await reloadBrands();
    if (selectedBrand?.id === brandId) {
      selectBrand(remaining[0] || null);
    }
    return true;
  };

  return (
    <BrandContext.Provider
      value={{
        brands,
        selectedBrand,
        currentBrand: selectedBrand,
        selectBrand,
        createBrand,
        updateBrand,
        deleteBrand,
        loading,
        reloadBrands,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}

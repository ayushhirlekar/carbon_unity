import api from './api';

const marketplaceService = {
  // Public - no auth needed
  getListings: async () => {
    const res = await api.get('/api/marketplace/listings');
    return res.data;
  },

  // Public - no auth needed
  getListingDetail: async (listingId) => {
    const res = await api.get(`/api/marketplace/listings/${listingId}`);
    return res.data;
  },

  // Auth required - buyer only
  purchaseCredits: async ({ listingId, blockchainTxHash, creditsPurchased }) => {
    const res = await api.post('/api/marketplace/purchase', {
      listingId, blockchainTxHash, creditsPurchased
    });
    return res.data;
  },

  // Auth required - buyer only
  getPurchaseHistory: async () => {
    const res = await api.get('/api/marketplace/purchases');
    return res.data;
  },

  // Auth required - buyer only
  getBuyerDashboard: async () => {
    const res = await api.get('/api/marketplace/buyer/dashboard');
    return res.data;
  }
};

export default marketplaceService;

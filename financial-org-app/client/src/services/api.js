// api.js - Unified API for both development and Electron modes

// Check if we're running in Electron
const isElectron = typeof window !== 'undefined' && (window.isElectron || window.api !== undefined);
console.log('Running in Electron mode:', isElectron);

// Helper to simulate API delays in development
const simulateDelay = (data, ms = 500) => {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
};

// Mock data for development mode
const mockData = {
  members: [
    { id: 1, name: 'Rajiv Perera', address: '123 Main St, Colombo', phone: '077-1234567', email: 'rajiv@example.com', joinDate: '2022-01-15', shares: 5, status: 'active' },
    { id: 2, name: 'Saman Fernando', address: '456 Park Ave, Kandy', phone: '071-9876543', email: 'saman@example.com', joinDate: '2022-02-20', shares: 3, status: 'active' },
    { id: 3, name: 'Priya Jayawardena', address: '789 Lake Rd, Galle', phone: '076-5552233', email: 'priya@example.com', joinDate: '2022-03-10', shares: 7, status: 'active' },
    { id: 4, name: 'Kumara Silva', address: '321 Hill St, Nuwara Eliya', phone: '070-1112233', email: 'kumara@example.com', joinDate: '2022-03-15', shares: 2, status: 'inactive' },
    { id: 5, name: 'Nilmini Dissanayake', address: '654 Ocean View, Negombo', phone: '075-3334455', email: 'nilmini@example.com', joinDate: '2022-04-05', shares: 4, status: 'active' }
  ],
  loans: [
    { 
      id: 1, 
      memberId: 1, 
      memberName: 'Rajiv Perera', 
      amount: 100000, 
      interestRate: 10, 
      startDate: '2023-01-10', 
      endDate: '2023-07-10', 
      purpose: 'Home Repair', 
      dailyInterest: false,
      status: 'active',
      payments: [
        { id: 1, date: '2023-02-10', amount: 18000, note: 'First payment' },
        { id: 2, date: '2023-03-10', amount: 18000, note: 'Second payment' },
      ],
      balance: 70000
    },
    { 
      id: 2, 
      memberId: 3, 
      memberName: 'Priya Jayawardena', 
      amount: 50000, 
      interestRate: 12, 
      startDate: '2023-02-15', 
      endDate: '2023-08-15', 
      purpose: 'Education', 
      dailyInterest: true,
      status: 'active',
      payments: [
        { id: 1, date: '2023-03-15', amount: 8000, note: 'First payment' },
      ],
      balance: 43000
    }
  ],
  dashboardData: {
    totalMembers: 32,
    cashBook: {
      totalContributions: 875000,
    },
    loans: {
      active: 12,
      amount: 1450000,
    },
    bankBalance: 980000,
    recentTransactions: [
      { month: 'Jan', income: 50000, expense: 30000 },
      { month: 'Feb', income: 60000, expense: 35000 },
      { month: 'Mar', income: 45000, expense: 25000 },
      { month: 'Apr', income: 70000, expense: 40000 },
      { month: 'May', income: 65000, expense: 38000 },
      { month: 'Jun', income: 80000, expense: 45000 }
    ],
    assetDistribution: [
      { name: 'Cash In Hand', value: 875000 },
      { name: 'Bank Deposits', value: 980000 },
      { name: 'Outstanding Loans', value: 1450000 }
    ]
  },
  // Add more mock data for other entities
};

// Unified API functions that work in both environments
const api = {
  // Members
  getMembers: async () => {
    console.log("getMembers called, isElectron:", isElectron);
    if (isElectron) {
      try {
        return await window.api.getMembers();
      } catch (error) {
        console.error("Error calling Electron API getMembers:", error);
        return simulateDelay([...mockData.members]);
      }
    } else {
      return simulateDelay([...mockData.members]);
    }
  },
  
  addMember: async (member) => {
    if (isElectron) {
      return window.api.addMember(member);
    } else {
      const newMember = { 
        ...member, 
        id: mockData.members.length > 0 ? Math.max(...mockData.members.map(m => m.id)) + 1 : 1
      };
      mockData.members.push(newMember);
      return simulateDelay(newMember);
    }
  },
  
  updateMember: async (id, member) => {
    if (isElectron) {
      return window.api.updateMember(id, member);
    } else {
      const index = mockData.members.findIndex(m => m.id === id);
      if (index !== -1) {
        mockData.members[index] = { ...mockData.members[index], ...member };
        return simulateDelay(mockData.members[index]);
      }
      throw new Error('Member not found');
    }
  },
  
  deleteMember: async (id) => {
    if (isElectron) {
      return window.api.deleteMember(id);
    } else {
      const index = mockData.members.findIndex(m => m.id === id);
      if (index !== -1) {
        mockData.members.splice(index, 1);
        return simulateDelay({ success: true });
      }
      throw new Error('Member not found');
    }
  },
  
  // Loans
  getLoans: async () => {
    if (isElectron) {
      return window.api.getLoans();
    } else {
      return simulateDelay([...mockData.loans]);
    }
  },
  
  // Dashboard
  getDashboardData: async () => {
    console.log("getDashboardData called, isElectron:", isElectron);
    if (isElectron) {
      try {
        const data = await window.api.getDashboardData();
        console.log("Dashboard data from Electron:", data);
        return data;
      } catch (error) {
        console.error("Error calling Electron API getDashboardData:", error);
        return simulateDelay({...mockData.dashboardData});
      }
    } else {
      return simulateDelay({...mockData.dashboardData});
    }
  },
  
  // Add more API functions for each entity
  
  // Helper function to format currency in LKR
  formatCurrency: (amount) => {
    return `Rs. ${Number(amount).toLocaleString('en-LK')}`;
  }
};

export default api; 
/**
 * Interest Calculation Test Utility
 * 
 * This file provides a way to test the interest calculation logic with various loan scenarios.
 * Run this file with Node.js to see the results: node testInterestCalculation.js
 */

// Import the same function used in the application
const calculateAccruedInterest = (loan) => {
  if (!loan || !loan.startDate) return 0;
  
  // Get the last payment date or loan start date
  const lastPaymentDate = loan.payments && loan.payments.length > 0 
    ? new Date(Math.max(...loan.payments.map(p => new Date(p.date).getTime())))
    : new Date(loan.startDate);
  
  const today = new Date(loan.currentDate || Date.now()); // Allow overriding today for testing
  const daysDiff = Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24));
  
  // Handle daily vs monthly interest
  let interestAmount = 0;
  const interestRate = loan.interestRate / 100;
  
  if (loan.dailyInterest) {
    // Daily interest calculation
    const dailyRate = interestRate / 365;
    interestAmount = loan.balance * dailyRate * daysDiff;
  } else {
    // Monthly interest calculation (30 days per month)
    const monthlyRate = interestRate / 12;
    const monthsElapsed = daysDiff / 30;
    interestAmount = loan.balance * monthlyRate * monthsElapsed;
  }
  
  return interestAmount;
};

// Test scenarios
const testScenarios = [
  {
    description: "Monthly interest on new loan (1 month)",
    loan: {
      id: 1,
      memberId: 101,
      balance: 100000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: false,
      payments: [],
      currentDate: '2023-02-01' // 31 days (about 1 month)
    }
  },
  {
    description: "Daily interest on new loan (1 month)",
    loan: {
      id: 2,
      memberId: 102,
      balance: 100000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [],
      currentDate: '2023-02-01' // 31 days
    }
  },
  {
    description: "Monthly interest after payment (15 days)",
    loan: {
      id: 3,
      memberId: 103,
      balance: 80000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: false,
      payments: [
        { date: '2023-01-15', amount: 20000 }
      ],
      currentDate: '2023-01-30' // 15 days after payment
    }
  },
  {
    description: "Daily interest after payment (15 days)",
    loan: {
      id: 4,
      memberId: 104,
      balance: 80000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [
        { date: '2023-01-15', amount: 20000 }
      ],
      currentDate: '2023-01-30' // 15 days after payment
    }
  },
  {
    description: "Monthly interest for 90 days (3 months)",
    loan: {
      id: 5,
      memberId: 105,
      balance: 100000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: false,
      payments: [],
      currentDate: '2023-04-01' // 90 days (3 months)
    }
  },
  {
    description: "Daily interest for 90 days",
    loan: {
      id: 6,
      memberId: 106,
      balance: 100000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [],
      currentDate: '2023-04-01' // 90 days
    }
  },
  {
    description: "Monthly interest with high rate (12%) for 30 days",
    loan: {
      id: 7,
      memberId: 107,
      balance: 100000,
      interestRate: 12, // 12%
      startDate: '2023-01-01',
      dailyInterest: false,
      payments: [],
      currentDate: '2023-01-31' // 30 days (1 month)
    }
  },
  {
    description: "Daily interest with high rate (12%) for 30 days",
    loan: {
      id: 8,
      memberId: 108,
      balance: 100000,
      interestRate: 12, // 12%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [],
      currentDate: '2023-01-31' // 30 days
    }
  },
  {
    description: "Multiple payments - using most recent payment date",
    loan: {
      id: 9,
      memberId: 109,
      balance: 50000,
      interestRate: 8, // 8%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [
        { date: '2023-01-10', amount: 25000 },
        { date: '2023-01-20', amount: 25000 }
      ],
      currentDate: '2023-02-01' // 12 days after last payment
    }
  }
];

// Run all test scenarios
console.log('Interest Calculation Test Results:');
console.log('----------------------------------');

testScenarios.forEach((scenario, index) => {
  const { description, loan } = scenario;
  const interest = calculateAccruedInterest(loan);
  
  console.log(`\nScenario ${index + 1}: ${description}`);
  console.log(`Loan Details: Rs. ${loan.balance} at ${loan.interestRate}% (${loan.dailyInterest ? 'Daily' : 'Monthly'})`);
  console.log(`Period: ${new Date(loan.startDate).toLocaleDateString()} to ${new Date(loan.currentDate).toLocaleDateString()}`);
  
  if (loan.payments.length > 0) {
    const lastPaymentDate = new Date(Math.max(...loan.payments.map(p => new Date(p.date).getTime())));
    console.log(`Last Payment: ${lastPaymentDate.toLocaleDateString()} (Rs. ${loan.payments[loan.payments.length-1].amount})`);
  }
  
  console.log(`Calculated Interest: Rs. ${interest.toFixed(2)}`);
});

// If module.exports is available, export the function for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAccruedInterest
  };
} 
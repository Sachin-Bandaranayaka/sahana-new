// Interest Calculation Tests
// Run this test with: npm test -- --testPathPattern=interestCalculation

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

describe('Interest Calculation', () => {
  // Test case 1: Daily interest calculation
  test('should correctly calculate daily interest', () => {
    const loan = {
      id: 1,
      memberId: 101,
      balance: 10000,
      interestRate: 5, // 5%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [],
      currentDate: '2023-01-31' // 30 days after start
    };
    
    const interest = calculateAccruedInterest(loan);
    // Daily interest = 10000 * (0.05/365) * 30 = 41.10
    expect(Math.round(interest)).toBe(41);
  });
  
  // Test case 2: Monthly interest calculation
  test('should correctly calculate monthly interest', () => {
    const loan = {
      id: 2,
      memberId: 102,
      balance: 10000,
      interestRate: 12, // 12%
      startDate: '2023-01-01',
      dailyInterest: false,
      payments: [],
      currentDate: '2023-02-01' // 31 days after start (~ 1 month)
    };
    
    const interest = calculateAccruedInterest(loan);
    // Monthly interest = 10000 * (0.12/12) * (31/30) = 103.33
    expect(Math.round(interest)).toBe(103);
  });
  
  // Test case 3: Calculation after a payment
  test('should calculate interest from the last payment date', () => {
    const loan = {
      id: 3,
      memberId: 103,
      balance: 8000,
      interestRate: 6, // 6%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [
        { date: '2023-01-15', amount: 2000 }
      ],
      currentDate: '2023-01-31' // 16 days after last payment
    };
    
    const interest = calculateAccruedInterest(loan);
    // Daily interest = 8000 * (0.06/365) * 16 = 21.04
    expect(Math.round(interest)).toBe(21);
  });
  
  // Test case 4: Zero interest when today is same as start/payment date
  test('should return zero interest when calculation date is same as start date', () => {
    const loan = {
      id: 4,
      memberId: 104,
      balance: 5000,
      interestRate: 10, // 10%
      startDate: '2023-01-01',
      dailyInterest: false,
      payments: [],
      currentDate: '2023-01-01' // Same day as start
    };
    
    const interest = calculateAccruedInterest(loan);
    expect(interest).toBe(0);
  });
  
  // Test case 5: Multiple payments, should use latest
  test('should use the most recent payment date', () => {
    const loan = {
      id: 5,
      memberId: 105,
      balance: 7500,
      interestRate: 8, // 8%
      startDate: '2023-01-01',
      dailyInterest: true,
      payments: [
        { date: '2023-01-10', amount: 1000 },
        { date: '2023-01-20', amount: 1500 } // This should be used
      ],
      currentDate: '2023-02-01' // 12 days after last payment
    };
    
    const interest = calculateAccruedInterest(loan);
    // Daily interest = 7500 * (0.08/365) * 12 = 19.73
    expect(Math.round(interest)).toBe(20);
  });
}); 
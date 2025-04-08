# Financial Organization App - Core Financial Logic

## Overview

This document explains the core financial calculations and business logic of the Financial Organization application, including how dividends, profits, shares, and loans interact within the system.

```mermaid
graph TD
    A[Organization] --> B[Members]
    A --> C[Shares]
    A --> D[Loans]
    A --> E[Profits]
    E --> F[Dividends]
    C --> F
    B --> C
    B --> D
    D --> E
```

## Core Financial Components

### 1. Shares

Shares represent ownership in the organization. Each member can own a certain number of shares.

#### Share Calculation

- **Total Shares** = Sum of all shares owned by members
- **Share Value** = Total Organization Net Worth / Total Shares

```mermaid
graph LR
    A[Members] -->|own| B[Shares]
    B -->|determine| C[Ownership %]
    B -->|affect| D[Dividend Distribution]
```

### 2. Profits

Profits are calculated on a quarterly basis from the organization's income and expenses.

#### Profit Calculation

- **Quarterly Profit** = Total Income - Total Expenses
- **Annual Profit** = Sum of Quarterly Profits

```mermaid
graph LR
    A[Income] --> C[Profit]
    B[Expenses] -->|subtract from| C
    C -->|distributed as| D[Dividends]
    C -->|partially added to| E[Reserves]
```

### 3. Dividends

Dividends are portions of profit distributed to members of the organization.

#### Previous Dividend Calculation Model

- **Dividend Pool** = Quarterly Profit × Dividend Rate (e.g., 8.5%)
- **Per Member Dividend** = Dividend Pool / Number of Active Members

This was a simplification of the traditional dividend model where all active members received an equal share of the profits, regardless of their share ownership or contributions.

#### New Proportional Dividend Calculation

The system now implements a fully automated proportional dividend distribution model:

- **Dividend Rate** = Automatically calculated based on organization's total assets (higher assets → higher rate)
- **Dividend Pool** = Quarterly Profit × Dividend Rate 
- **Organization Total Assets** = Cash Contributions + Bank Balances + Outstanding Loans
- **Member's Asset Proportion** = Member's Total Assets / Organization Total Assets
- **Individual Dividend** = Dividend Pool × Member's Asset Proportion

This approach better rewards members based on their financial contributions to the organization. Members with higher contributions receive proportionally higher dividends, and the overall dividend rate adjusts dynamically based on the organization's financial health.

#### Dividend Rate Calculation Logic

The dividend rate is automatically determined using the following guidelines:
- Default rate: 8.5%
- For organizations with total assets > Rs. 1,000,000: 10.0%
- For organizations with total assets > Rs. 500,000: 9.0%
- For organizations with total assets < Rs. 100,000: 7.0%

This dynamic rate adjustment ensures that the organization remains financially stable while providing appropriate returns to members.

```mermaid
flowchart TD
    A[Quarterly Profit] -->|Apply Dividend Rate| B[Dividend Pool]
    C[Member Assets] --> E[Member Asset Proportion]
    D[Organization Total Assets] --> E
    B --> F[Individual Member Dividends]
    E --> F
```

### 4. Loans

Loans are issued to members with interest, creating income for the organization.

#### Loan Calculation

- **Interest Amount** = Loan Principal × Interest Rate × Time Period
- **Monthly Payment** = (Principal + Total Interest) / Loan Term in Months
- **Total Repayment** = Principal + Total Interest

```mermaid
graph TD
    A[Loan Principal] --> B[Interest Calculation]
    C[Interest Rate] --> B
    D[Loan Term] --> B
    B --> E[Monthly Payment]
    E --> F[Total Repayment]
    F --> G[Organization Income]
    G --> H[Contributes to Profit]
```

## Financial Workflows

### Quarterly Financial Cycle (Updated with Proportional Dividends)

```mermaid
sequenceDiagram
    participant A as Organization
    participant B as Income
    participant C as Expenses
    participant D as Profits
    participant E as Dividends
    participant F as Members
    
    A->>B: Collect Income (loan interest, fees)
    A->>C: Pay Expenses
    B->>D: Calculate Quarterly Profit
    C->>D: Subtract Expenses
    D->>E: Calculate Dividend Pool (Profit × Rate)
    A->>E: Calculate Total Organization Assets
    F->>E: Calculate Member's Asset Proportion
    E->>F: Distribute Dividends Proportionally Based on Asset Contribution
```

### Loan Issuance and Repayment

```mermaid
sequenceDiagram
    participant A as Member
    participant B as Organization
    participant C as Loan Account
    participant D as Income
    
    A->>B: Request Loan
    B->>A: Approve & Disburse Loan
    A->>C: Make Monthly Payments
    C->>D: Interest Portion Added to Income
    D->>B: Contributes to Organizational Profit
```

## How These Components Affect Each Other

### 1. Members and Dividend Relationship

In the current implementation, all active members receive an equal portion of the dividend pool, which is calculated from the quarterly profit multiplied by the dividend rate.

### 2. Loans and Profit Relationship

Loan interest payments contribute to the organization's income, increasing quarterly profits. Higher profits lead to larger dividend pools.

### 3. Profit and Dividend Rate

The dividend rate (percentage of profit distributed to shareholders) affects how much profit is retained by the organization versus distributed to members.

### 4. System-Wide Financial Health

```mermaid
graph TD
    A[Loan Interest Income] -->|increases| B[Organizational Profit]
    C[Membership Fees] -->|increases| B
    D[Other Income] -->|increases| B
    E[Operational Expenses] -->|decreases| B
    B -->|determines| F[Dividend Pool]
    G[Number of Active Members] -->|divides| F
    F -->|results in| H[Dividend Per Member]
    H -->|equals| J[Member Dividend Payment]
```

## Example Calculations

### Dividend Calculation Example (Previous Equal-Share Method)

Given:
- Quarterly Profit: Rs. 100,000
- Dividend Rate: 8.5%
- Number of Active Members: 20

Calculations:
1. Dividend Pool = Rs. 100,000 × 8.5% = Rs. 8,500
2. Dividend Per Member = Rs. 8,500 / 20 members = Rs. 425 per member

### Dividend Calculation Example (New Proportional Method)

Given:
- Quarterly Profit: Rs. 100,000
- Organization Total Assets: Rs. 1,000,000 (which determines the dividend rate)
- Member A Total Assets: Rs. 200,000
- Member B Total Assets: Rs. 50,000

Calculations:
1. Automatic Dividend Rate Determination: 
   - Since total assets are Rs. 1,000,000, the system selects 10.0% rate
2. Dividend Pool = Rs. 100,000 × 10.0% = Rs. 10,000
3. Member A Asset Proportion = Rs. 200,000 / Rs. 1,000,000 = 0.2 (20%)
4. Member B Asset Proportion = Rs. 50,000 / Rs. 1,000,000 = 0.05 (5%)
5. Member A Dividend = Rs. 10,000 × 0.2 = Rs. 2,000
6. Member B Dividend = Rs. 10,000 × 0.05 = Rs. 500

This proportional approach with automatic rate calculation ensures that members with higher financial contributions receive proportionally higher dividend payments, creating a more equitable system that incentivizes contribution to the organization's capital base.

### Loan Interest Calculation Example

Given:
- Loan Principal: Rs. 50,000
- Annual Interest Rate: 12%
- Loan Term: 12 months

Calculations:
1. Total Interest = Rs. 50,000 × 12% × 1 year = Rs. 6,000
2. Monthly Payment = Rs. 56,000 / 12 = Rs. 4,667 per month
3. Contribution to Income = Rs. 6,000 (over the life of the loan)

## Conclusion

The financial logic of this application creates a self-sustaining ecosystem where loan interest creates income, which generates profits, which are partially distributed as dividends to reward active membership. 

The new proportional dividend distribution system enhances this model by directly linking member rewards to their financial contributions. This creates stronger incentives for members to:

1. Increase their financial contributions to the organization
2. Maintain active membership status
3. Repay loans on time
4. Participate in the organization's growth

By implementing proportional dividends based on member assets, the system provides a more equitable reward mechanism that better aligns with cooperative financial principles and encourages long-term investment in the organization's success. 
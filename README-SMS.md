# SMS Notification System

The Financial Organization Management System includes SMS notification capabilities to keep members informed about important events related to their accounts. This feature is integrated using the notify.lk API.

## Key Notification Events

The system automatically sends SMS notifications for the following events:

1. **Member Registration**
   - When a new member is registered in the system
   - Includes welcome message and member ID information
   - Example: "Welcome to our financial organization! Your member ID is: M12345."

2. **Loan Issuance**
   - When a loan is approved and issued to a member
   - Includes loan amount and reference number
   - Example: "Dear member, a loan of Rs. 25,000 has been issued to you. Reference ID: L789."

3. **Loan Payment**
   - When a member makes a payment towards their loan
   - Includes payment amount, loan ID, and remaining balance
   - Example: "Thank you for your payment of Rs. 5,000 towards loan ID L789. Remaining balance: Rs. 20,000."

## Setup and Configuration

To use the SMS notification system:

1. **Get Notify.lk API Credentials**
   - Register for an account at [notify.lk](https://www.notify.lk/)
   - Obtain your User ID and API Key from your account dashboard
   - Register a sender ID (optional)

2. **Configure SMS Settings in the Application**
   - Navigate to Settings > SMS Settings
   - Enable SMS notifications
   - Enter your User ID and API Key
   - Configure your Sender ID (default: FINANCIALORG)
   - Save the settings

3. **Test SMS Functionality**
   - Use the test tool provided in the SMS Settings page
   - Enter a valid phone number
   - Click "Send Test SMS"
   - Verify that the test message is received on the phone

## Important Notes

- Phone numbers should be in standard format (e.g., 077XXXXXXX)
- The system automatically formats phone numbers to meet notify.lk API requirements
- Sri Lanka country code (94) is automatically added if missing
- SMS logs are stored in the database for auditing and troubleshooting

## Troubleshooting

If SMS notifications are not being sent:

1. Check that SMS notifications are enabled in settings
2. Verify that the API Key and User ID are correct
3. Ensure the member has a valid phone number in their profile
4. Check the SMS logs table for error messages
5. Verify your notify.lk account has sufficient credit for sending messages

## Development Notes

The SMS functionality is implemented across several components:

- `smsService.js`: Client-side service for formatting messages and calling API
- `main.js`: Server-side implementation of the notify.lk API integration
- `preload.js`: IPC communication between client and main process
- `SMSSettings.js`: UI component for configuring SMS settings
- `Loans.js` and `Members.js`: Integration with business processes

The system uses message templates to ensure consistent messaging across the application. 
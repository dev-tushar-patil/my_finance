/**
 * Default category hierarchy used to seed a new user's data.
 * This file plays the role of the Flyway seed migration (V2__seed_default_categories.sql)
 * during Phases 1–2. React components never import this — they fetch categories via the API.
 *
 * Shape: [type, name, icon, description, { subtypeName: [items...] }]
 */
const OTHER = 'Other';

export const DEFAULT_CATEGORIES = [
  ['EXPENSE', 'Food', 'utensils', 'Meals, snacks and beverages', {
    Breakfast: ['Poha', 'Upma', 'Idli', 'Idli Sambar', 'Vada Sambar', 'Idli Vada Sambar', 'Dosa', 'Paratha', 'Tea', 'Coffee', 'Sandwich', OTHER],
    Lunch: ['Rice Plate', 'Full Thali', 'Chapati Bhaji', 'Dal Rice', 'Biryani', 'Vada Pav', 'Samosa', 'Restaurant Lunch', 'Office Lunch', OTHER],
    Dinner: ['Full Thali', 'Chapati Bhaji', 'Rice Plate', 'Mess Tiffin', 'Home Delivery', 'Restaurant Dinner', OTHER],
    Snacks: ['Vada Pav', 'Samosa', 'Misal Pav', 'Pav Bhaji', 'Sandwich', 'Burger', 'Pizza', 'Maggi', 'Biscuits', OTHER],
    Beverages: ['Tea', 'Coffee', 'Cold Coffee', 'Juice', 'Soft Drinks', OTHER],
  }],
  ['EXPENSE', 'Accommodation', 'home', 'Rent, hotels and stays', {
    'House Rent': ['Monthly Rent', 'Rent Deposit', OTHER],
    Hotel: ['Hotel Booking', 'Room Charges', OTHER],
    Hostel: ['Hostel Fees', 'Room Charges', OTHER],
    PG: ['PG Rent', 'PG Deposit', OTHER],
    Maintenance: ['Society Maintenance', 'Electricity Maintenance', 'Repairs', OTHER],
    'Guest House': ['Room Charges', OTHER],
    Other: [OTHER],
  }],
  ['EXPENSE', 'Doctor & Medical', 'stethoscope', 'Doctor fees, medicines, tests', {
    'Doctor Consultation': ['Doctor Fees', OTHER],
    'Medical Bills': ['Medicines', 'Hospital Charges', 'Medical Report', OTHER],
    'Medical Tests': ['Blood Test', 'Sonography', 'X-Ray', 'MRI', 'CT Scan', 'Medical Report', OTHER],
    Hospital: ['Hospital Charges', 'Doctor Fees', 'Medicines', OTHER],
    Pharmacy: ['Medicines', OTHER],
    Dental: ['Doctor Fees', 'X-Ray', 'Medicines', OTHER],
    'Eye Care': ['Doctor Fees', 'Medicines', OTHER],
    'Emergency Medical': ['Hospital Charges', 'Medicines', 'Doctor Fees', OTHER],
  }],
  ['EXPENSE', 'Grocery', 'cart', 'Monthly grocery and household items', {
    'Grocery Shopping': ['Rice', 'Wheat', 'Oil', 'Sugar', 'Salt', OTHER],
    'Household Items': ['Soap', 'Detergent', 'Vim Bar', OTHER],
    'Dairy Products': ['Milk', 'Curd', OTHER],
    'Kitchen Essentials': ['Oil', 'Sugar', 'Salt', OTHER],
    'Cleaning Products': ['Detergent', 'Vim Bar', 'Soap', OTHER],
  }],
  ['EXPENSE', 'Vegetables & Fruits', 'apple', 'Fresh vegetables and fruits', {
    Vegetables: ['Onion', 'Potato', 'Tomato', 'Brinjal', 'Cabbage', 'Cauliflower', 'Green Chilli', OTHER],
    Fruits: ['Apple', 'Banana', 'Mango', 'Orange', 'Papaya', 'Grapes', OTHER],
  }],
  ['EXPENSE', 'Vehicle', 'car', 'Fuel, servicing, licence and transport', {
    Bike: ['Petrol', 'PUC', 'PUC Renewal', 'License Renewal', 'Insurance', 'Servicing', 'Maintenance / Repair', 'Spare Parts', 'Washing', 'Accessories', 'Parking', OTHER],
    Car: ['Petrol', 'Diesel', 'CNG', 'Insurance', 'PUC', 'Servicing', 'Maintenance / Repair', 'Spare Parts', 'Washing', 'Parking', OTHER],
    'Public Transport': ['Bus', 'Train', 'Auto', 'Taxi', 'Metro', OTHER],
    'Other Vehicles': ['Vehicle Purchase', 'Vehicle Maintenance', OTHER],
  }],
  ['EXPENSE', 'Grooming', 'scissors', 'Salon and personal care', {
    Salon: ['Haircut', 'Beard Trimming', OTHER],
    'Hair Care': ['Shampoo', 'Conditioner', OTHER],
    'Skin Care': ['Face Wash', 'Body Lotion', 'Sunscreen', OTHER],
    'Personal Hygiene': ['Soap', 'Shaving Products', OTHER],
    'Beauty Products': ['Face Wash', 'Body Lotion', 'Sunscreen', OTHER],
  }],
  ['EXPENSE', 'Lifestyle', 'bag', 'Clothing, shopping, entertainment, travel', {
    Clothing: ['Shirts', 'T-Shirts', 'Jeans', OTHER],
    Footwear: ['Shoes', OTHER],
    Accessories: ['Watches', 'Mobile Accessories', OTHER],
    Shopping: ['Shirts', 'T-Shirts', 'Jeans', 'Shoes', 'Watches', OTHER],
    Entertainment: ['Movie Tickets', OTHER],
    Travel: ['Bus', 'Train', 'Flight', 'Hotel', OTHER],
    Hobbies: ['Sports Equipment', OTHER],
    Fitness: ['Gym Membership', 'Sports Equipment', OTHER],
    Gifts: ['Gifts', OTHER],
  }],
  ['EXPENSE', 'Bills & Utilities', 'receipt', 'Electricity, mobile, internet, gas', {
    Electricity: ['Electricity Bill', OTHER],
    'Mobile Recharge': ['Mobile Recharge', OTHER],
    Internet: ['Broadband', OTHER],
    Gas: ['LPG Cylinder', OTHER],
    Water: ['Water Bill', OTHER],
    Subscription: ['OTT Subscription', OTHER],
  }],
  ['EXPENSE', 'Education', 'education', 'Courses, books, exams', {
    Courses: ['Online Course', 'Course Fees', OTHER],
    Books: ['Books', OTHER],
    Training: ['Training Fees', OTHER],
    Examination: ['Exam Fees', OTHER],
    Other: [OTHER],
  }],
  ['EXPENSE', 'Other Expenses', 'more', 'Personal, emergency and miscellaneous', {
    Personal: [OTHER],
    Emergency: [OTHER],
    Miscellaneous: [OTHER],
    Other: [OTHER],
  }],

  // Income types (main categories with kind INCOME)
  ['INCOME', 'Salary', 'briefcase', 'Monthly salary', { 'Monthly Salary': [], Bonus: [] }],
  ['INCOME', 'Freelancing', 'laptop', 'Freelance projects', { 'Website Development': [], 'Mobile App': [], Consulting: [] }],
  ['INCOME', 'Business Income', 'building', 'Business revenue', {}],
  ['INCOME', 'Customer Payments', 'users', 'Payments from customers', {}],
  ['INCOME', 'Other Income', 'wallet', 'Interest, refunds, gifts', { Interest: [], Refund: [], Gift: [] }],

  // Investment types (main categories with kind INVESTMENT)
  ['INVESTMENT', 'SIP', 'trending', 'Systematic investment plans', {}],
  ['INVESTMENT', 'Mutual Funds', 'piggy', 'Lump-sum mutual fund purchases', {}],
  ['INVESTMENT', 'Gold', 'coins', 'Physical / digital gold', {}],
  ['INVESTMENT', 'Silver', 'coins', 'Physical / digital silver', {}],
  ['INVESTMENT', 'Platinum', 'gem', 'Platinum', {}],
  ['INVESTMENT', 'Other Investments', 'rupee', 'FD, RD, stocks, others', {}],
];

export const DEFAULT_ACCOUNTS = [
  { name: 'Cash Wallet', bankName: null, type: 'CASH', maskedNumber: null, openingBalance: 5000, creditLimit: null },
  { name: 'HDFC Bank', bankName: 'HDFC Bank', type: 'SAVINGS', maskedNumber: '•••• 1234', openingBalance: 60000, creditLimit: null },
  { name: 'Central Bank of India', bankName: 'Central Bank of India', type: 'SAVINGS', maskedNumber: '•••• 5678', openingBalance: 25000, creditLimit: null },
  { name: 'HDFC Credit Card', bankName: 'HDFC Bank', type: 'CREDIT_CARD', maskedNumber: '•••• 4321', openingBalance: 0, creditLimit: 150000 },
];

export const DEFAULT_PAYMENT_APPS = [
  { name: 'Google Pay', provider: 'GPAY', upiId: 'tushar@okhdfcbank', linkedAccount: 'HDFC Bank' },
  { name: 'PhonePe', provider: 'PHONEPE', upiId: 'tushar@ybl', linkedAccount: 'Central Bank of India' },
];

export const DEFAULT_CUSTOMERS = ['Gaurav', 'Jayashree Construction', 'Rahul Patil'];
export const DEFAULT_PERSONS = ['Amit', 'Sneha', 'Rohan'];

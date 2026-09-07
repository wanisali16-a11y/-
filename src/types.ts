export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  barcode?: string;
  category?: string;
  stock?: number;
  reorderPoint?: number;
  expiryDate?: string;
  isFavorite?: boolean;
  boxFactor?: number; // عدد القطع في الصندوق (box factor)
  boxPrice?: number; // سعر بيع الصندوق المخصص
  boxBarcode?: string; // باركود الصندوق
  packFactor?: number; // عدد القطع في الستيكة (pack factor)
  packPrice?: number; // سعر بيع الستيكة المخصص
  packBarcode?: string; // باركود الستيكة
}

export interface StockTransaction {
  transaction_type: 'STOCK_IN' | 'STOCK_OUT';
  product_id: string;
  product_name: string;
  unit_type: 'صندوق' | 'ستيكة' | 'قطعة';
  qty_entered: number;
  pieces_per_unit: number;
  total_pieces_added_or_deducted: number;
  previous_stock_pieces: number;
  new_stock_pieces: number;
  unit_cost_lyd?: number;
  total_amount_lyd?: number;
  currency: 'LYD';
  status: 'SUCCESS' | 'FAILED';
  message: string;
}

export const DEFAULT_CATEGORIES = [
  'ألبان وأجبان',
  'منظفات ومستلزمات العناية',
  'مشروبات وعصائر',
  'معلبات ومواد غذائية',
  'حلويات وبسكويت',
  'طازج ومخبوزات',
  'عام'
];

export interface CartItem extends Product {
  quantity: number;
  cartItemId?: string;
  selectedUnit?: 'piece' | 'pack' | 'box';
  unitMultiplier?: number;
  unitName?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  passwordPin: string;
  role: 'super_admin' | 'admin' | 'cashier';
  canAccessReports: boolean;
  canAccessPurchases?: boolean;
  canDeleteData: boolean;
  canAccessSettings: boolean;
  isSuperAdmin?: boolean;
}

export interface StoreInfo {
  name: string;
  subtitle: string;
  phone: string;
  taxNumber: string;
  address: string;
  receiptFooter: string;
}

export const DEFAULT_STORE_INFO: StoreInfo = {
  name: 'أسواق المزداوي',
  subtitle: 'للمواد الغذائية والمنزلية',
  phone: '091-234-5678',
  taxNumber: '123456789',
  address: 'طرابلس - المركز',
  receiptFooter: 'شكراً لزيارتكم! البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة خلال 24 ساعة',
};

export interface Transaction {
  id: string;
  invoiceNumber?: number; // الرقم التسلسلي للفاتورة (1, 2, 3, 4...)
  date: string;
  items: CartItem[];
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'split';
  type: 'sale';
  cashierId?: string;
  cashierName?: string;
  status?: 'completed' | 'cancelled';
  cashAmount?: number;
  cardAmount?: number;
  paidCash?: number;
  changeAmount?: number;
}

export interface Purchase {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'purchase';
}

export interface HeldCart {
  id: string;
  timestamp: string;
  items: CartItem[];
  name?: string;
}

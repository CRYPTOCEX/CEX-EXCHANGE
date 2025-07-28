interface Order {
  id: string;
  userId: string;
  status: string;
  shippingId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  productId: string | null;
  products: Product[];
  user: User;
  shippingAddress: ShippingAddress | null;
  shipping: Shipment | null;
}

interface Product {
  name: string;
  price: number;
  status: boolean;
  type: string;
  image: string;
  currency: string;
  walletType: string;
  category: Category;
  ecommerceOrderItem: EcommerceOrderItem;
}

interface EcommerceOrderItem {
  id: string;
  quantity: number;
  key: string | null;
  filePath: string | null;
}

interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface Shipment {
  id: string;
  loadId: string;
  loadStatus: string;
  shipper: string;
  transporter: string;
  goodsType: string;
  weight: number;
  volume: number;
  description: string;
  vehicle: string;
  cost: number;
  tax: number;
  deliveryDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

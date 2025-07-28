


interface ecommerceShippingAddressAttributes {
  id: string;
  userId: string;
  orderId: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type ecommerceShippingAddressPk = "id";
type ecommerceShippingAddressId =
  ecommerceShippingAddressAttributes[ecommerceShippingAddressPk];
type ecommerceShippingAddressOptionalAttributes =
  | "id"
  | "createdAt"
  | "updatedAt";
type ecommerceShippingAddressCreationAttributes = Optional<
  ecommerceShippingAddressAttributes,
  ecommerceShippingAddressOptionalAttributes
>;

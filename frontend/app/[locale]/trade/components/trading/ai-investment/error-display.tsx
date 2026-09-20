import { OrderErrorBox } from "../shared/order-form-ui";

interface ErrorDisplayProps {
  error: string;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  return <OrderErrorBox message={error} />;
}

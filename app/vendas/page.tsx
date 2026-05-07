import { getSales } from "../actions/saleActions";
import SalesList from "./SalesList";

export default async function VendasPage() {
  const sales = await getSales();

  return <SalesList initialSales={sales} />;
}

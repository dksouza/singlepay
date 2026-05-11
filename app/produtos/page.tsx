import { getProducts } from "../actions/productActions";
import ProductsList from "./ProductsList";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function ProdutosPage() {
  const products = await getProducts();

  return <ProductsList initialProducts={products} />;
}

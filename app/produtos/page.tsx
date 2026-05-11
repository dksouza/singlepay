import { getProducts } from "../actions/productActions";
import ProductsList from "./ProductsList";


export default async function ProdutosPage() {
  const products = await getProducts();

  return <ProductsList initialProducts={products} />;
}

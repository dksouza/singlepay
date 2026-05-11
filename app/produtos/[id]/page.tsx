import { getProductById } from "@/app/actions/productActions";
import { notFound } from "next/navigation";
import ProductEditor from "./ProductEditor";
import { Header } from "@/app/components/Header";

export const runtime = 'experimental-edge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header />
      <ProductEditor product={product} />
    </>
  );
}

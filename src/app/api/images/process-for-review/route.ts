import { NextRequest, NextResponse } from "next/server";
import { ImageService } from "@/app/lib/image-service";

// Helper function to fetch and format categories and collections
async function fetchCategoriesAndCollections(): Promise<
  Record<string, { collections: string[] }>
> {
  const { prisma } = await import("@/app/lib/prisma");

  const categories = await prisma.category.findMany({
    include: {
      Collection: true,
    },
  });

  const categoriesMap: Record<string, { collections: string[] }> = {};

  categories.forEach((category) => {
    categoriesMap[category.name] = {
      collections: category.Collection.map((col) => col.name),
    };
  });

  return categoriesMap;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get upload mode and product type
    const productType = formData.get("productType") as string | null;
    const categoryId = formData.get("categoryId") as string | null;
    const collectionId = formData.get("collectionId") as string | null;
    const useAiInference = formData.get("useAiInference") === "true";

    if (!productType) {
      return NextResponse.json(
        { error: "Missing productType" },
        { status: 400 },
      );
    }

    // Get the uploaded files
    const imageFiles = formData.getAll("files") as File[];

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json(
        { error: "No image files found" },
        { status: 400 },
      );
    }

    // Filter valid image files
    const validImageFiles = imageFiles.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (validImageFiles.length === 0) {
      return NextResponse.json(
        { error: "No valid image files provided" },
        { status: 400 },
      );
    }

    // Fetch categories data if needed
    let categoriesData = null;
    if (useAiInference || !categoryId) {
      categoriesData = await fetchCategoriesAndCollections();
    }

    // Process all files for review
    const allProductsData = [];
    
    for (const file of validImageFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Process each image for review
      const productData = await ImageService.processImageForReview(
        buffer,
        file.name,
        productType,
        categoryId || undefined,
        collectionId || undefined,
        categoriesData || undefined,
      );
      
      allProductsData.push(productData);
    }

    return NextResponse.json({
      success: true,
      productsData: allProductsData,
      message: `${allProductsData.length} images processed for review`,
    });
  } catch (error) {
    console.error("Error processing image for review:", error);
    return NextResponse.json(
      { error: "Failed to process image for review" },
      { status: 500 },
    );
  }
}

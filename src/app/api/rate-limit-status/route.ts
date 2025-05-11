import { NextResponse } from "next/server"
import { ImageService } from "@/app/lib/image-service"

export async function GET() {
  try {
    const status = ImageService.getRateLimitStatus()

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error("Error getting rate limit status:", error)
    return NextResponse.json({ success: false, error: "Failed to get rate limit status" }, { status: 500 })
  }
}
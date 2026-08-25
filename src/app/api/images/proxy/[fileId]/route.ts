import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId: fileIdWithExt } = await params;
  // fileId might include the .png extension (e.g., 1xFEzqnldUkHcChji5w7BrqpHQcMCqP-q.png)
  const fileId = fileIdWithExt.replace(/\.(png|jpg|jpeg)$/i, "");
  
  if (!fileId) {
    return new NextResponse("Missing file ID", { status: 400 });
  }

  // Redirect to Google Drive's direct image endpoint.
  // We use 302 Found so clients don't cache this permanently, in case we change the URL structure in the future.
  return NextResponse.redirect(`https://lh3.googleusercontent.com/d/${fileId}`, 302);
}

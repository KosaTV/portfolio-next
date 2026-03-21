import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";

export function middleware(request: NextRequest) {
	const {pathname, searchParams} = request.nextUrl;

	// Skip tracking for API routes, static files, and internal Next.js requests
	if (
		pathname.startsWith("/api") ||
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon") ||
		pathname.includes(".") // static files like .svg, .png, etc.
	) {
		return NextResponse.next();
	}

	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown";

	const userAgent = request.headers.get("user-agent") || "unknown";
	const referrer = request.headers.get("referer") || "";

	// Skip bots
	if (/bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu/i.test(userAgent)) {
		return NextResponse.next();
	}

	const trackData = {
		ip,
		userAgent,
		referrer,
		page: pathname,
		utmSource: searchParams.get("utm_source") || "",
		utmMedium: searchParams.get("utm_medium") || "",
		utmCampaign: searchParams.get("utm_campaign") || "",
		utmTerm: searchParams.get("utm_term") || "",
		utmContent: searchParams.get("utm_content") || "",
	};

	// Fire-and-forget: send tracking data to our API route
	const trackUrl = new URL("/api/track", request.url);
	fetch(trackUrl.toString(), {
		method: "POST",
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(trackData),
	}).catch(() => {
		// Silently fail — tracking should never block the user
	});

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

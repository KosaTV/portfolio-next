import {NextResponse} from "next/server";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 30;

const VISITS_FILE = path.join(process.cwd(), "data", "visits.json");

interface Visit {
	id: string;
	timestamp: string;
	ip: string;
	page: string;
	referrer: string;
	utmSource: string;
	utmMedium: string;
	utmCampaign: string;
	utmTerm: string;
	utmContent: string;
	browser: string;
	os: string;
	device: string;
	country: string;
	region: string;
	city: string;
	isp: string;
	org: string;
	lat: number | null;
	lon: number | null;
	timezone: string;
}

async function readVisits(): Promise<Visit[]> {
	try {
		const data = await fs.readFile(VISITS_FILE, "utf-8");
		return JSON.parse(data);
	} catch {
		return [];
	}
}

async function saveVisit(visit: Visit) {
	const visits = await readVisits();
	visits.unshift(visit);
	await fs.writeFile(VISITS_FILE, JSON.stringify(visits, null, 2));
}

interface GeoData {
	ip: string;
	country: string;
	region: string;
	city: string;
	zip: string;
	lat: number;
	lon: number;
	timezone: string;
	isp: string;
	org: string;
	as: string;
}

async function getGeoData(ip: string): Promise<GeoData | null> {
	try {
		const res = await fetch(`http://ip-api.com/json/${ip}?fields=66846719`);
		if (!res.ok) return null;
		const data = await res.json();
		if (data.status === "fail") return null;
		return data;
	} catch {
		return null;
	}
}

function buildEmailHtml(visitor: {
	ip: string;
	userAgent: string;
	referrer: string;
	page: string;
	timestamp: string;
	utmSource: string;
	utmMedium: string;
	utmCampaign: string;
	utmTerm: string;
	utmContent: string;
	geo: GeoData | null;
}) {
	const {ip, userAgent, referrer, page, timestamp, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, geo} = visitor;

	const uaInfo = parseUserAgent(userAgent);
	const source = utmSource || referrer || "Direct";

	const utmRows = [
		utmSource && `<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">UTM Source</td><td style="padding:8px 12px;color:#e2e8f0">${utmSource}</td></tr>`,
		utmMedium && `<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">UTM Medium</td><td style="padding:8px 12px;color:#e2e8f0">${utmMedium}</td></tr>`,
		utmCampaign && `<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">UTM Campaign</td><td style="padding:8px 12px;color:#e2e8f0">${utmCampaign}</td></tr>`,
		utmTerm && `<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">UTM Term</td><td style="padding:8px 12px;color:#e2e8f0">${utmTerm}</td></tr>`,
		utmContent && `<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">UTM Content</td><td style="padding:8px 12px;color:#e2e8f0">${utmContent}</td></tr>`,
	].filter(Boolean).join("");

	const geoRows = geo ? `
		<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Location</td><td style="padding:8px 12px;color:#e2e8f0">${geo.city}, ${geo.region}, ${geo.country}</td></tr>
		<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Coordinates</td><td style="padding:8px 12px;color:#e2e8f0">${geo.lat}, ${geo.lon}</td></tr>
		<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Timezone</td><td style="padding:8px 12px;color:#e2e8f0">${geo.timezone}</td></tr>
		<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">ISP</td><td style="padding:8px 12px;color:#e2e8f0">${geo.isp}</td></tr>
		<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Organization</td><td style="padding:8px 12px;color:#e2e8f0">${geo.org}</td></tr>
		<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">AS</td><td style="padding:8px 12px;color:#e2e8f0">${geo.as}</td></tr>
	` : `<tr><td style="padding:8px 12px;color:#94a3b8" colspan="2">Geo lookup unavailable</td></tr>`;

	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
	<div style="max-width:600px;margin:0 auto;padding:24px">
		<div style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155">
			<!-- Header -->
			<div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:20px 24px">
				<h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">New Visitor on Your Portfolio</h1>
				<p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px">${timestamp}</p>
			</div>

			<!-- Source Badge -->
			<div style="padding:16px 24px 0">
				<span style="display:inline-block;background:#1e3a5f;color:#60a5fa;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:500">
					Source: ${source}
				</span>
			</div>

			<!-- Visit Info -->
			<div style="padding:16px 24px">
				<h2 style="margin:0 0 8px;color:#e2e8f0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Visit</h2>
				<table style="width:100%;border-collapse:collapse;font-size:14px">
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Page</td><td style="padding:8px 12px;color:#e2e8f0">${page}</td></tr>
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Referrer</td><td style="padding:8px 12px;color:#e2e8f0">${referrer || "Direct"}</td></tr>
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">IP Address</td><td style="padding:8px 12px;color:#e2e8f0">${ip}</td></tr>
				</table>
			</div>

			${utmRows ? `
			<!-- UTM Parameters -->
			<div style="padding:0 24px 16px">
				<h2 style="margin:0 0 8px;color:#e2e8f0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Campaign</h2>
				<table style="width:100%;border-collapse:collapse;font-size:14px">
					${utmRows}
				</table>
			</div>
			` : ""}

			<!-- Device -->
			<div style="padding:0 24px 16px">
				<h2 style="margin:0 0 8px;color:#e2e8f0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Device</h2>
				<table style="width:100%;border-collapse:collapse;font-size:14px">
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Browser</td><td style="padding:8px 12px;color:#e2e8f0">${uaInfo.browser}</td></tr>
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">OS</td><td style="padding:8px 12px;color:#e2e8f0">${uaInfo.os}</td></tr>
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px">Device</td><td style="padding:8px 12px;color:#e2e8f0">${uaInfo.device}</td></tr>
					<tr><td style="padding:8px 12px;color:#94a3b8;width:140px;vertical-align:top">Raw UA</td><td style="padding:8px 12px;color:#64748b;font-size:11px;word-break:break-all">${userAgent}</td></tr>
				</table>
			</div>

			<!-- Geo -->
			<div style="padding:0 24px 16px">
				<h2 style="margin:0 0 8px;color:#e2e8f0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Location & Network</h2>
				<table style="width:100%;border-collapse:collapse;font-size:14px">
					${geoRows}
				</table>
			</div>

			${geo ? `
			<!-- Map Link -->
			<div style="padding:0 24px 20px">
				<a href="https://www.google.com/maps?q=${geo.lat},${geo.lon}" style="display:inline-block;background:#334155;color:#60a5fa;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px">
					View on Google Maps
				</a>
			</div>
			` : ""}
		</div>
	</div>
</body>
</html>`;
}

function parseUserAgent(ua: string) {
	let browser = "Unknown";
	let os = "Unknown";
	let device = "Desktop";

	if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = "Mobile";
	if (/iPad|Tablet/i.test(ua)) device = "Tablet";

	if (/Edg\//i.test(ua)) browser = "Edge " + (ua.match(/Edg\/([\d.]+)/)?.[1] || "");
	else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome " + (ua.match(/Chrome\/([\d.]+)/)?.[1] || "");
	else if (/Firefox\//i.test(ua)) browser = "Firefox " + (ua.match(/Firefox\/([\d.]+)/)?.[1] || "");
	else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari " + (ua.match(/Version\/([\d.]+)/)?.[1] || "");

	if (/Windows NT/i.test(ua)) os = "Windows";
	else if (/Mac OS X/i.test(ua)) os = "macOS";
	else if (/Linux/i.test(ua)) os = "Linux";
	else if (/Android/i.test(ua)) os = "Android";
	else if (/iPhone|iPad/i.test(ua)) os = "iOS";

	return {browser: browser.trim(), os, device};
}

export async function GET() {
	try {
		const visits = await readVisits();
		return NextResponse.json(visits);
	} catch {
		return NextResponse.json([], {status: 500});
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const {ip, userAgent, referrer, page, utmSource, utmMedium, utmCampaign, utmTerm, utmContent} = body;

		const geo = await getGeoData(ip);
		const uaInfo = parseUserAgent(userAgent);

		const timestamp = new Date().toISOString();
		const displayTimestamp = new Date().toLocaleString("en-US", {
			timeZone: "Europe/Warsaw",
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

		const visit: Visit = {
			id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
			timestamp,
			ip,
			page,
			referrer,
			utmSource,
			utmMedium,
			utmCampaign,
			utmTerm,
			utmContent,
			browser: uaInfo.browser,
			os: uaInfo.os,
			device: uaInfo.device,
			country: geo?.country || "",
			region: geo?.region || "",
			city: geo?.city || "",
			isp: geo?.isp || "",
			org: geo?.org || "",
			lat: geo?.lat ?? null,
			lon: geo?.lon ?? null,
			timezone: geo?.timezone || "",
		};

		await saveVisit(visit);

		const source = utmSource || referrer || "Direct";

		const transporter = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 465,
			secure: true,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});

		await transporter.sendMail({
			from: `"Portfolio Tracker" <${process.env.SMTP_USER}>`,
			to: "ch.jakub23@gmail.com",
			subject: `New visitor from ${source} — ${geo?.city || ip}`,
			html: buildEmailHtml({
				ip,
				userAgent,
				referrer,
				page,
				timestamp: displayTimestamp,
				utmSource,
				utmMedium,
				utmCampaign,
				utmTerm,
				utmContent,
				geo,
			}),
		});

		return NextResponse.json({success: true});
	} catch (error) {
		console.error("Track error:", error);
		return NextResponse.json({error: "Tracking failed"}, {status: 500});
	}
}

import {NextResponse} from "next/server";
import {jwtVerify} from "jose";
import {cookies} from "next/headers";

const SECRET = new TextEncoder().encode(process.env.ROOT_PASS || "");

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get("jc_root")?.value;

	if (!token) {
		return NextResponse.json({error: "Unauthorized."}, {status: 401});
	}

	try {
		await jwtVerify(token, SECRET);
		return NextResponse.json({path: `/${process.env.ADMIN_PATH}`});
	} catch {
		return NextResponse.json({error: "Unauthorized."}, {status: 401});
	}
}

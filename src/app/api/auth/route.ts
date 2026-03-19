import {NextResponse} from "next/server";
import {SignJWT} from "jose";

const SECRET = new TextEncoder().encode(process.env.ROOT_PASS || "");
const TOKEN_TTL = 60 * 60; // 1 hour

export async function POST(req: Request) {
	const {password} = await req.json();

	if (!password) {
		return NextResponse.json({error: "Password required."}, {status: 400});
	}

	if (password !== process.env.ROOT_PASS) {
		return NextResponse.json({error: "Authentication failure."}, {status: 401});
	}

	const token = await new SignJWT({role: "root"})
		.setProtectedHeader({alg: "HS256"})
		.setIssuedAt()
		.setExpirationTime(`${TOKEN_TTL}s`)
		.sign(SECRET);

	const res = NextResponse.json({success: true});
	res.cookies.set("jc_root", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
		maxAge: TOKEN_TTL,
	});

	return res;
}
